import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { api, Uplift } from '../lib/api';

// Bright sharp theme (matches design.html v2): white bg, ink borders, orange/blue/yellow solids, no gradients.
export const C = { bg: '#FFFFFF', ink: '#111111', orange: '#FF4D00', blue: '#0B5CFF', yellow: '#FFC400', teal: '#00C2A8' };

function Card({ u }: { u: Uplift }) {
  return (
    <View style={s.card}>
      <Text style={s.greet}>{u.greeting}</Text>
      <Text style={s.msg}>{u.body}</Text>
      {u.scripture ? <Text style={s.script}>{u.scripture}</Text> : null}
      <Text style={s.action}>Today's small action: {u.action}</Text>
    </View>
  );
}

export function ChipRow({ items, value, onPick }: { items: string[]; value?: string; onPick: (v: string) => void }) {
  return (
    <View style={s.chips}>
      {items.map(i => (
        <Pressable key={i} onPress={() => onPick(i)} style={[s.chip, value === i && s.chipOn]}>
          <Text style={[s.chipT, value === i && s.chipTOn]}>{i}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// Sprint A — Onboarding (feel + situation + goal + style + faith + times)
export function Onboarding({ done }: { done: (prefs: any) => void }) {
  const [mood, setMood] = useState('okay');
  const [situation, setSituation] = useState('career');
  const [style, setStyle] = useState('gentle');
  return (
    <View style={s.screen}>
      <Text style={s.h1}>How are you feeling?</Text>
      <ChipRow items={['great', 'good', 'okay', 'low', 'struggling']} value={mood} onPick={setMood} />
      <Text style={s.h1}>What are you dealing with?</Text>
      <ChipRow items={['career', 'school', 'business', 'finances', 'relationships', 'family']} value={situation} onPick={setSituation} />
      <Text style={s.h1}>How do you like to be encouraged?</Text>
      <ChipRow items={['gentle', 'bold', 'practical', 'spiritual']} value={style} onPick={setStyle} />
      <Pressable style={s.primary} onPress={() => done({ mood, situation, style })}>
        <Text style={s.primaryT}>Show my first Uplift</Text>
      </Pressable>
    </View>
  );
}

// Sprint B — Home / Today's Uplift
export function Home({ prefs }: { prefs: any }) {
  const [u, setU] = useState<Uplift | null>(null);
  const load = () => api.today({ mood: prefs.mood, situation: prefs.situation, style: prefs.style }).then(setU).catch(() => setU({
    id: 'offline', greeting: 'Good morning.', body: 'You do not need to solve everything today. Focus on the next step and keep moving.', action: 'Do one 10-minute step now.', category: 'hope',
  }));
  useEffect(() => { load(); }, []);
  return (
    <View style={s.screen}>
      <Text style={s.h1}>Today's Uplift</Text>
      {u ? <Card u={u} /> : <Text>Loading…</Text>}
      <View style={s.row}>
        <Pressable style={s.primary} onPress={load}><Text style={s.primaryT}>Another</Text></Pressable>
        <Pressable style={s.ghost} onPress={() => {}}><Text>Save</Text></Pressable>
        <Pressable style={s.ghost} onPress={() => {}}><Text>Share</Text></Pressable>
      </View>
    </View>
  );
}

// Sprint C — I Need a Lift
export function NeedLift({ prefs }: { prefs: any }) {
  const [u, setU] = useState<Uplift | null>(null);
  const intents = ['discouraged', 'confidence', 'overwhelmed', 'motivation', 'failure', 'afraid-to-start', 'lonely', 'hope', 'keep-going', 'decision', 'strength'];
  return (
    <View style={s.screen}>
      <Text style={s.h1}>I Need a Lift</Text>
      <ChipRow items={intents} value="" onPick={intent => api.lift({ intent, situation: prefs.situation, style: prefs.style }).then(setU).catch(() => {})} />
      {u ? <Card u={u} /> : <Text>Tap what you need above.</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, padding: 20, gap: 12 },
  h1: { fontSize: 20, fontWeight: '800', color: C.ink },
  card: { backgroundColor: C.yellow, borderWidth: 3, borderColor: C.ink, borderRadius: 18, padding: 20, gap: 10 },
  greet: { backgroundColor: C.ink, color: '#fff', fontWeight: '800', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start', fontSize: 12 },
  msg: { fontSize: 22, fontWeight: '700', color: C.ink },
  script: { fontStyle: 'italic', color: C.ink },
  action: { backgroundColor: '#fff', borderWidth: 3, borderColor: C.ink, borderRadius: 12, padding: 10, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10 },
  primary: { backgroundColor: C.orange, borderWidth: 3, borderColor: C.ink, borderRadius: 999, padding: 14, alignItems: 'center' },
  primaryT: { color: '#fff', fontWeight: '800' },
  ghost: { backgroundColor: '#fff', borderWidth: 3, borderColor: C.ink, borderRadius: 999, padding: 14, alignItems: 'center', flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 3, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff' },
  chipOn: { backgroundColor: C.ink },
  chipT: { fontWeight: '800', color: C.ink },
  chipTOn: { color: '#fff' },
});
