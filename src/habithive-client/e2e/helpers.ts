import { type Page, type Browser, type BrowserContext } from '@playwright/test';
import * as signalR from '@microsoft/signalr';

export const API_BASE = 'http://localhost:5000/api';
const HUB_URL = 'http://localhost:5000/hubs/chat';

// ─── Unique test user ────────────────────────────────────────────────────────
// Use last 8 digits of timestamp as seed to keep usernames ≤ 10 chars,
// well within the API's 20-character username limit.

let _counter = Date.now() % 100_000_000;

export function uniqueUser() {
  _counter++;
  return {
    username: `u${_counter}`,
    displayName: `User ${_counter}`,
    password: 'Password123',
  };
}

// ─── Auth helper ─────────────────────────────────────────────────────────────

/** Register + login via API, inject token into localStorage, reload page. */
export async function loginAs(
  page: Page,
  user: { username: string; displayName: string; password: string },
): Promise<{ token: string; displayName: string; userId: string }> {
  await page.request
    .post(`${API_BASE}/auth/register`, {
      data: { username: user.username, displayName: user.displayName, password: user.password },
    })
    .catch(() => {});

  const res = await page.request.post(`${API_BASE}/auth/login`, {
    data: { username: user.username, password: user.password },
  });
  const { token, displayName, userId } = await res.json();

  await page.goto('/');
  await page.evaluate((t) => localStorage.setItem('token', t), token);
  await page.reload();
  return { token, displayName, userId };
}

// ─── Raw API helpers (use from test setup / teardown) ────────────────────────

async function apiFetch(path: string, token: string, method = 'GET', body?: object) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${method} ${path} → ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function createGroupViaAPI(
  token: string,
  name: string,
  description?: string,
): Promise<{ id: string; inviteCode: string; name: string }> {
  return apiFetch('/groups', token, 'POST', { name, description });
}

export async function joinGroupViaAPI(token: string, inviteCode: string) {
  return apiFetch('/groups/join', token, 'POST', { inviteCode });
}

export async function createHabitViaAPI(
  token: string,
  name: string,
  frequency = 0,
  customDays?: string,
) {
  return apiFetch('/habits', token, 'POST', { name, frequency, customDays });
}

export async function shareHabitViaAPI(token: string, habitId: string, groupIds: string[]) {
  return apiFetch(`/habits/${habitId}/visibility`, token, 'PUT', { groupIds });
}

export async function getGroupsViaAPI(token: string) {
  return apiFetch('/groups', token);
}

export async function getHabitsViaAPI(token: string) {
  return apiFetch('/habits', token);
}

export async function completeHabitViaAPI(token: string, habitId: string) {
  return apiFetch(`/habits/${habitId}/complete`, token, 'POST', {});
}

export async function leaveGroupViaAPI(token: string, groupId: string) {
  return apiFetch(`/groups/${groupId}/leave`, token, 'POST', {});
}

// ─── SignalR helper (Node.js) ─────────────────────────────────────────────────

/**
 * Opens a short-lived SignalR connection, runs `callback`, then closes.
 * Used for test setup that requires sending hub messages (e.g., suggestions)
 * before a UI flow can be tested.
 */
async function withHub(
  token: string,
  callback: (conn: signalR.HubConnection) => Promise<void>,
): Promise<void> {
  const conn = new signalR.HubConnectionBuilder()
    .withUrl(`${HUB_URL}?access_token=${token}`)
    .configureLogging(signalR.LogLevel.Error)
    .build();

  await conn.start();
  try {
    await callback(conn);
    // small wait to allow server-side broadcast to complete
    await new Promise((r) => setTimeout(r, 200));
  } finally {
    await conn.stop();
  }
}

export async function sendTextMessageViaHub(
  token: string,
  groupId: string,
  content: string,
): Promise<void> {
  await withHub(token, async (conn) => {
    await conn.invoke('JoinGroup', groupId);
    await conn.invoke('SendMessage', groupId, { type: 0, content, referencedHabitId: null });
  });
}

