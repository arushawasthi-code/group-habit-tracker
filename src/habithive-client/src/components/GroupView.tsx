import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSignalR } from '../hooks/useSignalR';
import { getGroupMembers, getGroupHabits, getGroupMessages, searchGifs, leaveGroup, deleteGroup } from '../services/api';
import type { GroupMember, GroupHabitsResponse, ChatMessage, Group, GifResult, SuggestionStatus } from '../types';
import { MessageType, SpecialMessageTemplate } from '../types';
import ChatBubble from './ChatBubble';

interface GroupViewProps {
  group: Group;
  onUpdate: () => void;
}

export default function GroupView({ group, onUpdate }: GroupViewProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState<'habits' | 'chat'>('chat');
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [groupHabits, setGroupHabits] = useState<GroupHabitsResponse[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifQuery, setGifQuery] = useState('');
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [showSpecialPicker, setShowSpecialPicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const gifDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  const onMessageReceived = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const onSuggestionUpdated = useCallback((suggestionId: string, status: SuggestionStatus) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.suggestion?.id === suggestionId
          ? { ...m, suggestion: { ...m.suggestion, status } }
          : m
      )
    );
  }, []);

  const { sendMessage, sendSpecialMessage, respondToSuggestion } = useSignalR(
    group.id, onMessageReceived, onSuggestionUpdated
  );

  useEffect(() => {
    loadData();
  }, [group.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadData = async () => {
    const [membersRes, habitsRes, messagesRes] = await Promise.all([
      getGroupMembers(group.id),
      getGroupHabits(group.id),
      getGroupMessages(group.id),
    ]);
    setMembers(membersRes.data);
    setGroupHabits(habitsRes.data);
    setMessages(messagesRes.data.messages);
    setHasMore(messagesRes.data.hasMore);
  };

  const loadMoreMessages = async () => {
    if (!hasMore || messages.length === 0) return;
    const oldest = messages[0].createdAt;
    const res = await getGroupMessages(group.id, oldest);
    setMessages([...res.data.messages, ...messages]);
    setHasMore(res.data.hasMore);
  };

  const handleSendText = async () => {
    const text = messageText.trim();
    if (!text) return;
    setMessageText('');
    await sendMessage(MessageType.Text, text);
  };

  const handleSendGif = async (gif: GifResult) => {
    setShowGifPicker(false);
    setGifQuery('');
    setGifs([]);
    await sendMessage(MessageType.Gif, gif.url);
  };

  const handleGifSearch = (q: string) => {
    setGifQuery(q);
    if (gifDebounceRef.current) clearTimeout(gifDebounceRef.current);
    if (!q.trim()) { setGifs([]); return; }
    gifDebounceRef.current = setTimeout(async () => {
      try {
        const res = await searchGifs(q);
        setGifs(res.data);
      } catch { setGifs([]); }
    }, 300);
  };

  const handleSpecialMessage = async (template: SpecialMessageTemplate, habitId: string, caption?: string) => {
    setShowSpecialPicker(false);
    await sendSpecialMessage(template, habitId, caption);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(group.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = async () => {
    await leaveGroup(group.id);
    onUpdate();
  };

  const handleDelete = async () => {
    await deleteGroup(group.id);
    onUpdate();
  };

  // Get other members' shared habits for special messages
  const otherMembersHabits = groupHabits
    .filter((gh) => gh.userId !== user?.userId)
    .flatMap((gh) => gh.habits.map((h) => ({ ...h, ownerName: gh.displayName })));

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Group Header */}
      <div className="p-4 bg-white border-b border-border-warm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-charcoal">{group.name}</h2>
            {group.description && <p className="text-sm text-cocoa">{group.description}</p>}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 bg-amber-light text-amber-dark text-sm font-mono font-bold rounded-lg hover:bg-amber hover:text-white transition-all"
              title="Copy invite code"
            >
              {copied ? 'Copied! ✓' : group.inviteCode}
            </button>
            <span className="text-sm text-cocoa">{members.length}/8 members</span>
            {group.isCreator ? (
              <button onClick={() => setShowLeaveConfirm(true)} className="text-xs text-coral hover:underline">
                Delete
              </button>
            ) : (
              <button onClick={() => setShowLeaveConfirm(true)} className="text-xs text-cocoa hover:text-coral hover:underline">
                Leave
              </button>
            )}
          </div>
        </div>

        {showLeaveConfirm && (
          <div className="mt-3 p-3 bg-coral-light rounded-xl animate-fade-in flex items-center gap-3">
            <p className="text-sm text-charcoal flex-1">
              {group.isCreator
                ? 'Dissolve the hive? Everyone will be evicted 😢'
                : 'Leave this hive? Your shared habits will be hidden.'}
            </p>
            <button onClick={group.isCreator ? handleDelete : handleLeave}
              className="px-3 py-1 bg-coral text-white text-sm font-semibold rounded-lg">
              {group.isCreator ? 'Delete' : 'Leave'}
            </button>
            <button onClick={() => setShowLeaveConfirm(false)}
              className="px-3 py-1 bg-white text-cocoa text-sm rounded-lg border border-border-warm">
              Stay
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mt-3 bg-stone rounded-lg p-1">
          <button
            className={`flex-1 py-1.5 rounded-md text-sm font-semibold transition-all ${
              tab === 'habits' ? 'bg-white text-charcoal shadow-sm' : 'text-cocoa hover:text-charcoal'
            }`}
            onClick={() => setTab('habits')}
          >
            Members & Habits
          </button>
          <button
            className={`flex-1 py-1.5 rounded-md text-sm font-semibold transition-all ${
              tab === 'chat' ? 'bg-white text-charcoal shadow-sm' : 'text-cocoa hover:text-charcoal'
            }`}
            onClick={() => setTab('chat')}
          >
            Chat
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {tab === 'habits' ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {groupHabits.map((member) => (
            <div key={member.userId} className="bg-white rounded-xl border border-border-warm p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-amber flex items-center justify-center text-white font-bold text-sm">
                  {member.displayName[0]?.toUpperCase()}
                </div>
                <span className="font-semibold text-charcoal">{member.displayName}</span>
                {member.userId === user?.userId && (
                  <span className="text-xs text-cocoa bg-stone px-2 py-0.5 rounded-full">You</span>
                )}
              </div>
              {member.habits.length === 0 ? (
                <p className="text-sm text-cocoa italic">No shared habits yet</p>
              ) : (
                <div className="space-y-2">
                  {member.habits.map((h) => (
                    <div key={h.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-cream transition-colors">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs ${
                          h.completedToday ? 'bg-sage border-sage text-white' : 'border-border-warm'
                        }`}>
                          {h.completedToday && '✓'}
                        </span>
                        <span className="text-sm text-charcoal">{h.name}</span>
                      </div>
                      <span className="text-sm text-amber font-medium">🔥 {h.currentStreak}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-2 xl:px-8 2xl:px-16">
            {hasMore && (
              <button onClick={loadMoreMessages} className="w-full py-2 text-sm text-cocoa hover:text-charcoal">
                Load more messages...
              </button>
            )}
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-cocoa italic font-display">It's quiet... too quiet. Say something! 🐝</p>
              </div>
            )}
            {messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                message={msg}
                isOwn={msg.senderId === user?.userId}
                isTargetUser={msg.suggestion?.targetUserId === user?.userId}
                onRespondToSuggestion={respondToSuggestion}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* GIF Picker */}
          {showGifPicker && (
            <div className="border-t border-border-warm bg-white p-3 animate-slide-up" style={{ height: '300px' }}>
              <input
                type="text"
                value={gifQuery}
                onChange={(e) => handleGifSearch(e.target.value)}
                placeholder="Search GIFs..."
                className="w-full px-3 py-2 rounded-xl border border-border-warm bg-cream text-sm focus:outline-none focus:ring-2 focus:ring-amber mb-2"
                autoFocus
              />
              <div className="overflow-y-auto grid grid-cols-3 gap-2" style={{ height: '230px' }}>
                {gifs.map((gif) => (
                  <img
                    key={gif.id}
                    src={gif.previewUrl}
                    alt="GIF"
                    className="w-full rounded-lg cursor-pointer hover:opacity-80 transition-opacity object-cover"
                    style={{ height: '100px' }}
                    onClick={() => handleSendGif(gif)}
                  />
                ))}
                {gifQuery && gifs.length === 0 && (
                  <p className="col-span-3 text-center text-cocoa text-sm mt-8">
                    The GIF bees are on break. Try another search?
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Special Message Picker */}
          {showSpecialPicker && (
            <SpecialMessagePicker
              habits={otherMembersHabits}
              onSend={handleSpecialMessage}
              onClose={() => setShowSpecialPicker(false)}
            />
          )}

          {/* Chat Input */}
          <div className="p-3 bg-white border-t border-border-warm flex items-center gap-2 xl:px-8 2xl:px-16">
            <button
              onClick={() => { setShowGifPicker(!showGifPicker); setShowSpecialPicker(false); }}
              className={`p-2 rounded-xl transition-all ${showGifPicker ? 'bg-amber text-white' : 'text-cocoa hover:bg-stone'}`}
              title="GIFs"
            >
              🎬
            </button>
            <button
              onClick={() => { setShowSpecialPicker(!showSpecialPicker); setShowGifPicker(false); }}
              className={`p-2 rounded-xl transition-all ${showSpecialPicker ? 'bg-amber text-white' : 'text-cocoa hover:bg-stone'}`}
              title="Special message"
            >
              ⭐
            </button>
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2.5 rounded-full border border-border-warm bg-cream text-sm focus:outline-none focus:ring-2 focus:ring-amber"
            />
            <button
              onClick={handleSendText}
              disabled={!messageText.trim()}
              className="w-10 h-10 rounded-full bg-amber text-white flex items-center justify-center hover:bg-amber-dark transition-all disabled:opacity-30"
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Special Message Picker sub-component
function SpecialMessagePicker({
  habits,
  onSend,
  onClose,
}: {
  habits: { id: string; name: string; ownerName: string }[];
  onSend: (template: SpecialMessageTemplate, habitId: string, caption?: string) => void;
  onClose: () => void;
}) {
  const [template, setTemplate] = useState<SpecialMessageTemplate | null>(null);
  const [selectedHabit, setSelectedHabit] = useState('');
  const [caption, setCaption] = useState('');

  const templates = [
    { value: SpecialMessageTemplate.LockIn, icon: '🔒', label: 'Lock In', color: 'bg-amber-light text-amber-dark' },
    { value: SpecialMessageTemplate.YouCanDoThis, icon: '💪', label: 'You Can Do This', color: 'bg-sage-light text-sage' },
    { value: SpecialMessageTemplate.StopBeingLazy, icon: '😤', label: 'Stop Being Lazy', color: 'bg-coral-light text-coral' },
  ];

  return (
    <div className="border-t border-border-warm bg-white p-4 animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-charcoal text-sm">Send a special message</h3>
        <button onClick={onClose} className="text-cocoa hover:text-charcoal text-sm">✕</button>
      </div>

      {/* Templates */}
      <div className="flex gap-2 mb-3">
        {templates.map((t) => (
          <button
            key={t.value}
            onClick={() => setTemplate(t.value)}
            className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
              template === t.value ? t.color + ' ring-2 ring-offset-1' : 'bg-stone text-cocoa hover:bg-cream'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {template !== null && (
        <>
          {/* Habit Selection */}
          <select
            value={selectedHabit}
            onChange={(e) => setSelectedHabit(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-border-warm bg-cream text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-amber"
          >
            <option value="">Pick a habit to reference...</option>
            {habits.map((h) => (
              <option key={h.id} value={h.id}>
                {h.ownerName} — {h.name}
              </option>
            ))}
          </select>

          {habits.length === 0 && (
            <p className="text-xs text-cocoa italic mb-2">No shared habits from other members to reference.</p>
          )}

          {/* Caption */}
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption (optional)"
            maxLength={200}
            className="w-full px-3 py-2 rounded-xl border border-border-warm bg-cream text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-amber"
          />

          <button
            onClick={() => selectedHabit && onSend(template, selectedHabit, caption || undefined)}
            disabled={!selectedHabit}
            className="px-4 py-2 bg-amber text-white rounded-xl text-sm font-semibold hover:bg-amber-dark transition-all disabled:opacity-30"
          >
            Send
          </button>
        </>
      )}
    </div>
  );
}
