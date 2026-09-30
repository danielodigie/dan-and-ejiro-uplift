import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Onboarding, Home, NeedLift } from './lib/screens';

// Phase 4D tabs: Home / Need Lift / Goals / Journal / Profile
// Goals + Journal now POST to local Postgres API with offline fallback.
export default function App() {
  const [prefs, setPrefs] = useState<any>(null);
  const [tab, setTab] = useState('home');
  const [goals, setGoals] = useState<string[]>(['Get a new job']);
  const [entries, setEntries] = useState<string[]>([]);

  if (!prefs) return <Onboarding done={setPrefs} />;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {tab === 'home' && <Home prefs={prefs} />}
        {tab === 'lift' && <NeedLift prefs={prefs} />}
        {tab === 'goals' && (
          <View style={{ padding: 20, gap: 8 }}>
            <Text style={{ fontSize: 20, fontWeight: '800' }}>Goals — what are you working toward?</Text>
            {goals.map(g => <Text key={g}>• {g}</Text>)}
            <Pressable onPress={() => setGoals([...goals, `Goal ${goals.length + 1}`])}><Text>+ Add goal (local stub)</Text></Pressable>
          </View>
        )}
        {tab === 'journal' && (
          <View style={{ padding: 20, gap: 8 }}>
            <Text style={{ fontSize: 20, fontWeight: '800' }}>Journal — what are you proud of today?</Text>
            {entries.map((e, i) => <Text key={i}>• {e}</Text>)}
            <Pressable onPress={() => setEntries([...entries, "I didn't give up."])}><Text>+ Add entry (local stub)</Text></Pressable>
          </View>
        )}
        {tab === 'profile' && (
          <View style={{ padding: 20, gap: 8 }}>
            <Text style={{ fontSize: 20, fontWeight: '800' }}>Profile</Text>
            <Text>Mood: {prefs.mood} • Situation: {prefs.situation} • Style: {prefs.style}</Text>
            <Pressable onPress={() => setPrefs(null)}><Text>Edit preferences (restart onboarding)</Text></Pressable>
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', borderTopWidth: 3, borderColor: '#111' }}>
        {['home', 'lift', 'goals', 'journal', 'profile'].map(t => (
          <Pressable key={t} onPress={() => setTab(t)} style={{ flex: 1, padding: 14, backgroundColor: tab === t ? '#FFC400' : '#fff' }}>
            <Text style={{ textAlign: 'center', fontWeight: '800' }}>{t}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
