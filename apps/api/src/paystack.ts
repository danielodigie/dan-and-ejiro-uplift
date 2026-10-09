import 'dotenv/config';

// Real payments via Paystack (replaces the premium-stub for packs).
// The SECRET key lives only here, server-side — never sent to any client,
// never logged, never echoed in errors.

const PAYSTACK_BASE = 'https://api.paystack.co';

// Pack prices in NAIRA (Paystack takes kobo = NGN x 100). Server is the only
// decider of price: the client sends a pack id, never an amount.
export const PACK_PRICES_NGN: Record<string, number> = {
  'confidence-pack': 1500,
};

export function paystackConfigured(): boolean {
  return !!(process.env.PAYSTACK_SECRET_KEY || '').trim();
}

async function paystackFetch(path: string, init: RequestInit = {}) {
  const key = (process.env.PAYSTACK_SECRET_KEY || '').trim();
  if (!key) throw new Error('PAYSTACK_SECRET_KEY not configured');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`${PAYSTACK_BASE}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || data.status === false) {
      // Safe message only: Paystack's error text, never our key/config.
      throw new Error(String(data.message || `paystack ${res.status}`));
    }
    return data.data;
  } finally {
    clearTimeout(timer);
  }
}

export async function initializePackPayment(opts: {
  packId: string;
  email: string;
  userId: string;
  callbackBase?: string;
}) {
  const priceNgn = PACK_PRICES_NGN[opts.packId];
  if (!priceNgn) throw new Error('unknown pack');
  const reference = `uplift-${opts.packId}-${opts.userId.slice(0, 8)}-${Date.now()}`;
  const body: Record<string, any> = {
    email: opts.email,
    amount: priceNgn * 100, // kobo
    currency: 'NGN',
    reference,
    metadata: { user_id: opts.userId, pack_id: opts.packId, product: 'dan-and-ejiro-uplift' },
  };
  if (opts.callbackBase) body.callback_url = opts.callbackBase.replace(/\/$/, '') + '/?paystack=callback';
  const data = await paystackFetch('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return {
    authorization_url: data.authorization_url as string,
    reference: data.reference as string,
    amountNgn: priceNgn,
  };
}

export type VerifyResult =
  | { ok: true; packId: string; amountNgn: number; reference: string; paidAt: string | null }
  | { ok: false; reason: string };

export async function verifyPackPayment(reference: string, expectedUserId: string): Promise<VerifyResult> {
  let data: any;
  try {
    data = await paystackFetch(`/transaction/verify/${encodeURIComponent(reference)}`);
  } catch (e: any) {
    return { ok: false, reason: e?.message || 'verify failed' };
  }
  if (data?.status !== 'success') return { ok: false, reason: 'payment not successful yet' };
  const packId = String(data?.metadata?.pack_id || '');
  const metaUser = String(data?.metadata?.user_id || '');
  const expectedNgn = PACK_PRICES_NGN[packId];
  if (!packId || !expectedNgn) return { ok: false, reason: 'unknown pack on transaction' };
  if (metaUser && metaUser !== expectedUserId) return { ok: false, reason: 'transaction belongs to another user' };
  if (Number(data?.amount) !== expectedNgn * 100) return { ok: false, reason: 'amount mismatch' };
  return { ok: true, packId, amountNgn: expectedNgn, reference: String(data?.reference || reference), paidAt: data?.paid_at || null };
}
