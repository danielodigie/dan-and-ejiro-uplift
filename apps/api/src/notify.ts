import 'dotenv/config';

// Outbound messaging: Termii SMS (Nigeria) + Resend email.
// Secrets live only in env (.env + Render dashboard). Nothing here ever
// returns a key; failures throw short, safe messages for the client.

export function termiiConfigured(): boolean {
  return !!(process.env.TERMII_API_KEY || '').trim();
}

export function resendConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY || '').trim();
}

// Nigerian-first normalize -> E.164. Accepts 0803..., +234803..., 234803...,
// or any +<country><number>. Returns null when unusable.
export function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const t = String(raw).replace(/[\s\-().]/g, '');
  if (/^\+234[789]\d{9}$/.test(t)) return t;
  if (/^234[789]\d{9}$/.test(t)) return '+' + t;
  if (/^0[789]\d{9}$/.test(t)) return '+234' + t.slice(1);
  if (/^\+\d{8,15}$/.test(t)) return t;
  return null;
}

async function postJson(url: string, body: Record<string, any>, headers: Record<string, string> = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(String(data.message || data.description || `send failed (${res.status})`));
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export async function sendTermiiSms(to: string, message: string): Promise<void> {
  const apiKey = (process.env.TERMII_API_KEY || '').trim();
  if (!apiKey) throw new Error('SMS not configured yet');
  const data = await postJson('https://api.ng.termii.com/api/sms/send', {
    to,
    from: (process.env.TERMII_SENDER || 'Uplift').trim() || 'Uplift',
    sms: message,
    type: 'plain',
    channel: 'generic',
    api_key: apiKey,
  });
  const status = data.message_id || data.message || data.status;
  if (!status) throw new Error('SMS rejected by provider');
}

export async function sendTermiiOtp(phoneNumber: string, code: string): Promise<void> {
  const to = normalizePhone(phoneNumber) || phoneNumber;
  await sendTermiiSms(to, `Your Uplift code is ${code}. It expires in 5 minutes.`);
}

export async function sendResendEmail(opts: { to: string; subject: string; html: string }): Promise<void> {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) throw new Error('Email not configured yet');
  await postJson(
    'https://api.resend.com/emails',
    {
      from: (process.env.RESEND_FROM || 'Uplift <onboarding@resend.dev>').trim(),
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    },
    { Authorization: `Bearer ${apiKey}` },
  );
}
