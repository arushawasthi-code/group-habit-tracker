export enum HabitFrequency {
  Daily = 0,
  Weekly = 1,
  Custom = 2,
}

export enum DefaultVisibility {
  HideAll = 0,
  ShareAll = 1,
}

export enum MessageType {
  Text = 0,
  Gif = 1,
  HabitCompletion = 2,
  SpecialMessage = 3,
  HabitSuggestion = 4,
}

export enum SpecialMessageTemplate {
  LockIn = 0,
  YouCanDoThis = 1,
  StopBeingLazy = 2,
}

export enum SuggestionType {
  Split = 0,
  Combine = 1,
  Reword = 2,
}

export enum SuggestionStatus {
  Pending = 0,
  Accepted = 1,
  Dismissed = 2,
}

export interface AuthResponse {
  userId: string;
  displayName: string;
  token: string;
}

export interface HabitVisibilityInfo {
  groupId: string;
  groupName: string;
}

export interface Habit {
  id: string;
  name: string;
  description: string | null;
  frequency: HabitFrequency;
  customDays: string | null;
  currentStreak: number;
  longestStreak: number;
  completedToday: boolean;
  visibility: HabitVisibilityInfo[];
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  memberCount: number;
  isCreator: boolean;
}

export interface GroupMember {
  userId: string;
  displayName: string;
  joinedAt: string;
}

export interface SharedHabitInfo {
  id: string;
  name: string;
  frequency: HabitFrequency;
  currentStreak: number;
  completedToday: boolean;
}

export interface GroupHabitsResponse {
  userId: string;
  displayName: string;
  habits: SharedHabitInfo[];
}

export interface HabitSuggestionResponse {
  id: string;
  targetUserId: string;
  targetDisplayName: string;
  targetHabitId: string;
  targetHabitName: string;
  suggestionType: SuggestionType;
  suggestionPayload: string;
  status: SuggestionStatus;
}

export interface ChatMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderDisplayName: string;
  messageType: MessageType;
  content: string;
  referencedHabitId: string | null;
  referencedHabitName: string | null;
  createdAt: string;
  suggestion: HabitSuggestionResponse | null;
}

export interface MessagesResponse {
  messages: ChatMessage[];
  hasMore: boolean;
}

export interface GifResult {
  id: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
}

export interface CompleteHabitResponse {
  completedDate: string;
  currentStreak: number;
  longestStreak: number;
}
