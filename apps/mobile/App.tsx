import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { api, Prefs, Uplift } from './lib/api';
import { WelcomeScreen, Onboarding, AuthScreen, Home, NeedLift, GoalsTab, JournalTab, SavedTab, ProfileTab } from './lib/screens';

// Phase 4 complete tabs: Home / Need Lift / Goals / Journal(+Saved) / Profile
// Acceptance journey: Morning (Home Today) → Afternoon (Need Lift) → Evening (Journal reflect).
export default function App() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [welcomed, setWelcomed] = useState(false);
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [tab, setTab] = useState('home');
  const [journalMode, setJournalMode] = useState<'entries' | 'saved'>('entries');

  useEffect(() => {
    (async () => {
      try {
        const s: any = await api.session();
        if (s?.user || s?.session) {
          setAuthed(true);
          const p: any = await api.profile();
          if (p) {
            setPrefs({
              mood: (p.moods || ['okay'])[0] || 'okay',
              situation: (p.situations || ['career'])[0] || 'career',
              goal: (p.goals_focus || p.goalsFocus || ['Get a new job'])[0] || 'Get a new job',
              styles: p.styles || ['gentle'],
              faithOptIn: !!(p.faith_opt_in ?? p.faithOptIn),
              notifyTimes: p.notify_times || p.notifyTimes || ['08:00', '13:00', '20:00'],
              frequency: p.frequency || 'daily',
            });
          }
        }
      } catch {} finally { setChecking(false); }
    })();
  }, []);

  const finishOnboarding = async (p: Prefs) => {
    setPrefs(p);
    try {
      await api.saveProfile(p as any);
      await api.event('onboarding_complete', { mood: p.mood, situation: p.situation });
    } catch {}
    setTab('home');
  };

  const reflect = async (u: Uplift) => {
    api.event('reflect', { upliftId: u.id }).catch(() => {});
    setTab('journal');
    setJournalMode('entries');
  };

  const makeAction = async (u: Uplift) => {
    try {
      await api.addGoal(`Action: ${u.action}`.slice(0, 120), { category: u.category, why: 'From Today’s Uplift' });
      api.event('action_create', { upliftId: u.id }).catch(() => {});
    } catch {}
    setTab('goals');
  };

  if (checking) return <View style={{ flex: 1, padding: 40 }}><Text>Loading Uplift…</Text></View>;
  if (!authed && !welcomed) return <WelcomeScreen onStart={() => setWelcomed(true)} />;
  if (!authed) return <AuthScreen onAuthed={() => setAuthed(true)} />;
  if (!prefs) return <Onboarding done={finishOnboarding} />;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        {tab === 'home' && <Home prefs={prefs} onReflect={reflect} onMakeAction={makeAction} />}
        {tab === 'lift' && <NeedLift prefs={prefs} onReflect={reflect} />}
        {tab === 'goals' && <GoalsTab prefs={prefs} />}
        {tab === 'journal' && (
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', padding: 12, gap: 8 }}>
              <Pressable onPress={() => setJournalMode('entries')} style={{ flex: 1, padding: 10, backgroundColor: journalMode === 'entries' ? '#FFC400' : '#fff', borderWidth: 3, borderColor: '#111', borderRadius: 999 }}>
                <Text style={{ textAlign: 'center', fontWeight: '800' }}>Journal</Text>
              </Pressable>
              <Pressable onPress={() => setJournalMode('saved')} style={{ flex: 1, padding: 10, backgroundColor: journalMode === 'saved' ? '#FFC400' : '#fff', borderWidth: 3, borderColor: '#111', borderRadius: 999 }}>
                <Text style={{ textAlign: 'center', fontWeight: '800' }}>Saved</Text>
              </Pressable>
            </View>
            {journalMode === 'entries' ? <JournalTab onProgress={() => {}} /> : <SavedTab />}
          </View>
        )}
        {tab === 'profile' && <ProfileTab prefs={prefs} onEdit={() => setPrefs(null)} onSignOut={() => { setAuthed(false); setPrefs(null); }} />}
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
