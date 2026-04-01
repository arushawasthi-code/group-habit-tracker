import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import Sidebar from './components/Sidebar';
import HabitDetail from './components/HabitDetail';
import GroupView from './components/GroupView';
import Modal from './components/Modal';
import { getHabits, getGroups, createHabit, createGroup, joinGroup } from './services/api';
import type { Habit, Group } from './types';
import { HabitFrequency, MessageType } from './types';

const LOADING_MESSAGES = [
  'Summoning motivation...',
  'Asking the bees for your data...',
  'Consulting the hive mind...',
  'Warming up the honeycomb...',
];

export default function App() {
  const { isAuthenticated } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showNewHabit, setShowNewHabit] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);

  // New habit form
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitDesc, setNewHabitDesc] = useState('');
  const [newHabitFreq, setNewHabitFreq] = useState<HabitFrequency>(HabitFrequency.Daily);
  const [newHabitDays, setNewHabitDays] = useState('');

  // New group form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  // Join group form
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  const [formError, setFormError] = useState('');

  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [habitsRes, groupsRes] = await Promise.all([getHabits(), getGroups()]);
      setHabits(habitsRes.data);
      setGroups(groupsRes.data);
    } catch {
      // token might be invalid
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Clear selection if the selected item no longer exists
  useEffect(() => {
    if (selectedHabitId && !habits.find((h) => h.id === selectedHabitId)) {
      setSelectedHabitId(null);
    }
    if (selectedGroupId && !groups.find((g) => g.id === selectedGroupId)) {
      setSelectedGroupId(null);
    }
  }, [habits, groups, selectedHabitId, selectedGroupId]);

  const handleCreateHabit = async () => {
    setFormError('');
    try {
      await createHabit(
        newHabitName,
        newHabitDesc || null,
        newHabitFreq,
        newHabitFreq === HabitFrequency.Custom ? newHabitDays : null,
      );
      setShowNewHabit(false);
      setNewHabitName('');
      setNewHabitDesc('');
      setNewHabitFreq(HabitFrequency.Daily);
      setNewHabitDays('');
      loadData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Something went wrong');
    }
  };

  const handleCreateGroup = async () => {
    setFormError('');
    try {
      const res = await createGroup(newGroupName, newGroupDesc || undefined);
      setShowNewGroup(false);
      setNewGroupName('');
      setNewGroupDesc('');
      setSelectedGroupId(res.data.id);
      setSelectedHabitId(null);
      loadData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Something went wrong');
    }
  };

  const handleJoinGroup = async () => {
    setJoinError('');
    try {
      const res = await joinGroup(joinCode);
      setShowJoinGroup(false);
      setJoinCode('');
      setSelectedGroupId(res.data.id);
      setSelectedHabitId(null);
      loadData();
    } catch (err: any) {
      setJoinError(err.response?.data?.message || 'Something went wrong');
    }
  };

  if (!isAuthenticated) return <LoginPage />;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-cream">
        <div className="text-center animate-fade-in">
          <div className="text-4xl mb-4 animate-pop">🐝</div>
          <p className="text-cocoa font-display text-lg">
            {LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]}
          </p>
        </div>
      </div>
    );
  }

  const selectedHabit = habits.find((h) => h.id === selectedHabitId);
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <div className="flex h-screen overflow-hidden bg-cream w-full">

      <Sidebar
        habits={habits}
        groups={groups}
        selectedHabitId={selectedHabitId}
        selectedGroupId={selectedGroupId}
        onSelectHabit={(id) => { setSelectedHabitId(id); setSelectedGroupId(null); }}
        onSelectGroup={(id) => { setSelectedGroupId(id); setSelectedHabitId(null); }}
        onNewHabit={() => { setFormError(''); setShowNewHabit(true); }}
        onNewGroup={() => { setFormError(''); setShowNewGroup(true); }}
        onJoinGroup={() => { setJoinError(''); setShowJoinGroup(true); }}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {selectedGroup ? (
          <GroupView group={selectedGroup} onUpdate={loadData} />
        ) : selectedHabit ? (
          <div className="flex-1 overflow-y-auto">
            <HabitDetail
              habit={selectedHabit}
              groups={groups}
              onUpdate={loadData}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center animate-fade-in">
              <p className="text-6xl mb-4">🐝</p>
              <h2 className="text-2xl font-bold font-display text-charcoal mb-2">
                Welcome to HabitHive!
              </h2>
              <p className="text-cocoa max-w-md">
                Select a habit from the sidebar to check in, or open a group to chat with your hive.
                {habits.length === 0 && groups.length === 0 && (
                  <span className="block mt-2 italic">
                    Start by creating a habit or joining a group!
                  </span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* New Habit Modal */}
      <Modal isOpen={showNewHabit} onClose={() => setShowNewHabit(false)} title="🌱 New Habit">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-cocoa uppercase tracking-wider mb-1">Name</label>
            <input
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border-warm bg-cream text-sm focus:outline-none focus:ring-2 focus:ring-amber"
              placeholder="e.g., Morning run"
              maxLength={100}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-cocoa uppercase tracking-wider mb-1">Description</label>
            <textarea
              value={newHabitDesc}
              onChange={(e) => setNewHabitDesc(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border-warm bg-cream text-sm focus:outline-none focus:ring-2 focus:ring-amber resize-none"
              rows={2}
              placeholder="Optional details"
              maxLength={500}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-cocoa uppercase tracking-wider mb-1">Frequency</label>
            <div className="flex gap-2">
              {[
                { value: HabitFrequency.Daily, label: 'Daily' },
                { value: HabitFrequency.Weekly, label: 'Weekly' },
                { value: HabitFrequency.Custom, label: 'Custom' },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setNewHabitFreq(f.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    newHabitFreq === f.value
                      ? 'bg-amber text-white'
                      : 'bg-stone text-cocoa hover:bg-amber-light'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          {newHabitFreq === HabitFrequency.Custom && (
            <div className="animate-fade-in">
              <label className="block text-xs font-semibold text-cocoa uppercase tracking-wider mb-1">Days</label>
              <input
                value={newHabitDays}
                onChange={(e) => setNewHabitDays(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border-warm bg-cream text-sm focus:outline-none focus:ring-2 focus:ring-amber"
                placeholder="e.g., Monday,Wednesday,Friday"
              />
            </div>
          )}
          {formError && (
            <p className="text-sm text-coral">{formError}</p>
          )}
          <button
            onClick={handleCreateHabit}
            disabled={!newHabitName.trim()}
            className="w-full py-2.5 bg-amber text-white font-semibold rounded-xl hover:bg-amber-dark transition-all disabled:opacity-30"
          >
            Create Habit
          </button>
        </div>
      </Modal>

      {/* New Group Modal */}
      <Modal isOpen={showNewGroup} onClose={() => setShowNewGroup(false)} title="🏠 Create Group">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-cocoa uppercase tracking-wider mb-1">Group Name</label>
            <input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border-warm bg-cream text-sm focus:outline-none focus:ring-2 focus:ring-amber"
              placeholder="e.g., Gym Bros"
              maxLength={50}
              minLength={3}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-cocoa uppercase tracking-wider mb-1">Description</label>
            <textarea
              value={newGroupDesc}
              onChange={(e) => setNewGroupDesc(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border-warm bg-cream text-sm focus:outline-none focus:ring-2 focus:ring-amber resize-none"
              rows={2}
              placeholder="Optional"
              maxLength={200}
            />
          </div>
          {formError && <p className="text-sm text-coral">{formError}</p>}
          <button
            onClick={handleCreateGroup}
            disabled={!newGroupName.trim() || newGroupName.trim().length < 3}
            className="w-full py-2.5 bg-amber text-white font-semibold rounded-xl hover:bg-amber-dark transition-all disabled:opacity-30"
          >
            Create Group
          </button>
        </div>
      </Modal>

      {/* Join Group Modal */}
      <Modal isOpen={showJoinGroup} onClose={() => setShowJoinGroup(false)} title="🔑 Join Group">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-cocoa uppercase tracking-wider mb-1">Invite Code</label>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2.5 rounded-xl border border-border-warm bg-cream text-sm font-mono text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-amber"
              placeholder="ABC123"
              maxLength={6}
            />
          </div>
          {joinError && (
            <p className="text-sm text-coral animate-fade-in">{joinError}</p>
          )}
          <button
            onClick={handleJoinGroup}
            disabled={joinCode.trim().length < 6}
            className="w-full py-2.5 bg-amber text-white font-semibold rounded-xl hover:bg-amber-dark transition-all disabled:opacity-30"
          >
            Join the Hive 🐝
          </button>
        </div>
      </Modal>
    </div>
  );
}
