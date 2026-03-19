import { test, expect } from '@playwright/test';
import {
  uniqueUser, loginAs, API_BASE,
  createGroupViaAPI, joinGroupViaAPI,
  createHabitViaAPI, shareHabitViaAPI, getGroupsViaAPI,
  setupTwoUsersInGroup, createHabitViaUI, navigateToGroupMembers,
  leaveGroupViaAPI,
} from './helpers';

test.describe('Habit Visibility (Privacy)', () => {
  // ── VIS-1: Default HideAll — no checkboxes for no-group user ───────────────
  test('VIS-1: new user default is HideAll — habit detail has no visibility checkboxes', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    // No groups joined, create a habit
    await createHabitViaUI(page, 'Private Default Habit');
    await page.getByText('Private Default Habit').click();

    // Visibility section only appears when user has groups (groups.length > 0)
    // Since user has no groups, the "Shared with" section should not be visible
    await expect(page.getByText('Shared with')).not.toBeVisible();
  });

  // ── VIS-2: Private habit not in API ────────────────────────────────────────
  test('VIS-2: private habits are not exposed via the group habits API', async ({ page, browser }) => {
    const userA = uniqueUser();
    const { token: tokenA } = await loginAs(page, userA);

    await page.getByRole('button', { name: '+ Create Group' }).click();
    await page.getByPlaceholder('e.g., Gym Bros').fill('Privacy Test Group');
    await page.getByRole('button', { name: 'Create Group', exact: true }).click();

    const codeButton = page.locator('button').filter({ hasText: /^[A-Z0-9]{6}$/ });
    const inviteCode = await codeButton.textContent();

    const groupsRes = await page.request.get(`${API_BASE}/groups`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const groups = await groupsRes.json();
    const groupId = groups[0].id;

    // Create habit WITHOUT sharing it (HideAll default)
    await page.request.post(`${API_BASE}/habits`, {
      data: { name: 'Private Habit', frequency: 0 },
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    const userB = uniqueUser();
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    const { token: tokenB } = await loginAs(pageB, userB);

    await pageB.getByRole('button', { name: '+ Join Group' }).click();
    await pageB.getByPlaceholder('ABC123').fill(inviteCode!.trim());
    await pageB.getByRole('button', { name: /Join the Hive/i }).click();

    const habitsRes = await pageB.request.get(`${API_BASE}/groups/${groupId}/habits`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const memberHabits = await habitsRes.json();
    const userAEntry = memberHabits.find((m: any) => m.userId === userA.username || m.displayName === userA.displayName);

    if (userAEntry) {
      const habitNames = userAEntry.habits.map((h: any) => h.name);
      expect(habitNames).not.toContain('Private Habit');
    }

    await contextB.close();
  });

  // ── VIS-3: Shared habit appears in group habits view ───────────────────────
  test('VIS-3: shared habit appears in group habits view', async ({ page, browser }) => {
    const userA = uniqueUser();
    const { token: tokenA } = await loginAs(page, userA);

    await page.getByRole('button', { name: '+ Create Group' }).click();
    await page.getByPlaceholder('e.g., Gym Bros').fill('Sharing Test Group');
    await page.getByRole('button', { name: 'Create Group', exact: true }).click();

    const codeButton = page.locator('button').filter({ hasText: /^[A-Z0-9]{6}$/ });
    const inviteCode = await codeButton.textContent();

    const groupsRes = await page.request.get(`${API_BASE}/groups`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const groups = await groupsRes.json();
    const groupId = groups[0].id;

    const habitRes = await page.request.post(`${API_BASE}/habits`, {
      data: { name: 'Shared Habit', frequency: 0 },
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const habit = await habitRes.json();
    await page.request.put(`${API_BASE}/habits/${habit.id}/visibility`, {
      data: { groupIds: [groupId] },
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    const userB = uniqueUser();
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    const { token: tokenB } = await loginAs(pageB, userB);

    await pageB.getByRole('button', { name: '+ Join Group' }).click();
    await pageB.getByPlaceholder('ABC123').fill(inviteCode!.trim());
    await pageB.getByRole('button', { name: /Join the Hive/i }).click();

    await pageB.locator('button').filter({ hasText: 'Sharing Test Group' }).first().click();
    await pageB.getByRole('button', { name: 'Members & Habits' }).click();

    await expect(pageB.getByText('Shared Habit')).toBeVisible();
    await contextB.close();
  });

  // ── VIS-4: Unshare removes habit from group view ───────────────────────────
  test('VIS-4: unsharing a habit removes it from the group habits view', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'Unshare Test Group');

    const habit = await createHabitViaAPI(userA.token, 'To Unshare');
    await shareHabitViaAPI(userA.token, habit.id, [groupId]);

    await navigateToGroupMembers(userB.page, 'Unshare Test Group');
    await expect(userB.page.getByText('To Unshare')).toBeVisible();

    // Unshare: pass empty group list
    await shareHabitViaAPI(userA.token, habit.id, []);

    await userB.page.reload();
    await navigateToGroupMembers(userB.page, 'Unshare Test Group');
    await expect(userB.page.getByText('To Unshare')).not.toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── VIS-5: Share with A not B ──────────────────────────────────────────────
  test('VIS-5: habit shared with Group A only — visible in A, not in B', async ({ page }) => {
    const user = uniqueUser();
    const { token } = await loginAs(page, user);

    const groupA = await createGroupViaAPI(token, 'Group Alpha');
    const groupB = await createGroupViaAPI(token, 'Group Beta');

    const habit = await createHabitViaAPI(token, 'Alpha Only Habit');
    await shareHabitViaAPI(token, habit.id, [groupA.id]);

    await page.reload();

    await navigateToGroupMembers(page, 'Group Alpha');
    await expect(page.getByText('Alpha Only Habit')).toBeVisible();

    await navigateToGroupMembers(page, 'Group Beta');
    await expect(page.getByText('Alpha Only Habit')).not.toBeVisible();
  });

  // ── VIS-6: Shared habits vanish after user leaves ──────────────────────────
  test('VIS-6: user leaves group → their shared habits vanish from group view', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'Leave Visibility Group');

    const habit = await createHabitViaAPI(userA.token, 'Visible Habit');
    await shareHabitViaAPI(userA.token, habit.id, [groupId]);

    await navigateToGroupMembers(userB.page, 'Leave Visibility Group');
    await expect(userB.page.getByText('Visible Habit')).toBeVisible();

    await leaveGroupViaAPI(userA.token, groupId);

    await userB.page.reload();
    await navigateToGroupMembers(userB.page, 'Leave Visibility Group');
    await expect(userB.page.getByText('Visible Habit')).not.toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── VIS-7: Deleted shared habit vanishes ───────────────────────────────────
  test('VIS-7: deleted shared habit vanishes from group habits view', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'Delete Visibility Group');

    const habit = await createHabitViaAPI(userA.token, 'Deletable Shared Habit');
    await shareHabitViaAPI(userA.token, habit.id, [groupId]);

    await navigateToGroupMembers(userB.page, 'Delete Visibility Group');
    await expect(userB.page.getByText('Deletable Shared Habit')).toBeVisible();

    // User A deletes the habit via UI
    await userA.page.getByText('Deletable Shared Habit').click();
    await userA.page.locator('button', { hasText: '🗑️' }).click();
    await userA.page.getByRole('button', { name: 'Delete it' }).click();

    await userB.page.reload();
    await navigateToGroupMembers(userB.page, 'Delete Visibility Group');
    await expect(userB.page.getByText('Deletable Shared Habit')).not.toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── VIS-9: Non-member gets 403 ─────────────────────────────────────────────
  test('VIS-9: non-member cannot access group habits endpoint — 403', async ({ page, browser }) => {
    const userA = uniqueUser();
    const { token: tokenA } = await loginAs(page, userA);
    const group = await createGroupViaAPI(tokenA, 'Protected Group');

    const contextC = await browser.newContext();
    const pageC = await contextC.newPage();
    const userC = uniqueUser();
    const { token: tokenC } = await loginAs(pageC, userC);

    const res = await pageC.request.get(`${API_BASE}/groups/${group.id}/habits`, {
      headers: { Authorization: `Bearer ${tokenC}` },
    });
    expect(res.status()).toBe(403);

    await contextC.close();
  });
});
