import axios from 'axios';
import type {
  AuthResponse, Habit, Group, GroupMember, GroupHabitsResponse,
  MessagesResponse, GifResult, CompleteHabitResponse,
  HabitFrequency, DefaultVisibility,
} from '../types';

const api = axios.create({ baseURL: '/api' });

// Attach JWT token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const register = (username: string, displayName: string, password: string) =>
  api.post<AuthResponse>('/auth/register', { username, displayName, password });

export const login = (username: string, password: string) =>
  api.post<AuthResponse>('/auth/login', { username, password });

// Habits
export const getHabits = () => api.get<Habit[]>('/habits');

export const createHabit = (name: string, description: string | null, frequency: HabitFrequency, customDays: string | null) =>
  api.post<Habit>('/habits', { name, description, frequency, customDays });

export const updateHabit = (id: string, name: string, description: string | null, frequency: HabitFrequency, customDays: string | null) =>
  api.put<Habit>(`/habits/${id}`, { name, description, frequency, customDays });

export const deleteHabit = (id: string) => api.delete(`/habits/${id}`);

export const completeHabit = (id: string, photoUrl?: string, note?: string) =>
  api.post<CompleteHabitResponse>(`/habits/${id}/complete`, { photoUrl, note });

export const updateVisibility = (id: string, groupIds: string[]) =>
  api.put(`/habits/${id}/visibility`, { groupIds });

// Groups
export const getGroups = () => api.get<Group[]>('/groups');

export const createGroup = (name: string, description?: string) =>
  api.post<Group>('/groups', { name, description });

export const joinGroup = (inviteCode: string) =>
  api.post<Group>('/groups/join', { inviteCode });

export const getGroupMembers = (groupId: string) =>
  api.get<GroupMember[]>(`/groups/${groupId}/members`);

export const getGroupHabits = (groupId: string) =>
  api.get<GroupHabitsResponse[]>(`/groups/${groupId}/habits`);

export const getGroupMessages = (groupId: string, before?: string) =>
  api.get<MessagesResponse>(`/groups/${groupId}/messages`, { params: { before } });

export const leaveGroup = (groupId: string) =>
  api.post(`/groups/${groupId}/leave`);

export const deleteGroup = (groupId: string) =>
  api.delete(`/groups/${groupId}`);

// GIF
export const searchGifs = (q: string) =>
  api.get<GifResult[]>('/gif/search', { params: { q, limit: 20 } });

// Upload
export const uploadPhoto = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post<{ url: string }>('/upload/photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// User settings
export const getSettings = () => api.get<{ defaultVisibility: DefaultVisibility }>('/user/settings');
export const updateSettings = (defaultVisibility: DefaultVisibility) =>
  api.put<{ defaultVisibility: DefaultVisibility }>('/user/settings', { defaultVisibility });

export default api;