export async function sendSuggestionViaHub(
  token: string,
  groupId: string,
  targetHabitId: string,
  suggestionType: number, // 0=Split, 1=Combine, 2=Reword
  suggestionPayload: object,
): Promise<void> {
  await withHub(token, async (conn) => {
    await conn.invoke('JoinGroup', groupId);
    await conn.invoke('SendHabitSuggestion', groupId, {
      targetHabitId,
      suggestionType,
      suggestionPayload: JSON.stringify(suggestionPayload),
    });
  });
}

export async function sendSpecialMessageViaHub(
  token: string,
  groupId: string,
  template: number, // 0=LockIn, 1=YouCanDoThis, 2=StopBeingLazy
  targetHabitId: string,
  caption?: string,
): Promise<void> {
  await withHub(token, async (conn) => {
    await conn.invoke('JoinGroup', groupId);
    await conn.invoke('SendSpecialMessage', groupId, {
      template,
      targetHabitId,
      caption: caption ?? null,
    });
  });
}

// ─── Multi-user group setup ───────────────────────────────────────────────────

export interface UserSession {
  page: Page;
  context: BrowserContext;
  token: string;
  userId: string;
  username: string;
  displayName: string;
}

/**
 * Creates two users in isolated browser contexts, both joined to a shared group.
 * User A creates the group; User B joins via invite code.
 * Both pages are navigated to '/'.
 * Caller MUST close both contexts after the test.
 */
export async function setupTwoUsersInGroup(
  browser: Browser,
  groupName: string,
): Promise<{
  userA: UserSession;
  userB: UserSession;
  groupId: string;
  inviteCode: string;
}> {
  const rawA = uniqueUser();
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  const { token: tokenA, userId: userIdA } = await loginAs(pageA, rawA);

  const group = await createGroupViaAPI(tokenA, groupName);
  const groupId = group.id;
  const inviteCode = group.inviteCode;

  const rawB = uniqueUser();
  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  const { token: tokenB, userId: userIdB } = await loginAs(pageB, rawB);
  await joinGroupViaAPI(tokenB, inviteCode);
  await pageB.reload();
  // Reload User A's page so it reflects the created group and the joined member count
  await pageA.reload();

  return {
    userA: { page: pageA, context: contextA, token: tokenA, userId: userIdA, username: rawA.username, displayName: rawA.displayName },
    userB: { page: pageB, context: contextB, token: tokenB, userId: userIdB, username: rawB.username, displayName: rawB.displayName },
    groupId,
    inviteCode,
  };
}

// ─── UI navigation helpers ────────────────────────────────────────────────────

/** Navigate to a group and ensure the Chat tab is visible. */
export async function navigateToGroupChat(page: Page, groupName: string) {
  await page.locator('button').filter({ hasText: groupName }).first().click();
  // Chat is the default tab — just wait for the input to be visible
  await page.getByPlaceholder('Type a message...').waitFor({ state: 'visible' });
}

/** Navigate to a group and switch to the Members & Habits tab. */
export async function navigateToGroupMembers(page: Page, groupName: string) {
  await page.locator('button').filter({ hasText: groupName }).first().click();
  await page.getByRole('button', { name: 'Members & Habits' }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Members & Habits' }).click();
}

/** Open new habit modal, fill in name, and submit. Returns after modal closes. */
export async function createHabitViaUI(page: Page, name: string, description?: string) {
  await page.getByRole('button', { name: '+ New Habit' }).click();
  await page.getByPlaceholder('e.g., Morning run').fill(name);
  if (description) {
    await page.getByPlaceholder('Optional details').fill(description);
  }
  await page.getByRole('button', { name: 'Create Habit' }).click();
  await page.getByText(name).waitFor({ state: 'visible' });
}
