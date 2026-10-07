import { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Share, StyleSheet } from 'react-native';
import { api, Uplift, Prefs, OFFLINE_UPLIFT } from '../lib/api';

// Bright sharp theme (matches design.html v2): white bg, ink borders, orange/blue/yellow solids, no gradients.
export const C = { bg: '#FFFFFF', ink: '#111111', orange: '#FF4D00', blue: '#0B5CFF', yellow: '#FFC400', teal: '#00C2A8', grey: '#F2F2F2' };

export const MOODS = ['great', 'good', 'okay', 'low', 'struggling'];
export const MOOD_EMOJI: Record<string, string> = { great: '😊', good: '🙂', okay: '😐', low: '😔', struggling: '😣' };
export const SITUATIONS = ['career', 'school', 'business', 'finances', 'relationships', 'family', 'growth', 'confidence', 'purpose', 'failure', 'life-changes'];
export const GOAL_OPTIONS = ['Get a job', 'Start a business', 'Complete school', 'Improve finances', 'Build confidence', 'Develop a habit', 'Improve relationships', 'Grow spiritually'];
export const STYLES = ['gentle', 'bold', 'motivational', 'practical', 'spiritual', 'reflective', 'friendly', 'direct'];
export const INTENTS = ['discouraged', 'confidence', 'overwhelmed', 'motivation', 'failure', 'afraid-to-start', 'lonely', 'hope', 'keep-going', 'decision', 'strength'];
export const NEEDS = ['hope', 'strength', 'motivation', 'courage', 'confidence', 'faith', 'focus', 'peace', 'love', 'fresh-start'];
export const CATEGORIES = ['hope', 'confidence', 'motivation', 'strength', 'courage', 'success', 'failure', 'relationships', 'career', 'money', 'purpose', 'self-belief', 'gratitude', 'discipline', 'leadership', 'faith', 'family', 'growth'];
export const COLLECTIONS = ['favorites', 'need', 'confidence', 'faith', 'career', 'morning', 'difficult-days'];
export const CRISIS_TEXT = "You matter and you don't have to carry this alone. Please reach out to someone you trust or your local crisis helpline right now.";

// ---------- shared ----------
export function UpliftCard({ u, onSave, onLike, onAnother, onReflect, onAction, onShare }: {
  u: Uplift; onSave?: () => void; onLike?: () => void; onAnother?: () => void;
  onReflect?: () => void; onAction?: () => void; onShare?: () => void;
}) {
  if ((u as any).crisis) {
    return (
      <View style={s.card}>
        <Text style={s.greet}>{u.greeting}</Text>
        <Text style={s.msg}>{CRISIS_TEXT}</Text>
        <Text style={s.action}>Next step: {u.action}</Text>
      </View>
    );
  }
  return (
    <View style={s.card}>
      <Text style={s.greet}>{u.greeting}</Text>
      <Text style={s.msg}>{u.body}</Text>
      {(u as any).scripture ? <Text style={s.script}>{(u as any).scripture}</Text> : null}
      <Text style={s.action}>Today's small action: {u.action}</Text>
      <View style={s.row}>
        {onSave ? <Pressable style={s.ghost} onPress={onSave}><Text>Save</Text></Pressable> : null}
        {onLike ? <Pressable style={s.ghost} onPress={onLike}><Text>Like</Text></Pressable> : null}
        {onAnother ? <Pressable style={s.primary} onPress={onAnother}><Text style={s.primaryT}>New</Text></Pressable> : null}
      </View>
      <View style={s.row}>
        {onReflect ? <Pressable style={s.ghost} onPress={onReflect}><Text>Reflect</Text></Pressable> : null}
        {onAction ? <Pressable style={s.ghost} onPress={onAction}><Text>Make Action</Text></Pressable> : null}
        {onShare ? <Pressable style={s.ghost} onPress={onShare}><Text>Share</Text></Pressable> : null}
      </View>
    </View>
  );
}

