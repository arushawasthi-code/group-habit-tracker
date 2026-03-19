import type { ChatMessage, SuggestionStatus } from '../types';
import { MessageType, SpecialMessageTemplate, SuggestionType, SuggestionStatus as SugStatus } from '../types';

interface ChatBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  isTargetUser?: boolean;
  onRespondToSuggestion?: (suggestionId: string, accepted: boolean) => void;
}

const templateConfig = {
  [SpecialMessageTemplate.LockIn]: {
    icon: '🔒', title: 'Lock In', borderColor: 'border-l-amber', bgColor: 'bg-amber-light',
  },
  [SpecialMessageTemplate.YouCanDoThis]: {
    icon: '💪', title: 'You Can Do This', borderColor: 'border-l-sage', bgColor: 'bg-sage-light',
  },
  [SpecialMessageTemplate.StopBeingLazy]: {
    icon: '😤', title: 'Stop Being Lazy', borderColor: 'border-l-coral', bgColor: 'bg-coral-light',
  },
};

const suggestionTypeLabels = {
  [SuggestionType.Split]: 'Split',
  [SuggestionType.Combine]: 'Combine',
  [SuggestionType.Reword]: 'Reword',
};

export default function ChatBubble({ message, isOwn, isTargetUser, onRespondToSuggestion }: ChatBubbleProps) {
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // GIF message
  if (message.messageType === MessageType.Gif) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-slide-up`}>
        <div className={`max-w-[300px] ${!isOwn ? 'ml-0' : ''}`}>
          {!isOwn && (
            <p className="text-xs font-semibold text-cocoa mb-1 ml-1">{message.senderDisplayName}</p>
          )}
          <img src={message.content} alt="GIF" className="rounded-xl max-w-full" />
          <p className="text-[11px] text-cocoa mt-1 ml-1">{time}</p>
        </div>
      </div>
    );
  }

  // Habit completion post
  if (message.messageType === MessageType.HabitCompletion) {
    let parsed: any = {};
    try { parsed = JSON.parse(message.content); } catch {}
    return (
      <div className="animate-slide-up">
        <div className="bg-sage-light border border-sage/20 rounded-xl p-4 max-w-md mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg animate-pop">✅</span>
            <span className="font-semibold text-charcoal text-sm">{message.senderDisplayName}</span>
            <span className="text-cocoa text-sm">completed a habit!</span>
          </div>
          <div className="bg-white rounded-lg p-3 border border-sage/20">
            <p className="font-semibold text-charcoal">{message.referencedHabitName || 'Habit'}</p>
            {parsed.streak !== undefined && (
              <p className="text-sm text-amber font-medium">🔥 {parsed.streak} day streak</p>
            )}
            {parsed.photoUrl && (
              <img src={parsed.photoUrl} alt="Completion photo" className="mt-2 rounded-lg max-h-48 object-cover" />
            )}
            {parsed.note && <p className="text-sm text-cocoa mt-1 italic">{parsed.note}</p>}
          </div>
          <p className="text-[11px] text-cocoa mt-2">{time}</p>
        </div>
      </div>
    );
  }

  // Special message
  if (message.messageType === MessageType.SpecialMessage) {
    let parsed: any = {};
    try { parsed = JSON.parse(message.content); } catch {}
    const templateKey = parsed.template as keyof typeof SpecialMessageTemplate;
    const templateEnum = SpecialMessageTemplate[templateKey];
    const config = templateConfig[templateEnum] || templateConfig[SpecialMessageTemplate.LockIn];

    return (
      <div className="animate-slide-up">
        <div className={`${config.bgColor} border-l-4 ${config.borderColor} rounded-xl p-4 max-w-md mx-auto`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{config.icon}</span>
            <span className="font-bold font-display text-charcoal">{config.title}</span>
          </div>
          {message.referencedHabitName && (
            <span className="inline-block px-2 py-0.5 bg-white/60 rounded-full text-xs font-medium text-charcoal mb-1">
              for {message.referencedHabitName}
            </span>
          )}
          {parsed.caption && (
            <p className="text-sm italic text-charcoal mt-1">{parsed.caption}</p>
          )}
          <p className="text-[11px] text-cocoa mt-2">{message.senderDisplayName} · {time}</p>
        </div>
      </div>
    );
  }

  // Habit suggestion
  if (message.messageType === MessageType.HabitSuggestion && message.suggestion) {
    const s = message.suggestion;
    let payload: any = {};
    try { payload = JSON.parse(s.suggestionPayload); } catch {}

    return (
      <div className="animate-slide-up">
        <div className="bg-purple-light border-l-4 border-l-purple rounded-xl p-4 max-w-md mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">💡</span>
            <span className="font-semibold text-charcoal text-sm">
              Suggestion from {message.senderDisplayName}
            </span>
          </div>
          <span className="inline-block px-2 py-0.5 bg-purple/20 text-purple rounded-full text-xs font-semibold mb-2">
            {suggestionTypeLabels[s.suggestionType]}
          </span>
          <p className="text-sm text-charcoal mb-1">
            For: <strong>{s.targetHabitName}</strong> ({s.targetDisplayName})
          </p>

          {/* Show payload details */}
          {s.suggestionType === SuggestionType.Reword && payload.newName && (
            <p className="text-sm text-cocoa">New name: "{payload.newName}"</p>
          )}
          {s.suggestionType === SuggestionType.Split && payload.newHabits && (
            <div className="text-sm text-cocoa">
              Split into: {payload.newHabits.map((h: any) => h.name).join(', ')}
            </div>
          )}

          {/* Accept/Dismiss for target user */}
          {isTargetUser && s.status === SugStatus.Pending && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => onRespondToSuggestion?.(s.id, true)}
                className="px-3 py-1.5 bg-sage text-white rounded-lg text-sm font-semibold hover:bg-sage/90 transition-all"
              >
                Accept ✓
              </button>
              <button
                onClick={() => onRespondToSuggestion?.(s.id, false)}
                className="px-3 py-1.5 bg-stone text-cocoa rounded-lg text-sm hover:bg-border-warm transition-all"
              >
                Dismiss ✗
              </button>
            </div>
          )}

          {s.status === SugStatus.Accepted && (
            <p className="text-sm text-sage font-semibold mt-2">✓ Accepted</p>
          )}
          {s.status === SugStatus.Dismissed && (
            <p className="text-sm text-cocoa mt-2">Dismissed</p>
          )}

          <p className="text-[11px] text-cocoa mt-2">{time}</p>
        </div>
      </div>
    );
  }

  // Regular text message
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-slide-up`}>
      <div className={`max-w-[70%] ${isOwn ? '' : 'flex gap-2'}`}>
        {!isOwn && (
          <div className="w-7 h-7 rounded-full bg-amber/80 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold mt-5">
            {message.senderDisplayName[0]?.toUpperCase()}
          </div>
        )}
        <div>
          {!isOwn && (
            <p className="text-xs font-semibold text-cocoa mb-1 ml-1">{message.senderDisplayName}</p>
          )}
          <div
            className={`px-3.5 py-2.5 text-sm ${
              isOwn
                ? 'bg-bubble-own rounded-2xl rounded-br-sm text-charcoal'
                : 'bg-bubble-other rounded-2xl rounded-bl-sm text-charcoal'
            }`}
          >
            {message.content}
          </div>
          <p className={`text-[11px] text-cocoa mt-0.5 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
            {time}
          </p>
        </div>
      </div>
    </div>
  );
}
