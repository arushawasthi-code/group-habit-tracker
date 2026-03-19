import { test, expect } from '@playwright/test';
import {
  uniqueUser, loginAs,
  createGroupViaAPI, joinGroupViaAPI,
  createHabitViaAPI, shareHabitViaAPI,
  setupTwoUsersInGroup, createHabitViaUI,
  navigateToGroupChat, navigateToGroupMembers,
  completeHabitViaAPI, leaveGroupViaAPI,
  sendSuggestionViaHub,
} from './helpers';

test.describe('Cross-Feature Workflows', () => {
  // ── FLOW-1: Full onboarding ─────────────────────────────────────────────────
  test('FLOW-1: register → create habit → complete → see streak 1', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    // Create first habit
    await page.getByRole('button', { name: '+ New Habit' }).click();
    await page.getByPlaceholder('e.g., Morning run').fill('Morning Routine');
    await page.getByRole('button', { name: 'Create Habit' }).click();

    await expect(page.getByText('Morning Routine')).toBeVisible();

    // Open habit and mark complete
    await page.getByText('Morning Routine').click();
    await page.getByRole('button', { name: 'Mark Complete ✓' }).click();

    await expect(page.getByText('Done for today!')).toBeVisible();
    await expect(page.getByText('🔥 1')).toBeVisible();
  });

  // ── FLOW-2: Social onboarding ───────────────────────────────────────────────
  test('FLOW-2: User A creates group → User B joins → both see each other in members', async ({ browser }) => {
    // User A creates group and gets invite code
    const userA = uniqueUser();
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await loginAs(pageA, userA);

    await pageA.getByRole('button', { name: '+ Create Group' }).click();
    await pageA.getByPlaceholder('e.g., Gym Bros').fill('Social Group');
    await pageA.getByRole('button', { name: 'Create Group', exact: true }).click();

    const codeBtn = pageA.locator('button').filter({ hasText: /^[A-Z0-9]{6}$/ });
    const inviteCode = (await codeBtn.textContent())?.trim()!;

    // User B joins
    const userB = uniqueUser();
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await loginAs(pageB, userB);

    await pageB.getByRole('button', { name: '+ Join Group' }).click();
    await pageB.getByPlaceholder('ABC123').fill(inviteCode);
    await pageB.getByRole('button', { name: /Join the Hive/i }).click();
    await expect(pageB.getByText('Social Group')).toBeVisible();

    // User A reloads and navigates to members tab
    await pageA.reload();
    await navigateToGroupMembers(pageA, 'Social Group');

    // Both see each other
    await expect(pageA.getByText(userB.displayName)).toBeVisible();
    await expect(pageB.getByText(userA.displayName)).toBeVisible();

    await contextA.close();
    await contextB.close();
  });

  // ── FLOW-3: Share flow with completion update ───────────────────────────────
  test('FLOW-3: A shares habit → B sees it → A completes → B sees checkmark on reload', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'Flow Share Group');

    // User A creates and shares habit
    const habit = await createHabitViaAPI(userA.token, 'Shared Flow Habit');
    await shareHabitViaAPI(userA.token, habit.id, [groupId]);

    // User B navigates to Members & Habits tab and sees the habit
    await navigateToGroupMembers(userB.page, 'Flow Share Group');
    await expect(userB.page.getByText('Shared Flow Habit')).toBeVisible();

    // User A completes the habit
    await completeHabitViaAPI(userA.token, habit.id);

    // User B reloads and sees the checkmark
    await userB.page.reload();
    await navigateToGroupMembers(userB.page, 'Flow Share Group');
    await expect(userB.page.getByText('✓').first()).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── FLOW-4: Real-time two-way chat ─────────────────────────────────────────
  test('FLOW-4: A sends → B sees → B replies → A sees — all real-time', async ({ browser }) => {
    const { userA, userB } = await setupTwoUsersInGroup(browser, 'Flow Chat Group');

    await navigateToGroupChat(userA.page, 'Flow Chat Group');
    await navigateToGroupChat(userB.page, 'Flow Chat Group');

    // User A sends
    await userA.page.getByPlaceholder('Type a message...').fill('Hey User B!');
    await userA.page.locator('button').filter({ hasText: '↑' }).click();

    // User B sees it
    await expect(userB.page.getByText('Hey User B!')).toBeVisible();

    // User B replies
    await userB.page.getByPlaceholder('Type a message...').fill('Hey User A!');
    await userB.page.locator('button').filter({ hasText: '↑' }).click();

    // User A sees reply
    await expect(userA.page.getByText('Hey User A!')).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── FLOW-5: Special message flow ───────────────────────────────────────────
  test('FLOW-5: A shares habit → B sends Lock In special message → both see styled card', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'Flow Special Group');

    const habit = await createHabitViaAPI(userA.token, 'Special Target Habit');
    await shareHabitViaAPI(userA.token, habit.id, [groupId]);

    await navigateToGroupChat(userA.page, 'Flow Special Group');
    await navigateToGroupChat(userB.page, 'Flow Special Group');

    await userB.page.locator('button', { hasText: '⭐' }).click();
    await userB.page.getByRole('button', { name: /🔒 Lock In/i }).click();
    await userB.page.getByRole('combobox').selectOption({ label: /Special Target Habit/ });
    await userB.page.getByRole('button', { name: 'Send' }).click();

    await expect(userB.page.getByText('Lock In')).toBeVisible();
    await expect(userA.page.getByText('Lock In')).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── FLOW-6: Suggestion end-to-end (Reword) ─────────────────────────────────
  test('FLOW-6: A shares habit → B sends Reword suggestion → A accepts → name changes', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'Flow Suggestion Group');

    const habit = await createHabitViaAPI(userA.token, 'Original Habit');
    await shareHabitViaAPI(userA.token, habit.id, [groupId]);

    await navigateToGroupChat(userA.page, 'Flow Suggestion Group');

    // B sends suggestion via hub
    await sendSuggestionViaHub(userB.token, groupId, habit.id, 2, { newName: 'Improved Habit' });

    // A sees the card and accepts
    await expect(userA.page.getByRole('button', { name: /Accept ✓/i })).toBeVisible();
    await userA.page.getByRole('button', { name: /Accept ✓/i }).click();

    // Habit name changes after reload
    await userA.page.reload();
    await expect(userA.page.getByText('Improved Habit')).toBeVisible();
    await expect(userA.page.getByText('Original Habit')).not.toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── FLOW-7: Privacy — share 1 of 2 habits ─────────────────────────────────
  test('FLOW-7: A has 2 habits, shares only 1 → B sees exactly 1', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'Flow Privacy Group');

    const habitPublic = await createHabitViaAPI(userA.token, 'Public Habit');
    const habitPrivate = await createHabitViaAPI(userA.token, 'Private Habit');

    // Share only the public one
    await shareHabitViaAPI(userA.token, habitPublic.id, [groupId]);

    await navigateToGroupMembers(userB.page, 'Flow Privacy Group');
    await expect(userB.page.getByText('Public Habit')).toBeVisible();
    await expect(userB.page.getByText('Private Habit')).not.toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── FLOW-8: Leave removes shared habits from group view ────────────────────
  test('FLOW-8: A shares habit → A leaves group → B no longer sees A\'s habit', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'Flow Leave Group');

    const habit = await createHabitViaAPI(userA.token, 'Leave Habit');
    await shareHabitViaAPI(userA.token, habit.id, [groupId]);

    await navigateToGroupMembers(userB.page, 'Flow Leave Group');
    await expect(userB.page.getByText('Leave Habit')).toBeVisible();

    // User A leaves via API
    await leaveGroupViaAPI(userA.token, groupId);

    // User B reloads
    await userB.page.reload();
    await navigateToGroupMembers(userB.page, 'Flow Leave Group');
    await expect(userB.page.getByText('Leave Habit')).not.toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── FLOW-9: Group lifecycle with 3 users ───────────────────────────────────
  test('FLOW-9: create group → 2 users join → one leaves → creator sees updated count', async ({ browser }) => {
    const userA = uniqueUser();
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    const { token: tokenA } = await loginAs(pageA, userA);
    const group = await createGroupViaAPI(tokenA, 'Lifecycle Group');

    // User B joins
    const userB = uniqueUser();
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    const { token: tokenB } = await loginAs(pageB, userB);
    await joinGroupViaAPI(tokenB, group.inviteCode);

    // User C joins
    const userC = uniqueUser();
    const contextC = await browser.newContext();
    const pageC = await contextC.newPage();
    const { token: tokenC } = await loginAs(pageC, userC);
    await joinGroupViaAPI(tokenC, group.inviteCode);

    // Verify 3 members initially
    await pageA.reload();
    await pageA.locator('button').filter({ hasText: 'Lifecycle Group' }).first().click();
    await expect(pageA.getByText('3/8 members')).toBeVisible();

    // User B leaves
    await leaveGroupViaAPI(tokenB, group.id);

    // User A reloads and sees 2 members
    await pageA.reload();
    await pageA.locator('button').filter({ hasText: 'Lifecycle Group' }).first().click();
    await expect(pageA.getByText('2/8 members')).toBeVisible();

    await contextA.close();
    await contextB.close();
    await contextC.close();
  });

  // ── FLOW-10: Creator deletes group — all members lose it ───────────────────
  test('FLOW-10: creator deletes group → all members lose it from sidebar on reload', async ({ browser }) => {
    const { userA, userB } = await setupTwoUsersInGroup(browser, 'Flow Delete Group');

    // Creator (userA) deletes the group
    await userA.page.locator('button').filter({ hasText: 'Flow Delete Group' }).first().click();
    await userA.page.getByRole('button', { name: 'Delete' }).first().click();
    await expect(userA.page.getByText(/Dissolve the hive/i)).toBeVisible();
    await userA.page.getByRole('button', { name: 'Delete' }).last().click();

    await expect(userA.page.getByText('Flow Delete Group')).not.toBeVisible();

    // User B reloads — group gone
    await userB.page.reload();
    await expect(userB.page.getByText('Flow Delete Group')).not.toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });
});
