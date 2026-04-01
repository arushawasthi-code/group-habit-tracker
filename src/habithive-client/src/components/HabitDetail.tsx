import { useState } from 'react';
import confetti from 'canvas-confetti';
import type { Habit, Group } from '../types';
import { completeHabit, updateVisibility, deleteHabit, updateHabit } from '../services/api';
import { HabitFrequency } from '../types';

interface HabitDetailProps {
  habit: Habit;
  groups: Group[];
  onUpdate: () => void;
}

const frequencyLabels: Record<number, string> = {
  [HabitFrequency.Daily]: 'Daily',
  [HabitFrequency.Weekly]: 'Weekly',
  [HabitFrequency.Custom]: 'Custom',
};

export default function HabitDetail({ habit, groups, onUpdate }: HabitDetailProps) {
  const [completing, setCompleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(habit.name);
  const [editDesc, setEditDesc] = useState(habit.description || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleComplete = async () => {
    if (habit.completedToday || completing) return;
    setCompleting(true);
    try {
      const res = await completeHabit(habit.id);
      // Confetti!
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#6BBF59', '#FEF3C7'],
      });

      // Streak milestone celebration
      if ([7, 30, 100].includes(res.data.currentStreak)) {
        setTimeout(() => {
          confetti({
            particleCount: 150,
            spread: 100,
            origin: { y: 0.5 },
          });
        }, 500);
      }

      onUpdate();
    } catch {
      // Already completed or error
    } finally {
      setCompleting(false);
    }
  };

  const handleVisibilityToggle = async (groupId: string, visible: boolean) => {
    const currentGroupIds = habit.visibility.map((v) => v.groupId);
    const newGroupIds = visible
      ? [...currentGroupIds, groupId]
      : currentGroupIds.filter((id) => id !== groupId);
    await updateVisibility(habit.id, newGroupIds);
    onUpdate();
  };

  const handleSave = async () => {
    await updateHabit(habit.id, editName, editDesc || null, habit.frequency, habit.customDays);
    setEditing(false);
    onUpdate();
  };

  const handleDelete = async () => {
    await deleteHabit(habit.id);
    onUpdate();
  };

  return (
    <div className="max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto p-6 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-border-warm p-6">
        {/* Header */}
        {editing ? (
          <div className="space-y-3 mb-4">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full text-2xl font-semibold bg-cream border border-border-warm rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber"
            />
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full text-sm bg-cream border border-border-warm rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber resize-none"
              rows={2}
              placeholder="Description (optional)"
            />
            <div className="flex gap-2">
              <button onClick={handleSave} className="px-4 py-2 bg-sage text-white rounded-lg text-sm font-semibold">
                Save
              </button>
              <button onClick={() => setEditing(false)} className="px-4 py-2 bg-stone text-cocoa rounded-lg text-sm">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-2">
              <h2 className="text-2xl font-semibold text-charcoal">{habit.name}</h2>
              <div className="flex gap-2">
                <button onClick={() => { setEditName(habit.name); setEditDesc(habit.description || ''); setEditing(true); }}
                  className="text-cocoa hover:text-charcoal text-sm transition-colors">✏️</button>
                <button onClick={() => setShowDeleteConfirm(true)}
                  className="text-cocoa hover:text-coral text-sm transition-colors">🗑️</button>
              </div>
            </div>
            {habit.description && (
              <p className="text-sm text-cocoa mb-3">{habit.description}</p>
            )}
          </>
        )}

        {/* Frequency Badge */}
        <span className="inline-block px-3 py-1 bg-amber-light text-amber-dark text-xs font-semibold rounded-full mb-4">
          {frequencyLabels[habit.frequency]}
          {habit.customDays && ` · ${habit.customDays}`}
        </span>

        {/* Streaks */}
        <div className="flex gap-6 mb-6">
          <div>
            <p className="text-lg font-bold text-amber">
              🔥 {habit.currentStreak} {habit.currentStreak === 1 ? 'day' : 'days'}
            </p>
            <p className="text-xs text-cocoa">
              {habit.currentStreak === 0
                ? "Day 0. Every legend has an origin story."
                : 'Current streak'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-cocoa">
              🏆 {habit.longestStreak} {habit.longestStreak === 1 ? 'day' : 'days'}
            </p>
            <p className="text-xs text-cocoa">Longest streak</p>
          </div>
        </div>

        {/* Complete Button */}
        <button
          onClick={handleComplete}
          disabled={habit.completedToday || completing}
          className={`w-full py-4 rounded-xl font-bold font-display text-lg transition-all ${
            habit.completedToday
              ? 'bg-sage text-white cursor-default'
              : 'bg-amber hover:bg-amber-dark text-white hover:scale-[1.02] active:scale-[0.98]'
          } disabled:hover:scale-100`}
        >
          {completing
            ? 'Summoning motivation...'
            : habit.completedToday
            ? 'Done for today! 🎉'
            : 'Mark Complete ✓'}
        </button>

        {/* Visibility */}
        {groups.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border-warm">
            <h3 className="text-xs font-semibold text-cocoa uppercase tracking-widest mb-3">
              Shared with
            </h3>
            <div className="space-y-2">
              {groups.map((g) => {
                const isVisible = habit.visibility.some((v) => v.groupId === g.id);
                return (
                  <label key={g.id} className="flex items-center gap-3 cursor-pointer group">
                    <div
                      onClick={() => handleVisibilityToggle(g.id, !isVisible)}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${
                        isVisible
                          ? 'bg-amber border-amber text-white'
                          : 'border-border-warm group-hover:border-amber'
                      }`}
                    >
                      {isVisible && <span className="text-xs">✓</span>}
                    </div>
                    <span className="text-sm text-charcoal">{g.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="mt-4 p-4 bg-coral-light rounded-xl animate-fade-in">
            <p className="text-sm font-semibold text-charcoal mb-2">
              Delete this habit? Your streak will cry. 😢
            </p>
            <div className="flex gap-2">
              <button onClick={handleDelete} className="px-4 py-2 bg-coral text-white rounded-lg text-sm font-semibold">
                Delete it
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 bg-white text-cocoa rounded-lg text-sm border border-border-warm">
                Keep it
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
