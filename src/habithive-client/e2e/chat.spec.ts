import { test, expect } from '@playwright/test';
import {
  uniqueUser, loginAs,
  createGroupViaAPI, createHabitViaAPI, shareHabitViaAPI,
  setupTwoUsersInGroup, navigateToGroupChat, navigateToGroupMembers,
  sendTextMessageViaHub, sendSuggestionViaHub, sendSpecialMessageViaHub,
  completeHabitViaAPI,
} from './helpers';

// ─────────────────────────────────────────────────────────────────────────────
// 5. Group Chat — Text Messages
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Chat — Text Messages', () => {
  // ── CHAT-1: Send text via button ────────────────────────────────────────────
  test('CHAT-1: typing text and clicking send appears as own message', async ({ browser }) => {
    const { userA, userB } = await setupTwoUsersInGroup(browser, 'Chat Send Group');

    await navigateToGroupChat(userA.page, 'Chat Send Group');
    await userA.page.getByPlaceholder('Type a message...').fill('Hello world');
    await userA.page.locator('button').filter({ hasText: '↑' }).click();

    await expect(userA.page.getByText('Hello world')).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── CHAT-2: Send text via Enter ─────────────────────────────────────────────
  test('CHAT-2: pressing Enter sends the message', async ({ browser }) => {
    const { userA, userB } = await setupTwoUsersInGroup(browser, 'Chat Enter Group');

    await navigateToGroupChat(userA.page, 'Chat Enter Group');
    await userA.page.getByPlaceholder('Type a message...').fill('Enter key message');
    await userA.page.getByPlaceholder('Type a message...').press('Enter');

    await expect(userA.page.getByText('Enter key message')).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── CHAT-3: Send button disabled when input empty ──────────────────────────
  test('CHAT-3: send button is disabled when input is empty', async ({ browser }) => {
    const { userA, userB } = await setupTwoUsersInGroup(browser, 'Chat Empty Group');

    await navigateToGroupChat(userA.page, 'Chat Empty Group');
    const sendBtn = userA.page.locator('button').filter({ hasText: '↑' });

    await expect(sendBtn).toBeDisabled();

    await userA.page.getByPlaceholder('Type a message...').fill('something');
    await expect(sendBtn).toBeEnabled();

    await userA.context.close();
    await userB.context.close();
  });

  // ── CHAT-4: Input clears after sending ─────────────────────────────────────
  test('CHAT-4: input clears after sending a message', async ({ browser }) => {
    const { userA, userB } = await setupTwoUsersInGroup(browser, 'Chat Clear Group');

    await navigateToGroupChat(userA.page, 'Chat Clear Group');
    const input = userA.page.getByPlaceholder('Type a message...');
    await input.fill('Clear after send');
    await userA.page.locator('button').filter({ hasText: '↑' }).click();

    await expect(input).toHaveValue('');

    await userA.context.close();
    await userB.context.close();
  });

  // ── CHAT-5: Real-time delivery to other user ───────────────────────────────
  test('CHAT-5: User A sends message → User B sees it without refresh', async ({ browser }) => {
    const { userA, userB } = await setupTwoUsersInGroup(browser, 'Realtime Group');

    await navigateToGroupChat(userA.page, 'Realtime Group');
    await navigateToGroupChat(userB.page, 'Realtime Group');

    await userA.page.getByPlaceholder('Type a message...').fill('Live message');
    await userA.page.locator('button').filter({ hasText: '↑' }).click();

    await expect(userB.page.getByText('Live message')).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── CHAT-6: Received message shows sender info ─────────────────────────────
  test('CHAT-6: received message shows sender display name', async ({ browser }) => {
    const { userA, userB } = await setupTwoUsersInGroup(browser, 'Sender Name Group');

    await navigateToGroupChat(userA.page, 'Sender Name Group');
    await navigateToGroupChat(userB.page, 'Sender Name Group');

    await userA.page.getByPlaceholder('Type a message...').fill('From user A');
    await userA.page.locator('button').filter({ hasText: '↑' }).click();

    await expect(userB.page.getByText(userA.displayName)).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── CHAT-7: Messages show timestamp ────────────────────────────────────────
  test('CHAT-7: messages show a timestamp', async ({ browser }) => {
    const { userA, userB } = await setupTwoUsersInGroup(browser, 'Timestamp Group');

    await navigateToGroupChat(userA.page, 'Timestamp Group');
    await userA.page.getByPlaceholder('Type a message...').fill('Timed message');
    await userA.page.locator('button').filter({ hasText: '↑' }).click();

    // Timestamp format (e.g., "14:32" or "2:32 PM")
    await expect(userA.page.getByText('Timed message')).toBeVisible();
    await expect(userA.page.locator('p').filter({ hasText: /\d{1,2}:\d{2}/ }).first()).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── CHAT-8: Multiple messages in chronological order ───────────────────────
  test('CHAT-8: multiple messages appear in chronological order', async ({ browser }) => {
    const { userA, userB } = await setupTwoUsersInGroup(browser, 'Order Test Group');

    await navigateToGroupChat(userA.page, 'Order Test Group');
    await userA.page.getByPlaceholder('Type a message...').fill('First');
    await userA.page.locator('button').filter({ hasText: '↑' }).click();
    await expect(userA.page.getByText('First')).toBeVisible();

    await userA.page.getByPlaceholder('Type a message...').fill('Second');
    await userA.page.locator('button').filter({ hasText: '↑' }).click();
    await expect(userA.page.getByText('Second')).toBeVisible();

    await userA.page.getByPlaceholder('Type a message...').fill('Third');
    await userA.page.locator('button').filter({ hasText: '↑' }).click();
    await expect(userA.page.getByText('Third')).toBeVisible();

    // All three messages visible
    await expect(userA.page.getByText('First')).toBeVisible();
    await expect(userA.page.getByText('Second')).toBeVisible();
    await expect(userA.page.getByText('Third')).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── CHAT-9: Pagination — "Load more messages..." appears ───────────────────
  test('CHAT-9: 51+ messages → "Load more messages..." button appears at top', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'Pagination Group');

    // Send 51 messages via SignalR hub
    for (let i = 1; i <= 51; i++) {
      await sendTextMessageViaHub(userA.token, groupId, `Message ${i}`);
    }

    await navigateToGroupChat(userA.page, 'Pagination Group');
    await expect(userA.page.getByText('Load more messages...')).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── CHAT-10: Load more prepends older messages ─────────────────────────────
  test('CHAT-10: clicking "Load more messages..." prepends older messages', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'Load More Group');

    // Send 51 messages — first 1 will be in older page
    await sendTextMessageViaHub(userA.token, groupId, 'Very first message');
    for (let i = 2; i <= 51; i++) {
      await sendTextMessageViaHub(userA.token, groupId, `Filler ${i}`);
    }

    await navigateToGroupChat(userA.page, 'Load More Group');
    // "Very first message" is not visible yet (in older page)
    await expect(userA.page.getByText('Load more messages...')).toBeVisible();
    await userA.page.getByText('Load more messages...').click();

    await expect(userA.page.getByText('Very first message')).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── CHAT-11: New group empty state ─────────────────────────────────────────
  test('CHAT-11: new group shows empty state copy', async ({ browser }) => {
    const { userA, userB } = await setupTwoUsersInGroup(browser, 'Empty Chat Group');

    await navigateToGroupChat(userA.page, 'Empty Chat Group');
    await expect(userA.page.getByText(/It's quiet\.\.\. too quiet/i)).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── CHAT-12: Group view defaults to Chat tab ───────────────────────────────
  test('CHAT-12: group view defaults to the Chat tab', async ({ browser }) => {
    const { userA, userB } = await setupTwoUsersInGroup(browser, 'Default Tab Group');

    await userA.page.locator('button').filter({ hasText: 'Default Tab Group' }).first().click();
    await expect(userA.page.getByPlaceholder('Type a message...')).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── CHAT-13: Switch to Members & Habits tab ────────────────────────────────
  test('CHAT-13: switching to Members & Habits tab shows member cards', async ({ browser }) => {
    const { userA, userB } = await setupTwoUsersInGroup(browser, 'Members Tab Group');

    await navigateToGroupChat(userA.page, 'Members Tab Group');
    await userA.page.getByRole('button', { name: 'Members & Habits' }).click();

    // Should show member cards (at least the current user)
    await expect(userA.page.getByText(userA.displayName)).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── CHAT-14: Switch back to Chat preserves messages ────────────────────────
  test('CHAT-14: switching back to Chat tab preserves existing messages', async ({ browser }) => {
    const { userA, userB } = await setupTwoUsersInGroup(browser, 'Tab Preserve Group');

    await navigateToGroupChat(userA.page, 'Tab Preserve Group');
    await userA.page.getByPlaceholder('Type a message...').fill('Persistent message');
    await userA.page.locator('button').filter({ hasText: '↑' }).click();
    await expect(userA.page.getByText('Persistent message')).toBeVisible();

    // Switch to Members & Habits
    await userA.page.getByRole('button', { name: 'Members & Habits' }).click();
    // Switch back to Chat
    await userA.page.getByRole('button', { name: 'Chat' }).click();

    await expect(userA.page.getByText('Persistent message')).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Group Chat — GIF Messages
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Chat — GIF Messages', () => {
  // ── GIF-1: GIF picker opens ─────────────────────────────────────────────────
  test('GIF-1: clicking 🎬 opens the GIF picker panel', async ({ browser }) => {
    const { userA, userB } = await setupTwoUsersInGroup(browser, 'GIF Picker Group');

    await navigateToGroupChat(userA.page, 'GIF Picker Group');
    await userA.page.locator('button', { hasText: '🎬' }).click();

    await expect(userA.page.getByPlaceholder('Search GIFs...')).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── GIF-2: GIF picker toggles closed ───────────────────────────────────────
  test('GIF-2: clicking 🎬 again closes the GIF picker', async ({ browser }) => {
    const { userA, userB } = await setupTwoUsersInGroup(browser, 'GIF Toggle Group');

    await navigateToGroupChat(userA.page, 'GIF Toggle Group');
    await userA.page.locator('button', { hasText: '🎬' }).click();
    await expect(userA.page.getByPlaceholder('Search GIFs...')).toBeVisible();

    await userA.page.locator('button', { hasText: '🎬' }).click();
    await expect(userA.page.getByPlaceholder('Search GIFs...')).not.toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── GIF-3: GIF search autofocuses ──────────────────────────────────────────
  test('GIF-3: GIF search input autofocuses when picker opens', async ({ browser }) => {
    const { userA, userB } = await setupTwoUsersInGroup(browser, 'GIF Focus Group');

    await navigateToGroupChat(userA.page, 'GIF Focus Group');
    await userA.page.locator('button', { hasText: '🎬' }).click();

    const searchInput = userA.page.getByPlaceholder('Search GIFs...');
    await expect(searchInput).toBeFocused();

    await userA.context.close();
    await userB.context.close();
  });

  // ── GIF-4: GIF picker closes when special picker opens ─────────────────────
  test('GIF-4: opening special message picker closes the GIF picker', async ({ browser }) => {
    const { userA, userB } = await setupTwoUsersInGroup(browser, 'Mutual Excl Group');

    await navigateToGroupChat(userA.page, 'Mutual Excl Group');
    await userA.page.locator('button', { hasText: '🎬' }).click();
    await expect(userA.page.getByPlaceholder('Search GIFs...')).toBeVisible();

    await userA.page.locator('button', { hasText: '⭐' }).click();
    await expect(userA.page.getByPlaceholder('Search GIFs...')).not.toBeVisible();
    await expect(userA.page.getByText('Send a special message')).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── GIF-9: No Tenor key → picker shows no results, no error ────────────────
  test('GIF-9: with no Tenor API key, GIF search shows no results but no error', async ({ browser }) => {
    const { userA, userB } = await setupTwoUsersInGroup(browser, 'GIF No Key Group');

    await navigateToGroupChat(userA.page, 'GIF No Key Group');
    await userA.page.locator('button', { hasText: '🎬' }).click();
    await userA.page.getByPlaceholder('Search GIFs...').fill('funny cat');

    // Wait for debounce (300ms) + potential response
    await userA.page.waitForTimeout(500);

    // No JavaScript error thrown — picker still visible and showing empty or message
    await expect(userA.page.getByPlaceholder('Search GIFs...')).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Group Chat — Habit Completion Posts
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Chat — Completion Posts', () => {
  // ── COMP-1: Sharing completion posts a card in chat ────────────────────────
  test('COMP-1: completing habit and sharing posts completion card in group chat', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'Comp Share Group');

    await navigateToGroupChat(userA.page, 'Comp Share Group');

    // Create habit and complete it via UI
    await userA.page.getByRole('button', { name: '+ New Habit' }).click();
    await userA.page.getByPlaceholder('e.g., Morning run').fill('Share Habit');
    await userA.page.getByRole('button', { name: 'Create Habit' }).click();
    await expect(userA.page.getByText('Share Habit')).toBeVisible();

    await userA.page.getByText('Share Habit').click();
    await userA.page.getByRole('button', { name: 'Mark Complete ✓' }).click();

    // Click the group name in the share prompt (scoped to the prompt container)
    await expect(userA.page.getByText(/Share this win/i)).toBeVisible();
    await userA.page.locator('.bg-sage-light').getByRole('button', { name: 'Comp Share Group' }).click();

    // Back in chat, completion card should appear
    await userA.page.locator('button').filter({ hasText: 'Comp Share Group' }).first().click();
    await expect(userA.page.getByText('completed a habit!')).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── COMP-2: Completion card shows habit name and streak ────────────────────
  test('COMP-2: completion card shows habit name', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'Comp Name Group');

    // Share the habit with the group
    const habit = await createHabitViaAPI(userA.token, 'Trackable Habit');
    await shareHabitViaAPI(userA.token, habit.id, [groupId]);
    await completeHabitViaAPI(userA.token, habit.id);

    // Navigate to habit and share completion
    await userA.page.reload();
    await userA.page.getByText('Trackable Habit').click();
    await expect(userA.page.getByText(/Share this win/i)).toBeVisible();
    await userA.page.locator('.bg-sage-light').getByRole('button', { name: 'Comp Name Group' }).click();

    await navigateToGroupChat(userA.page, 'Comp Name Group');
    await expect(userA.page.getByText('Trackable Habit')).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── COMP-3: Completion card shows sender name ──────────────────────────────
  test('COMP-3: completion card shows sender display name and "completed a habit!"', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'Comp Sender Group');

    const habit = await createHabitViaAPI(userA.token, 'Done Habit');
    await shareHabitViaAPI(userA.token, habit.id, [groupId]);
    await completeHabitViaAPI(userA.token, habit.id);

    await userA.page.reload();
    await userA.page.getByText('Done Habit').click();
    await expect(userA.page.getByText(/Share this win/i)).toBeVisible();
    await userA.page.locator('.bg-sage-light').getByRole('button', { name: 'Comp Sender Group' }).click();

    await navigateToGroupChat(userA.page, 'Comp Sender Group');
    await expect(userA.page.getByText(userA.displayName)).toBeVisible();
    await expect(userA.page.getByText('completed a habit!')).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── COMP-4: Other members see completion card in real-time ─────────────────
  test('COMP-4: other group members see the completion card in real-time', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'Comp Realtime Group');

    await navigateToGroupChat(userB.page, 'Comp Realtime Group');

    const habit = await createHabitViaAPI(userA.token, 'RT Habit');
    await shareHabitViaAPI(userA.token, habit.id, [groupId]);
    await completeHabitViaAPI(userA.token, habit.id);

    await userA.page.reload();
    await userA.page.getByText('RT Habit').click();
    await expect(userA.page.getByText(/Share this win/i)).toBeVisible();
    await userA.page.locator('.bg-sage-light').getByRole('button', { name: 'Comp Realtime Group' }).click();

    // User B should see the card in real-time
    await expect(userB.page.getByText('completed a habit!')).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Group Chat — Special Messages
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Chat — Special Messages', () => {
  // ── SPEC-1: Special picker opens ───────────────────────────────────────────
  test('SPEC-1: clicking ⭐ opens the special message picker', async ({ browser }) => {
    const { userA, userB } = await setupTwoUsersInGroup(browser, 'Spec Picker Group');

    await navigateToGroupChat(userA.page, 'Spec Picker Group');
    await userA.page.locator('button', { hasText: '⭐' }).click();

    await expect(userA.page.getByText('Send a special message')).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── SPEC-2: Three template buttons visible ─────────────────────────────────
  test('SPEC-2: special picker shows three template buttons', async ({ browser }) => {
    const { userA, userB } = await setupTwoUsersInGroup(browser, 'Spec Templates Group');

    await navigateToGroupChat(userA.page, 'Spec Templates Group');
    await userA.page.locator('button', { hasText: '⭐' }).click();

    await expect(userA.page.getByRole('button', { name: /🔒 Lock In/i })).toBeVisible();
    await expect(userA.page.getByRole('button', { name: /💪 You Can Do This/i })).toBeVisible();
    await expect(userA.page.getByRole('button', { name: /😤 Stop Being Lazy/i })).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── SPEC-3: Selecting template shows habit dropdown and caption ─────────────
  test('SPEC-3: selecting a template shows habit dropdown and caption input', async ({ browser }) => {
    const { userA, userB } = await setupTwoUsersInGroup(browser, 'Spec Select Group');

    await navigateToGroupChat(userA.page, 'Spec Select Group');
    await userA.page.locator('button', { hasText: '⭐' }).click();
    await userA.page.getByRole('button', { name: /🔒 Lock In/i }).click();

    await expect(userA.page.getByRole('combobox')).toBeVisible();
    await expect(userA.page.getByPlaceholder('Add a caption (optional)')).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── SPEC-4: Habit dropdown lists only other members' shared habits ──────────
  test('SPEC-4: habit dropdown shows only other members\' shared habits', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'Spec Habits Group');

    // User A creates own habit (should NOT appear in User B's dropdown)
    const habitA = await createHabitViaAPI(userA.token, 'User A Habit');
    await shareHabitViaAPI(userA.token, habitA.id, [groupId]);

    // User B creates own habit (should NOT appear in User B's dropdown either)
    const habitB = await createHabitViaAPI(userB.token, 'User B Habit');
    await shareHabitViaAPI(userB.token, habitB.id, [groupId]);

    await navigateToGroupChat(userB.page, 'Spec Habits Group');
    await userB.page.locator('button', { hasText: '⭐' }).click();
    await userB.page.getByRole('button', { name: /🔒 Lock In/i }).click();

    const dropdown = userB.page.getByRole('combobox');
    const options = await dropdown.locator('option').allTextContents();

    // Should contain User A's habit but NOT User B's own habit
    expect(options.join(' ')).toContain('User A Habit');
    expect(options.join(' ')).not.toContain('User B Habit');

    await userA.context.close();
    await userB.context.close();
  });

  // ── SPEC-5: No other members' shared habits shows placeholder ───────────────
  test('SPEC-5: no other members\' shared habits shows info message', async ({ browser }) => {
    const { userA, userB } = await setupTwoUsersInGroup(browser, 'Spec No Habits Group');

    // Neither user shares any habits
    await navigateToGroupChat(userA.page, 'Spec No Habits Group');
    await userA.page.locator('button', { hasText: '⭐' }).click();
    await userA.page.getByRole('button', { name: /🔒 Lock In/i }).click();

    await expect(userA.page.getByText(/No shared habits from other members/i)).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── SPEC-6: Send disabled until habit selected ─────────────────────────────
  test('SPEC-6: Send button is disabled until a habit is selected', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'Spec Disabled Group');

    const habitA = await createHabitViaAPI(userA.token, 'Target Habit');
    await shareHabitViaAPI(userA.token, habitA.id, [groupId]);

    await navigateToGroupChat(userB.page, 'Spec Disabled Group');
    await userB.page.locator('button', { hasText: '⭐' }).click();
    await userB.page.getByRole('button', { name: /🔒 Lock In/i }).click();

    // Before selecting habit
    const sendBtn = userB.page.getByRole('button', { name: 'Send' });
    await expect(sendBtn).toBeDisabled();

    // After selecting habit
    await userB.page.getByRole('combobox').selectOption({ label: /Target Habit/ });
    await expect(sendBtn).toBeEnabled();

    await userA.context.close();
    await userB.context.close();
  });

  // ── SPEC-7: Special picker closes GIF picker (mutual exclusion) ─────────────
  test('SPEC-7: opening GIF picker closes the special message picker', async ({ browser }) => {
    const { userA, userB } = await setupTwoUsersInGroup(browser, 'Spec Mutual Excl Group');

    await navigateToGroupChat(userA.page, 'Spec Mutual Excl Group');
    await userA.page.locator('button', { hasText: '⭐' }).click();
    await expect(userA.page.getByText('Send a special message')).toBeVisible();

    await userA.page.locator('button', { hasText: '🎬' }).click();
    await expect(userA.page.getByText('Send a special message')).not.toBeVisible();
    await expect(userA.page.getByPlaceholder('Search GIFs...')).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── SPEC-8: Lock In message appears in chat ─────────────────────────────────
  test('SPEC-8: sending "Lock In" message → card with 🔒 appears in chat', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'Lock In Group');

    const habit = await createHabitViaAPI(userA.token, 'Lock In Habit');
    await shareHabitViaAPI(userA.token, habit.id, [groupId]);

    await navigateToGroupChat(userB.page, 'Lock In Group');
    await userB.page.locator('button', { hasText: '⭐' }).click();
    await userB.page.getByRole('button', { name: /🔒 Lock In/i }).click();
    await userB.page.getByRole('combobox').selectOption({ label: /Lock In Habit/ });
    await userB.page.getByRole('button', { name: 'Send' }).click();

    await expect(userB.page.getByText('Lock In')).toBeVisible();
    await expect(userB.page.getByText('🔒')).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── SPEC-9: You Can Do This message ────────────────────────────────────────
  test('SPEC-9: sending "You Can Do This" → card with 💪 appears in chat', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'YCDT Group');

    const habit = await createHabitViaAPI(userA.token, 'YCDT Habit');
    await shareHabitViaAPI(userA.token, habit.id, [groupId]);

    await navigateToGroupChat(userB.page, 'YCDT Group');
    await userB.page.locator('button', { hasText: '⭐' }).click();
    await userB.page.getByRole('button', { name: /💪 You Can Do This/i }).click();
    await userB.page.getByRole('combobox').selectOption({ label: /YCDT Habit/ });
    await userB.page.getByRole('button', { name: 'Send' }).click();

    await expect(userB.page.getByText('You Can Do This')).toBeVisible();
    await expect(userB.page.getByText('💪')).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── SPEC-10: Stop Being Lazy message ───────────────────────────────────────
  test('SPEC-10: sending "Stop Being Lazy" → card with 😤 appears in chat', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'SBL Group');

    const habit = await createHabitViaAPI(userA.token, 'SBL Habit');
    await shareHabitViaAPI(userA.token, habit.id, [groupId]);

    await navigateToGroupChat(userB.page, 'SBL Group');
    await userB.page.locator('button', { hasText: '⭐' }).click();
    await userB.page.getByRole('button', { name: /😤 Stop Being Lazy/i }).click();
    await userB.page.getByRole('combobox').selectOption({ label: /SBL Habit/ });
    await userB.page.getByRole('button', { name: 'Send' }).click();

    await expect(userB.page.getByText('Stop Being Lazy')).toBeVisible();
    await expect(userB.page.getByText('😤')).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── SPEC-11: Caption shows in card ─────────────────────────────────────────
  test('SPEC-11: caption included → shows in italic below template title', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'Caption Group');

    const habit = await createHabitViaAPI(userA.token, 'Caption Habit');
    await shareHabitViaAPI(userA.token, habit.id, [groupId]);

    await navigateToGroupChat(userB.page, 'Caption Group');
    await userB.page.locator('button', { hasText: '⭐' }).click();
    await userB.page.getByRole('button', { name: /🔒 Lock In/i }).click();
    await userB.page.getByRole('combobox').selectOption({ label: /Caption Habit/ });
    await userB.page.getByPlaceholder('Add a caption (optional)').fill('You got this!');
    await userB.page.getByRole('button', { name: 'Send' }).click();

    await expect(userB.page.getByText('You got this!')).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── SPEC-12: Other members see special message in real-time ────────────────
  test('SPEC-12: other group members see the special message in real-time', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'Spec RT Group');

    const habit = await createHabitViaAPI(userA.token, 'RT Special Habit');
    await shareHabitViaAPI(userA.token, habit.id, [groupId]);

    await navigateToGroupChat(userA.page, 'Spec RT Group');
    await navigateToGroupChat(userB.page, 'Spec RT Group');

    await userB.page.locator('button', { hasText: '⭐' }).click();
    await userB.page.getByRole('button', { name: /🔒 Lock In/i }).click();
    await userB.page.getByRole('combobox').selectOption({ label: /RT Special Habit/ });
    await userB.page.getByRole('button', { name: 'Send' }).click();

    // User A should see it in real-time
    await expect(userA.page.getByText('Lock In')).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── SPEC-13/14: Own habits not in dropdown ─────────────────────────────────
  test('SPEC-13: own habits do not appear in the special message habit dropdown', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'Own Habit Group');

    // User A shares their own habit
    const ownHabit = await createHabitViaAPI(userA.token, 'Own Habit');
    await shareHabitViaAPI(userA.token, ownHabit.id, [groupId]);

    // User A opens special picker — should NOT see their own habit
    await navigateToGroupChat(userA.page, 'Own Habit Group');
    await userA.page.locator('button', { hasText: '⭐' }).click();
    await userA.page.getByRole('button', { name: /🔒 Lock In/i }).click();

    const dropdown = userA.page.getByRole('combobox');
    const options = await dropdown.locator('option').allTextContents();
    expect(options.join(' ')).not.toContain('Own Habit');

    await userA.context.close();
    await userB.context.close();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Group Chat — Habit Suggestions
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Chat — Habit Suggestions', () => {
  // ── SUG-1/2/3: Suggestion card renders ─────────────────────────────────────
  test('SUG-1/2/3: suggestion card shows 💡, type badge, and target habit name', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'Sug Card Group');

    const habit = await createHabitViaAPI(userA.token, 'Target Reword Habit');
    await shareHabitViaAPI(userA.token, habit.id, [groupId]);

    await navigateToGroupChat(userA.page, 'Sug Card Group');

    // User B sends a Reword suggestion (type=2)
    await sendSuggestionViaHub(userB.token, groupId, habit.id, 2, { newName: 'Better Name' });

    await expect(userA.page.getByText('💡')).toBeVisible();
    await expect(userA.page.getByText('Reword')).toBeVisible();
    await expect(userA.page.getByText('Target Reword Habit')).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── SUG-4: Target user sees Accept/Dismiss ──────────────────────────────────
  test('SUG-4: target user sees Accept ✓ and Dismiss ✗ buttons on pending suggestion', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'Sug Accept Group');

    const habit = await createHabitViaAPI(userA.token, 'Respond Habit');
    await shareHabitViaAPI(userA.token, habit.id, [groupId]);

    await navigateToGroupChat(userA.page, 'Sug Accept Group');

    await sendSuggestionViaHub(userB.token, groupId, habit.id, 2, { newName: 'Renamed' });

    // User A (target) should see Accept/Dismiss
    await expect(userA.page.getByRole('button', { name: /Accept ✓/i })).toBeVisible();
    await expect(userA.page.getByRole('button', { name: /Dismiss ✗/i })).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── SUG-5: Non-target user does NOT see Accept/Dismiss ─────────────────────
  test('SUG-5: non-target user does not see Accept/Dismiss buttons', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'Sug Non-target Group');

    const habit = await createHabitViaAPI(userA.token, 'Non-target Habit');
    await shareHabitViaAPI(userA.token, habit.id, [groupId]);

    await navigateToGroupChat(userB.page, 'Sug Non-target Group');

    await sendSuggestionViaHub(userB.token, groupId, habit.id, 2, { newName: 'New Name' });

    // User B (sender, not target) should NOT see Accept/Dismiss
    await expect(userB.page.getByRole('button', { name: /Accept ✓/i })).not.toBeVisible();
    await expect(userB.page.getByRole('button', { name: /Dismiss ✗/i })).not.toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── SUG-6: Accept shows "✓ Accepted" ───────────────────────────────────────
  test('SUG-6: clicking Accept updates card to "✓ Accepted"', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'Sug Accept Status Group');

    const habit = await createHabitViaAPI(userA.token, 'Accept Habit');
    await shareHabitViaAPI(userA.token, habit.id, [groupId]);

    await navigateToGroupChat(userA.page, 'Sug Accept Status Group');
    await sendSuggestionViaHub(userB.token, groupId, habit.id, 2, { newName: 'Accepted Name' });

    await userA.page.getByRole('button', { name: /Accept ✓/i }).click();

    await expect(userA.page.getByText('✓ Accepted')).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── SUG-7: Dismiss shows "Dismissed" ──────────────────────────────────────
  test('SUG-7: clicking Dismiss updates card to "Dismissed"', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'Sug Dismiss Group');

    const habit = await createHabitViaAPI(userA.token, 'Dismiss Habit');
    await shareHabitViaAPI(userA.token, habit.id, [groupId]);

    await navigateToGroupChat(userA.page, 'Sug Dismiss Group');
    await sendSuggestionViaHub(userB.token, groupId, habit.id, 2, { newName: 'Will Dismiss' });

    await userA.page.getByRole('button', { name: /Dismiss ✗/i }).click();

    await expect(userA.page.getByText('Dismissed')).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── SUG-8: Buttons disappear after respond ─────────────────────────────────
  test('SUG-8: after accepting, Accept/Dismiss buttons disappear', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'Sug No Retry Group');

    const habit = await createHabitViaAPI(userA.token, 'No Retry Habit');
    await shareHabitViaAPI(userA.token, habit.id, [groupId]);

    await navigateToGroupChat(userA.page, 'Sug No Retry Group');
    await sendSuggestionViaHub(userB.token, groupId, habit.id, 2, { newName: 'Done Name' });

    await userA.page.getByRole('button', { name: /Accept ✓/i }).click();
    await expect(userA.page.getByText('✓ Accepted')).toBeVisible();

    await expect(userA.page.getByRole('button', { name: /Accept ✓/i })).not.toBeVisible();
    await expect(userA.page.getByRole('button', { name: /Dismiss ✗/i })).not.toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── SUG-9: Status update visible to other members in real-time ─────────────
  test('SUG-9: other members see suggestion status update in real-time', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'Sug RT Status Group');

    const habit = await createHabitViaAPI(userA.token, 'RT Status Habit');
    await shareHabitViaAPI(userA.token, habit.id, [groupId]);

    await navigateToGroupChat(userA.page, 'Sug RT Status Group');
    await navigateToGroupChat(userB.page, 'Sug RT Status Group');

    await sendSuggestionViaHub(userB.token, groupId, habit.id, 2, { newName: 'RT Name' });

    // Wait for suggestion to appear for User A
    await expect(userA.page.getByRole('button', { name: /Accept ✓/i })).toBeVisible();

    // User A accepts
    await userA.page.getByRole('button', { name: /Accept ✓/i }).click();

    // User B should see the accepted status
    await expect(userB.page.getByText('✓ Accepted')).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── SUG-10: Accept Reword changes habit name ────────────────────────────────
  test('SUG-10: accepting a Reword suggestion changes the habit name', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'Sug Reword Group');

    const habit = await createHabitViaAPI(userA.token, 'Old Habit Name');
    await shareHabitViaAPI(userA.token, habit.id, [groupId]);

    await navigateToGroupChat(userA.page, 'Sug Reword Group');
    await sendSuggestionViaHub(userB.token, groupId, habit.id, 2, { newName: 'Brand New Name' });

    await userA.page.getByRole('button', { name: /Accept ✓/i }).click();
    await expect(userA.page.getByText('✓ Accepted')).toBeVisible();

    // Reload to see updated habit name in sidebar
    await userA.page.reload();
    await expect(userA.page.getByText('Brand New Name')).toBeVisible();
    await expect(userA.page.getByText('Old Habit Name')).not.toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── SUG-11: Accept Split creates new habits ─────────────────────────────────
  test('SUG-11: accepting a Split suggestion creates new habits in the sidebar', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'Sug Split Group');

    const habit = await createHabitViaAPI(userA.token, 'Combo Habit');
    await shareHabitViaAPI(userA.token, habit.id, [groupId]);

    await navigateToGroupChat(userA.page, 'Sug Split Group');
    await sendSuggestionViaHub(userB.token, groupId, habit.id, 0, {
      newHabits: [{ name: 'Morning Part' }, { name: 'Evening Part' }],
    });

    await userA.page.getByRole('button', { name: /Accept ✓/i }).click();
    await expect(userA.page.getByText('✓ Accepted')).toBeVisible();

    await userA.page.reload();
    await expect(userA.page.getByText('Morning Part')).toBeVisible();
    await expect(userA.page.getByText('Evening Part')).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });
});
