import { useState } from 'react';
import type { Habit, Group } from '../types';
import { useAuth } from '../hooks/useAuth';

interface SidebarProps {
  habits: Habit[];
  groups: Group[];
  selectedHabitId: string | null;
  selectedGroupId: string | null;
  onSelectHabit: (id: string) => void;
  onSelectGroup: (id: string) => void;
  onNewHabit: () => void;
  onNewGroup: () => void;
  onJoinGroup: () => void;
}

export default function Sidebar({
  habits, groups, selectedHabitId, selectedGroupId,
  onSelectHabit, onSelectGroup, onNewHabit, onNewGroup, onJoinGroup,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`${collapsed ? 'w-16' : 'w-64'} h-full bg-cream border-r border-border-warm flex flex-col transition-all duration-300`}>
      {/* Logo — always visible, never scrolls away */}
      <div className="flex-shrink-0 p-4 flex items-center justify-between">
        {!collapsed && (
          <h1 className="text-xl font-bold font-display text-amber-dark">🐝 HabitHive</h1>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-cocoa hover:text-charcoal p-1 rounded-lg hover:bg-stone transition-all"
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Scrollable middle section — habits, groups, action buttons */}
          <div className="flex-1 overflow-y-auto flex flex-col pb-2">
            {/* Habits Section */}
            <div className="px-3 mt-4">
              <h2 className="text-[11px] font-semibold text-cocoa uppercase tracking-widest px-2 mb-2">
                My Habits
              </h2>
              <div className="space-y-1">
                {habits.length === 0 && (
                  <p className="text-xs text-cocoa px-2 py-1 italic">
                    No habits yet? Couldn't be me 👀
                  </p>
                )}
                {habits.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => onSelectHabit(h.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-all ${
                      selectedHabitId === h.id
                        ? 'bg-amber-light text-charcoal font-medium'
                        : 'text-charcoal hover:bg-amber-light/50'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs ${
                      h.completedToday
                        ? 'bg-sage border-sage text-white'
                        : 'border-border-warm'
                    }`}>
                      {h.completedToday && '✓'}
                    </span>
                    <span className={h.completedToday ? 'text-cocoa' : ''}>{h.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Groups Section */}
            <div className="px-3 mt-6">
              <h2 className="text-[11px] font-semibold text-cocoa uppercase tracking-widest px-2 mb-2">
                Groups
              </h2>
              <div className="space-y-1">
                {groups.length === 0 && (
                  <p className="text-xs text-cocoa px-2 py-1 italic">
                    No groups yet. Time to rally the squad!
                  </p>
                )}
                {groups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => onSelectGroup(g.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-all ${
                      selectedGroupId === g.id
                        ? 'bg-amber-light text-charcoal font-medium'
                        : 'text-charcoal hover:bg-amber-light/50'
                    }`}
                  >
                    <span>{g.name}</span>
                    <span className="text-xs text-cocoa bg-stone px-2 py-0.5 rounded-full">
                      {g.memberCount}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-3 mt-6 space-y-2">
              <button
                onClick={onNewHabit}
                className="w-full px-3 py-2 rounded-xl border-2 border-dashed border-amber text-amber text-sm font-semibold hover:bg-amber-light transition-all"
              >
                + New Habit
              </button>
              <button
                onClick={onNewGroup}
                className="w-full px-3 py-2 rounded-xl border-2 border-dashed border-amber text-amber text-sm font-semibold hover:bg-amber-light transition-all"
              >
                + Create Group
              </button>
              <button
                onClick={onJoinGroup}
                className="w-full px-3 py-2 rounded-xl border-2 border-dashed border-cocoa/40 text-cocoa text-sm font-semibold hover:bg-stone transition-all"
              >
                + Join Group
              </button>
            </div>
          </div>

          {/* User Profile — pinned to the bottom, never scrolls away */}
          <div className="flex-shrink-0 p-3 border-t border-border-warm">
            <div className="flex items-center gap-3 p-3 bg-stone rounded-xl">
              <div className="w-8 h-8 rounded-full bg-amber flex items-center justify-center text-white font-bold text-sm">
                {user?.displayName?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-charcoal truncate">{user?.displayName}</p>
                <p className="text-xs text-cocoa truncate">@{user?.username}</p>
              </div>
              <button
                onClick={logout}
                className="text-cocoa hover:text-coral text-xs transition-colors"
                title="Logout"
              >
                ↩
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