export function ChipRow({ items, value, onPick, labels }: { items: string[]; value?: string; onPick: (v: string) => void; labels?: Record<string, string> }) {
  return (
    <View style={s.chips}>
      {items.map(i => (
        <Pressable key={i} onPress={() => onPick(i)} style={[s.chip, value === i && s.chipOn]}>
          <Text style={[s.chipT, value === i && s.chipTOn]}>{labels?.[i] || i}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function MultiChipRow({ items, values, onToggle }: { items: string[]; values: string[]; onToggle: (v: string) => void }) {
  return (
    <View style={s.chips}>
      {items.map(i => {
        const on = values.includes(i);
        return (
          <Pressable key={i} onPress={() => onToggle(i)} style={[s.chip, on && s.chipOn]}>
            <Text style={[s.chipT, on && s.chipTOn]}>{i}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function StreakPill({ current }: { current: number }) {
  return (
    <View style={s.streak}>
      <Text style={s.streakT}>{current > 0 ? `${current} Day${current > 1 ? 's' : ''} of Showing Up` : 'Start today — keep going.'}</Text>
      <Text style={s.streakSub}>Start again. Keep going.</Text>
    </View>
  );
}

export function CelebrationBanner({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <Pressable style={s.celebrate} onPress={onClose}>
      <Text style={s.celebrateT}>{text}</Text>
      <Text style={s.streakSub}>Tap to dismiss</Text>
    </Pressable>
  );
}

async function shareUplift(u: Uplift) {
  const msg = `Someone needs to hear this today:\n\n"${u.body}"\n\n— Dan and Ejiro Uplift`;
  try {
    await Share.share({ message: msg });
    api.shareRecord(String(u.id), 'system').catch(() => {});
    api.event('share', { upliftId: u.id }).catch(() => {});
  } catch {}
}

// ---------- Sprint A — Auth ----------
export function AuthScreen({ onAuthed }: { onAuthed: () => void }) {
  const [email, setEmail] = useState('uplifter@test.com');
  const [password, setPassword] = useState('uplift123');
  const [err, setErr] = useState('');
  const go = async (mode: 'in' | 'up') => {
    setErr('');
    try {
      if (mode === 'in') await api.signIn(email.trim(), password);
      else await api.signUp(email.trim(), password, email.split('@')[0]);
      api.event('auth', { mode }).catch(() => {});
      onAuthed();
    } catch (e: any) { setErr(e.message || 'Auth failed — is the API on :3000?'); }
  };
  return (
    <ScrollView contentContainerStyle={s.screen}>
      <Text style={s.h1}>Dan and Ejiro Uplift</Text>
      <Text>A little encouragement can change your day.</Text>
      <Text style={s.label}>Email</Text>
      <TextInput style={s.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Text style={s.label}>Password</Text>
      <TextInput style={s.input} value={password} onChangeText={setPassword} secureTextEntry />
      {err ? <Text style={s.err}>{err}</Text> : null}
      <Pressable style={s.primary} onPress={() => go('in')}><Text style={s.primaryT}>Sign in</Text></Pressable>
      <Pressable style={s.ghost} onPress={() => go('up')}><Text>Create account</Text></Pressable>
      <Text style={s.sub}>Local-first MVP: runs on your device + LAN. No cloud needed.</Text>
    </ScrollView>
  );
}

// ---------- Sprint A — Onboarding (feel + situation + goal + style + faith + times) ----------
export function Onboarding({ done }: { done: (prefs: Prefs) => void }) {
  const [step, setStep] = useState(0);
  const [mood, setMood] = useState('okay');
  const [situation, setSituation] = useState('career');
  const [goal, setGoal] = useState(GOAL_OPTIONS[0]);
  const [styles, setStyles] = useState<string[]>(['gentle']);
  const [faithOptIn, setFaithOptIn] = useState(false);
  const [frequency, setFrequency] = useState('daily');
  const toggle = (v: string) => setStyles(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  const next = () => setStep(v => Math.min(v + 1, 6));
  const back = () => setStep(v => Math.max(v - 1, 0));
  const finish = () => done({ mood, situation, goal, styles: styles.length ? styles : ['gentle'], faithOptIn, notifyTimes: ['08:00', '13:00', '20:00'], frequency });
  return (
    <ScrollView contentContainerStyle={s.screen}>
      {step === 0 && (<><Text style={s.h1}>How are you feeling right now?</Text>
        <ChipRow items={MOODS} value={mood} onPick={setMood} labels={Object.fromEntries(MOODS.map(m => [m, `${MOOD_EMOJI[m]} ${m}`]))} /></>)}
      {step === 1 && (<><Text style={s.h1}>What are you dealing with?</Text><ChipRow items={SITUATIONS} value={situation} onPick={setSituation} /></>)}
      {step === 2 && (<><Text style={s.h1}>What do you want to achieve?</Text><ChipRow items={GOAL_OPTIONS} value={goal} onPick={setGoal} /></>)}
      {step === 3 && (<><Text style={s.h1}>How do you like to be encouraged? (pick any)</Text><MultiChipRow items={STYLES} values={styles} onToggle={toggle} /></>)}
      {step === 4 && (<><Text style={s.h1}>Faith-based encouragement?</Text><Text style={s.sub}>Optional — Scripture + short prayers. Never forced.</Text>
        <ChipRow items={['off', 'on']} value={faithOptIn ? 'on' : 'off'} onPick={v => setFaithOptIn(v === 'on')} /></>)}
      {step === 5 && (<><Text style={s.h1}>How often should we uplift you?</Text>
        <ChipRow items={['gentle', 'daily', 'often']} value={frequency} onPick={setFrequency} />
        <Text style={s.sub}>Morning 7:30 • Midday 1pm • Evening 8pm. Never annoying — change anytime in Profile.</Text></>)}
      {step === 6 && (<><Text style={s.h1}>You're set.</Text>
        <Text>{MOOD_EMOJI[mood]} {mood} • {situation} • {goal}</Text>
        <Text>{styles.join(', ')}{faithOptIn ? ' • faith' : ''} • {frequency}</Text></>)}
      <View style={s.row}>
        {step > 0 ? <Pressable style={s.ghost} onPress={back}><Text>Back</Text></Pressable> : null}
        {step < 6 ? <Pressable style={s.primary} onPress={next}><Text style={s.primaryT}>Continue</Text></Pressable>
          : <Pressable style={s.primary} onPress={finish}><Text style={s.primaryT}>Show my first Uplift</Text></Pressable>}
      </View>
      <Text style={s.sub}>Step {step + 1} of 7</Text>
    </ScrollView>
  );
}

// ---------- Sprint B — Home / Today's Uplift ----------
function slotForHour(h: number) { return h < 11 ? 'morning' : h < 17 ? 'midday' : 'evening'; }
export function Home({ prefs, onReflect, onMakeAction }: { prefs: Prefs; onReflect: (u: Uplift) => void; onMakeAction: (u: Uplift) => void }) {
  const [u, setU] = useState<Uplift | null>(null);
  const [seen, setSeen] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [celebrate, setCelebrate] = useState('');
  const [collection, setCollection] = useState('favorites');
  const slot = slotForHour(new Date().getHours());
  const style = prefs.styles[0] || 'gentle';
  const stylesCsv = (prefs.styles || [style]).join(',');
  const load = async (seenList: string[] = seen) => {
    const fresh = await api.today({ mood: prefs.mood, situation: prefs.situation, style, styles: stylesCsv, faith: String(!!prefs.faithOptIn) }, seenList);
    setU(fresh);
    setSeen(prev => [...prev.slice(-6), String(fresh.id)]);
    api.event('view_today', { upliftId: fresh.id, slot }).catch(() => {});
  };
  useEffect(() => {
    load([]);
    api.checkin(prefs.mood).then(() => api.streak().then((st: any) => setStreak(st.current_count || st.currentCount || 1)).catch(() => {})).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <ScrollView contentContainerStyle={s.screen}>
      <Text style={s.h1}>{slot === 'morning' ? 'Good morning.' : slot === 'midday' ? 'Good afternoon.' : 'Good evening.'} Today's Uplift</Text>
      <StreakPill current={streak} />
      {celebrate ? <CelebrationBanner text={celebrate} onClose={() => setCelebrate('')} /> : null}
      {u ? <UpliftCard u={u}
        onAnother={() => load()}
        onSave={() => { api.save(String(u.id), collection).then(() => { setCelebrate('Saved — your meaningful ones will live here.'); api.event('save', { upliftId: u.id }); }).catch(() => setCelebrate('Saved offline — will sync.')); }}
        onLike={() => { api.like(String(u.id)).then(() => api.event('like', { upliftId: u.id })).catch(() => {}); setCelebrate('Noted — more like this.'); }}
        onReflect={() => onReflect(u)}
        onAction={() => onMakeAction(u)}
        onShare={() => shareUplift(u)}
      /> : <Text>Loading…</Text>}
      <Text style={s.label}>Save to collection</Text>
      <ChipRow items={COLLECTIONS} value={collection} onPick={setCollection} />
      <Text style={s.sub}>Offline-tolerant: last uplift is cached. "New" never repeats within 7 days.</Text>
    </ScrollView>
  );
}

// ---------- Sprint C — I Need a Lift + categories + I-need grid ----------
export function NeedLift({ prefs, onReflect }: { prefs: Prefs; onReflect: (u: Uplift) => void }) {
  const [u, setU] = useState<Uplift | null>(null);
  const [situation, setSituation] = useState(prefs.situation);
  const [seen, setSeen] = useState<string[]>([]);
  const [cat, setCat] = useState('hope');
  const [lastIntent, setLastIntent] = useState('hope');
  const style = prefs.styles[0] || 'gentle';
  const stylesCsv = (prefs.styles || [style]).join(',');
  const ask = async (intent: string) => {
    setLastIntent(intent);
    const fresh = await api.lift({ intent, situation, style, styles: stylesCsv, faith: String(!!prefs.faithOptIn) }, seen);
    setU(fresh); setSeen(prev => [...prev.slice(-6), String(fresh.id)]);
    api.event('need_lift', { intent, situation }).catch(() => {});
  };
  const browse = async (c: string) => {
    setCat(c);
    try {
      const fresh = await api.byCategory(c, { style, faith: String(!!prefs.faithOptIn) }, seen);
      setU(fresh); setSeen(prev => [...prev.slice(-6), String(fresh.id)]);
      api.event('browse_category', { category: c }).catch(() => {});
    } catch { setU(OFFLINE_UPLIFT); }
  };
  return (
    <ScrollView contentContainerStyle={s.screen}>
      <Text style={s.h1}>I Need a Lift</Text>
      <Text style={s.label}>1 — What do you need? (11 intents)</Text>
      <ChipRow items={INTENTS} value="" onPick={ask} />
      <Text style={s.label}>I need… (signature moments)</Text>
      <ChipRow items={NEEDS} value="" onPick={need => ask(need === 'fresh-start' ? 'keep-going' : need === 'focus' || need === 'peace' || need === 'love' ? 'hope' : need)} />
      <Text style={s.label}>2 — Situation (optional)</Text>
      <ChipRow items={SITUATIONS} value={situation} onPick={setSituation} />
      {u ? <UpliftCard u={u} onAnother={() => ask(lastIntent)} onSave={() => { api.save(String(u.id)).catch(() => {}); }} onLike={() => { api.like(String(u.id)).catch(() => {}); }} onReflect={() => onReflect(u)} onShare={() => shareUplift(u)} /> : <Text>Tap what you need above — 2-tap rescue.</Text>}
      <Text style={s.label}>Or browse 18 categories</Text>
      <ChipRow items={CATEGORIES} value={cat} onPick={browse} />
    </ScrollView>
  );
}

// ---------- Sprint D — Goals + Timely + Streak + Celebrate ----------
export function GoalsTab({ prefs }: { prefs: Prefs }) {
  const [goals, setGoals] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [celebrate, setCelebrate] = useState('');
  const [streak, setStreak] = useState(0);
  const refresh = async () => {
    const g = await api.goals() as any[];
    setGoals(Array.isArray(g) ? g : []);
    const st: any = await api.streak();
    setStreak(st.current_count || st.currentCount || 0);
  };
  useEffect(() => { refresh().catch(() => {}); }, []);
  const add = async () => {
    if (!title.trim()) return;
    try {
      await api.addGoal(title.trim(), { category: prefs.situation, why: prefs.goal });
      setTitle('');
      await refresh();
      api.event('goal_create', {}).catch(() => {});
    } catch { setGoals(prev => [...prev, { id: `local-${Date.now()}`, title: title.trim(), status: 'active' }]); setTitle(''); }
  };
  const doneGoal = async (id: string) => {
    try { await api.completeGoal(id); await refresh(); } catch { setGoals(prev => prev.map(g => g.id === id ? { ...g, status: 'done' } : g)); }
    setCelebrate("You showed up when it would have been easier to quit. That's progress.");
    api.event('goal_complete', { id }).catch(() => {});
  };
  return (
    <ScrollView contentContainerStyle={s.screen}>
      <Text style={s.h1}>Goals — what are you working toward?</Text>
      <StreakPill current={streak} />
      {celebrate ? <CelebrationBanner text={celebrate} onClose={() => setCelebrate('')} /> : null}
      <Text style={s.sub}>Timely: morning • midday • evening (see Profile frequency). We encourage the next useful action, not just "you can do it".</Text>
      <View style={s.row}>
        <TextInput style={[s.input, { flex: 1 }]} value={title} onChangeText={setTitle} placeholder="e.g. Get a new job" />
        <Pressable style={s.primary} onPress={add}><Text style={s.primaryT}>Add</Text></Pressable>
      </View>
      {goals.length === 0 ? <Text style={s.sub}>No goals yet — add your first above.</Text> : null}
      {goals.map(g => (
        <View key={String(g.id)} style={s.goalRow}>
          <Text style={g.status === 'done' ? s.done : s.goalTitle}>• {g.title}</Text>
          {g.status !== 'done' ? <Pressable style={s.ghost} onPress={() => doneGoal(String(g.id))}><Text>Done</Text></Pressable> : <Text>🎉</Text>}
        </View>
      ))}
    </ScrollView>
  );
}

// ---------- Sprint E — Journal + Saved + Share ----------
export function JournalTab({ onProgress }: { onProgress: () => void }) {
  const [entries, setEntries] = useState<any[]>([]);
  const [body, setBody] = useState("I didn't give up.");
  const [victories, setVictories] = useState<any[]>([]);
  const refresh = async () => {
    const j = await api.journal() as any[];
    setEntries(Array.isArray(j) ? j : []);
    const p: any = await api.progress();
    setVictories(p.victories || []);
  };
  useEffect(() => { refresh().catch(() => {}); onProgress(); }, []);
  const add = async () => {
    if (!body.trim()) return;
    try { await api.addJournal(body.trim(), { mood: 'okay' }); setBody(''); await refresh(); api.event('journal', {}).catch(() => {}); }
    catch { setEntries(prev => [{ id: `local-${Date.now()}`, body: body.trim() }, ...prev]); setBody(''); }
  };
  return (
    <ScrollView contentContainerStyle={s.screen}>
      <Text style={s.h1}>Journal — what are you proud of today?</Text>
      <View style={s.row}>
        <TextInput style={[s.input, { flex: 1 }]} value={body} onChangeText={setBody} placeholder="I didn't give up." />
        <Pressable style={s.primary} onPress={add}><Text style={s.primaryT}>Add</Text></Pressable>
      </View>
      {entries.map(e => (
        <View key={String(e.id)} style={s.entry}><Text>• {e.body}</Text></View>
      ))}
      <Text style={s.h1}>Look How Far You've Come</Text>
      {victories.length === 0 ? <Text style={s.sub}>Victories you mark will appear here.</Text> : null}
      {victories.slice(0, 20).map((v: any) => (
        <View key={String(v.id)} style={s.entry}><Text>🌱 {v.body}</Text></View>
      ))}
    </ScrollView>
  );
}

export function SavedTab() {
  const [saves, setSaves] = useState<any[]>([]);
  useEffect(() => { api.saves().then(s => setSaves(Array.isArray(s) ? s : [])).catch(() => {}); }, []);
  return (
    <ScrollView contentContainerStyle={s.screen}>
      <Text style={s.h1}>Saved Uplifts</Text>
      {saves.length === 0 ? <Text style={s.sub}>No saves yet — your meaningful ones will live here.</Text> : null}
      {saves.map((sv: any, i: number) => (
        <View key={i} style={s.entry}>
          <Text>{sv.collection || 'favorites'} • {sv.uplift_id || sv.upliftId}</Text>
          <Pressable onPress={() => { api.unsave(sv.uplift_id || sv.upliftId, sv.collection).then(() => api.saves().then(s => setSaves(s as any[])).catch(() => {})).catch(() => {}); }}>
            <Text style={s.link}>Remove</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

export function PaywallSheet({ title, tagline, priceStub, onUnlock, onRestore, onClose }: {
  title: string; tagline: string; priceStub: string;
  onUnlock: () => void; onRestore: () => void; onClose: () => void;
}) {
  return (
    <View style={s.paywall}>
      <Text style={s.h1}>🔒 {title}</Text>
      <Text>{tagline}</Text>
      <Text style={s.sub}>Premium perks ($1 test): 7-day style-matched journey • Guided reflections • Deeper progress insights.</Text>
      <Text style={s.sub}>{priceStub}</Text>
      <Text style={s.sub}>Free stays free: Daily Uplift, check-ins, categories, sharing, basic goals.</Text>
      <Pressable style={s.primary} onPress={onUnlock}><Text style={s.primaryT}>Unlock (stub — no charge)</Text></Pressable>
      <View style={s.row}>
        <Pressable style={s.ghost} onPress={onRestore}><Text>Restore</Text></Pressable>
        <Pressable style={s.ghost} onPress={onClose}><Text>Not now</Text></Pressable>
      </View>
    </View>
  );
}

function InsightCards({ data }: { data: any }) {
  if (!data) return <Text style={s.sub}>Insights unavailable offline.</Text>;
  const row = (k: string, v: any) => <Text key={k}>{k}: <Text style={{ fontWeight: '800' }}>{String(v)}</Text></Text>;
  return (
    <View style={s.entry}>
      {row('Day streak', data.streak ?? 0)}
      {row('Goals done', `${data.goalsDone ?? 0}/${data.goalsTotal ?? 0}`)}
      {row('Journal entries', data.journalEntries ?? 0)}
      {row('Victories', data.victories ?? 0)}
      {row('Saved', data.saves ?? 0)}
      {row('Meaningful rate', `${data.meaningfulRate ?? 0}%`)}
      {data.last14Days ? row('Active days (14d)', data.last14Days.length) : null}
    </View>
  );
}

export function ProfileTab({ prefs, onEdit, onSignOut }: { prefs: Prefs; onEdit: () => void; onSignOut: () => void }) {
  const [tier, setTier] = useState('free');
  const [packs, setPacks] = useState<any[]>([]);
  const [paywall, setPaywall] = useState<any | null>(null);
  const [days, setDays] = useState<any[]>([]);
  const [activePack, setActivePack] = useState('');
  const [reflection, setReflection] = useState<any | null>(null);
  const [insights, setInsights] = useState<any | null>(null);
  const [insightsFull, setInsightsFull] = useState(false);
  const stylesCsv = (prefs.styles || []).join(',');
  const refreshEnt = async () => {
    const e: any = await api.entitlements().catch(() => ({ tier: 'free', packs: [] }));
    setTier(e.tier || 'free');
    const p = await api.packs().catch(() => []);
    setPacks(Array.isArray(p) ? p : []);
  };
  useEffect(() => {
    refreshEnt().catch(() => {});
    api.insights(false).then(setInsights).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const openPack = async (id: string) => {
    setActivePack(id);
    try {
      const d = await api.packDays(id, stylesCsv) as any[];
      setDays(Array.isArray(d) ? d : []);
      setPaywall(null);
      api.event('journey_view', { pack: id }).catch(() => {});
    } catch (e: any) {
      if (String(e.message || '').includes('402')) {
        api.event('paywall_view', { pack: id }).catch(() => {});
        setPaywall({ pack: id, title: 'Confidence Pack', tagline: 'A 7-day guided journey from self-doubt to steady self-belief.', priceStub: 'Stub — no real charge in MVP' });
        setDays([]);
      }
    }
  };
  const unlock = async () => {
    if (!paywall && !activePack) return;
    const id = paywall?.pack || activePack;
    await api.unlockPack(id).catch(() => {});
    api.event('pack_unlock', { pack: id }).catch(() => {});
    setPaywall(null);
    await refreshEnt().catch(() => {});
    await openPack(id).catch(() => {});
  };
  const restore = async () => {
    const e: any = await api.restore().catch(() => null);
    if (e) { setTier(e.tier || 'free'); api.event('restore', {}).catch(() => {}); }
    await refreshEnt().catch(() => {});
    setPaywall(null);
  };
  const loadReflection = async () => {
    try {
      const r = await api.guidedReflection('confidence');
      setReflection(r);
    } catch (e: any) {
      if (String(e.message || '').includes('402')) {
        api.event('paywall_view', { pack: 'guided-reflection' }).catch(() => {});
        setPaywall({ pack: 'confidence-pack', title: 'Guided Reflections', tagline: 'Notice → Reframe → One step. A 3-minute premium reset.', priceStub: 'Stub — no real charge in MVP' });
      }
    }
  };
  const loadInsights = async (full: boolean) => {
    setInsightsFull(full);
    try {
      const r = await api.insights(full);
      setInsights(r);
      if (full) api.event('insight_view', { full: true }).catch(() => {});
    } catch (e: any) {
      if (String(e.message || '').includes('402')) {
        api.event('paywall_view', { pack: 'insights-full' }).catch(() => {});
        setPaywall({ pack: 'confidence-pack', title: 'Deeper Insights', tagline: '14-day trends + meaningful rate. See what is actually working.', priceStub: 'Stub — no real charge in MVP' });
      }
    }
  };
  return (
    <ScrollView contentContainerStyle={s.screen}>
      <Text style={s.h1}>Profile</Text>
      <Text>Mood: {prefs.mood} • Situation: {prefs.situation}</Text>
      <Text>Goal: {prefs.goal}</Text>
      <Text>Styles: {prefs.styles.join(', ')}</Text>
      <Text>Faith: {prefs.faithOptIn ? 'on (opt-in)' : 'off'} • {prefs.frequency} • {(prefs.notifyTimes || []).join(', ')}</Text>
      <Text style={s.sub}>Plan: {tier} — free stays free (Daily, check-ins, categories, sharing, basic goals).</Text>

      <Text style={s.h1}>Premium Uplift (test)</Text>
      {packs.map(p => (
        <View key={p.id} style={s.entry}>
          <Text style={{ fontWeight: '800' }}>{p.locked ? '🔒' : '✅'} {p.title}</Text>
          <Text style={s.sub}>{p.tagline}</Text>
          <Pressable style={s.primary} onPress={() => openPack(p.id)}><Text style={s.primaryT}>{p.locked ? 'View pack' : 'Open 7-day journey'}</Text></Pressable>
        </View>
      ))}
      {paywall ? <PaywallSheet title={paywall.title} tagline={paywall.tagline} priceStub={paywall.priceStub} onUnlock={unlock} onRestore={restore} onClose={() => setPaywall(null)} /> : null}
      {days.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Text style={s.label}>Your 7-day journey (style-matched: {stylesCsv})</Text>
          {days.map((d: any) => (
            <View key={d.id} style={s.card}>
              <Text style={s.greet}>Day {d.day}</Text>
              <Text style={s.msg}>{d.body}</Text>
              <Text style={s.action}>Action: {d.action}</Text>
              <Text style={s.sub}>Reflect: {d.reflection}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={s.h1}>Guided reflection (premium)</Text>
      <Pressable style={s.ghost} onPress={loadReflection}><Text>Start 3-minute reset</Text></Pressable>
      {reflection ? (
        <View style={{ gap: 8 }}>
          {(reflection.steps || []).map((st: any) => (
            <View key={st.step} style={s.entry}><Text style={{ fontWeight: '800' }}>{st.step}. {st.title}</Text><Text>{st.prompt}</Text></View>
          ))}
          <Text style={s.sub}>{reflection.closer}</Text>
        </View>
      ) : null}

      <Text style={s.h1}>Progress insights {insightsFull ? '(full)' : '(basic)'}</Text>
      <InsightCards data={insights} />
      <View style={s.row}>
        <Pressable style={s.ghost} onPress={() => loadInsights(false)}><Text>Basic</Text></Pressable>
        <Pressable style={s.ghost} onPress={() => loadInsights(true)}><Text>Full 14-day (premium)</Text></Pressable>
      </View>

      <Pressable style={s.ghost} onPress={onEdit}><Text>Edit preferences</Text></Pressable>
      <Pressable style={s.ghost} onPress={restore}><Text>Restore purchases</Text></Pressable>
      <Pressable style={s.ghost} onPress={() => { api.signOut().catch(() => {}).finally(onSignOut); }}><Text>Sign out</Text></Pressable>
      <Text style={s.sub}>Companion, not dependency. No clinical claims. If struggling deeply, reach out to someone you trust or local crisis resources. Streaks never shame: Start again. Keep going.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flexGrow: 1, backgroundColor: C.bg, padding: 20, gap: 12 },
  h1: { fontSize: 20, fontWeight: '800', color: C.ink },
  label: { fontSize: 14, fontWeight: '800', color: C.ink, marginTop: 8 },
  sub: { color: '#444', fontSize: 13 },
  err: { color: '#B00020', fontWeight: '700' },
  link: { color: C.blue, fontWeight: '700' },
  input: { borderWidth: 3, borderColor: C.ink, borderRadius: 12, padding: 12, backgroundColor: '#fff', fontSize: 16 },
  card: { backgroundColor: C.yellow, borderWidth: 3, borderColor: C.ink, borderRadius: 18, padding: 20, gap: 10 },
  greet: { backgroundColor: C.ink, color: '#fff', fontWeight: '800', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start', fontSize: 12 },
  msg: { fontSize: 22, fontWeight: '700', color: C.ink },
  script: { fontStyle: 'italic', color: C.ink },
  action: { backgroundColor: '#fff', borderWidth: 3, borderColor: C.ink, borderRadius: 12, padding: 10, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10 },
  primary: { backgroundColor: C.orange, borderWidth: 3, borderColor: C.ink, borderRadius: 999, padding: 14, alignItems: 'center', flex: 1 },
  primaryT: { color: '#fff', fontWeight: '800' },
  ghost: { backgroundColor: '#fff', borderWidth: 3, borderColor: C.ink, borderRadius: 999, padding: 14, alignItems: 'center', flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 3, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff' },
  chipOn: { backgroundColor: C.ink },
  chipT: { fontWeight: '800', color: C.ink },
  chipTOn: { color: '#fff' },
  streak: { backgroundColor: C.teal, borderWidth: 3, borderColor: C.ink, borderRadius: 12, padding: 10 },
  streakT: { fontWeight: '800', color: '#fff' },
  streakSub: { color: '#111', fontSize: 12 },
  celebrate: { backgroundColor: '#fff', borderWidth: 3, borderColor: C.teal, borderRadius: 12, padding: 12 },
  celebrateT: { fontWeight: '800', color: C.ink },
  paywall: { backgroundColor: '#fff', borderWidth: 3, borderColor: C.orange, borderRadius: 18, padding: 20, gap: 10 },
  goalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.grey, borderWidth: 3, borderColor: C.ink, borderRadius: 12, padding: 10 },
  goalTitle: { fontWeight: '700', flex: 1 },
  done: { textDecorationLine: 'line-through', flex: 1 },
  entry: { backgroundColor: '#fff', borderWidth: 3, borderColor: C.ink, borderRadius: 12, padding: 10 },
});
