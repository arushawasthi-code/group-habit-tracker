import { test, expect } from '@playwright/test';
import {
  uniqueUser, loginAs,
  createGroupViaAPI, createHabitViaUI, navigateToGroupChat, navigateToGroupMembers,
  createHabitViaAPI, shareHabitViaAPI, setupTwoUsersInGroup, completeHabitViaAPI,
} from './helpers';

test.describe('Sidebar & Navigation', () => {
  // ── NAV-1: Sidebar visible on load ─────────────────────────────────────────
  test('NAV-1: sidebar is visible on app load with habits and groups sections', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    await expect(page.getByText('My Habits')).toBeVisible();
    await expect(page.getByText('Groups')).toBeVisible();
    await expect(page.getByRole('button', { name: '+ New Habit' })).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Create Group' })).toBeVisible();
  });

  // ── NAV-2: Collapse sidebar ─────────────────────────────────────────────────
  test('NAV-2: clicking ← collapses the sidebar', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    // Sidebar starts expanded; collapse it
    await page.getByRole('button', { name: '←' }).click();

    // Sidebar content (habits section label) should be hidden
    await expect(page.getByText('My Habits')).not.toBeVisible();
    await expect(page.getByRole('button', { name: '→' })).toBeVisible();
  });

  // ── NAV-3: Expand sidebar ───────────────────────────────────────────────────
  test('NAV-3: clicking → expands the sidebar back to full width', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    await page.getByRole('button', { name: '←' }).click();
    await expect(page.getByText('My Habits')).not.toBeVisible();

    await page.getByRole('button', { name: '→' }).click();
    await expect(page.getByText('My Habits')).toBeVisible();
  });

  // ── NAV-4: Click habit deselects group ─────────────────────────────────────
  test('NAV-4: clicking a habit deselects the active group', async ({ page }) => {
    const user = uniqueUser();
    const { token } = await loginAs(page, user);

    await page.getByRole('button', { name: '+ Create Group' }).click();
    await page.getByPlaceholder('e.g., Gym Bros').fill('Nav Test Group');
    await page.getByRole('button', { name: 'Create Group', exact: true }).click();
    await expect(page.getByPlaceholder('Type a message...')).toBeVisible();

    await createHabitViaUI(page, 'Nav Habit');
    await page.getByText('Nav Habit').click();

    // Habit detail visible, not chat input
    await expect(page.getByRole('button', { name: 'Mark Complete ✓' })).toBeVisible();
    await expect(page.getByPlaceholder('Type a message...')).not.toBeVisible();
  });

  // ── NAV-5: Click group deselects habit ─────────────────────────────────────
  test('NAV-5: clicking a group deselects the active habit', async ({ page }) => {
    const user = uniqueUser();
    const { token } = await loginAs(page, user);

    await createHabitViaUI(page, 'Deselect Habit');
    await page.getByText('Deselect Habit').click();
    await expect(page.getByRole('button', { name: 'Mark Complete ✓' })).toBeVisible();

    await page.getByRole('button', { name: '+ Create Group' }).click();
    await page.getByPlaceholder('e.g., Gym Bros').fill('Deselect Group');
    await page.getByRole('button', { name: 'Create Group', exact: true }).click();

    // Group view visible, not habit detail
    await expect(page.getByPlaceholder('Type a message...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mark Complete ✓' })).not.toBeVisible();
  });

  // ── NAV-6: Selected habit has amber background ─────────────────────────────
  test('NAV-6: selected habit shows amber-light background highlight in sidebar', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    await createHabitViaUI(page, 'Highlighted Habit');
    await page.getByText('Highlighted Habit').click();

    // The button for the selected habit should have the amber-light class
    const habitBtn = page.locator('button').filter({ hasText: 'Highlighted Habit' });
    await expect(habitBtn).toHaveClass(/bg-amber-light/);
  });

  // ── NAV-7: Selected group has amber background ─────────────────────────────
  test('NAV-7: selected group shows amber-light background highlight in sidebar', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    await page.getByRole('button', { name: '+ Create Group' }).click();
    await page.getByPlaceholder('e.g., Gym Bros').fill('Highlighted Group');
    await page.getByRole('button', { name: 'Create Group', exact: true }).click();

    // After creation the group is auto-selected
    const groupBtn = page.locator('button').filter({ hasText: /^Highlighted Group/ });
    await expect(groupBtn).toHaveClass(/bg-amber-light/);
  });

  // ── NAV-8: Welcome screen when nothing selected ────────────────────────────
  test('NAV-8: no selection → welcome screen with bee emoji and "Welcome to HabitHive!"', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    // On fresh login nothing is selected
    await expect(page.getByText('Welcome to HabitHive!')).toBeVisible();
    await expect(page.locator('text=🐝').first()).toBeVisible();
  });

  // ── NAV-9: New user sees onboarding prompt ─────────────────────────────────
  test('NAV-9: new user sees "Start by creating a habit or joining a group!" prompt', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    await expect(page.getByText(/Start by creating a habit or joining a group/i)).toBeVisible();
  });

  // ── NAV-10: Sidebar shows user profile ─────────────────────────────────────
  test('NAV-10: sidebar shows user avatar, display name, and @username', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    await expect(page.getByText(user.displayName)).toBeVisible();
    await expect(page.getByText(`@${user.username}`)).toBeVisible();
    // Avatar: first letter of display name
    const firstLetter = user.displayName[0].toUpperCase();
    await expect(page.locator('.bg-amber').filter({ hasText: firstLetter }).first()).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Group — Members & Habits Tab
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Members & Habits Tab', () => {
  // ── MH-1: Shows a card per group member ────────────────────────────────────
  test('MH-1: Members & Habits tab shows a card for each group member', async ({ browser }) => {
    const { userA, userB } = await setupTwoUsersInGroup(browser, 'MH Members Group');

    await navigateToGroupMembers(userA.page, 'MH Members Group');

    // Two member cards should be present
    await expect(userA.page.getByText(userA.displayName)).toBeVisible();
    await expect(userA.page.getByText(userB.displayName)).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── MH-2: Member card shows avatar and display name ───────────────────────
  test('MH-2: member cards show avatar (first letter) and display name', async ({ browser }) => {
    const { userA, userB } = await setupTwoUsersInGroup(browser, 'MH Avatar Group');

    await navigateToGroupMembers(userA.page, 'MH Avatar Group');

    // Display name is visible
    await expect(userA.page.getByText(userB.displayName)).toBeVisible();
    // Avatar shows first letter
    const avatarLetter = userB.displayName[0].toUpperCase();
    await expect(userA.page.locator('.bg-amber').filter({ hasText: avatarLetter })).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── MH-3: Current user's card shows "You" badge ────────────────────────────
  test('MH-3: current user\'s card shows a "You" badge', async ({ browser }) => {
    const { userA, userB } = await setupTwoUsersInGroup(browser, 'MH You Badge Group');

    await navigateToGroupMembers(userA.page, 'MH You Badge Group');

    await expect(userA.page.getByText('You')).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── MH-4: Shared habits listed with streak ─────────────────────────────────
  test('MH-4: member with shared habit shows it with streak info', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'MH Habit List Group');

    const habit = await createHabitViaAPI(userA.token, 'Shared Tracked Habit');
    await shareHabitViaAPI(userA.token, habit.id, [groupId]);

    await navigateToGroupMembers(userB.page, 'MH Habit List Group');

    await expect(userB.page.getByText('Shared Tracked Habit')).toBeVisible();
    await expect(userB.page.getByText('🔥 0')).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── MH-5: Member with no shared habits ─────────────────────────────────────
  test('MH-5: member with no shared habits shows "No shared habits yet"', async ({ browser }) => {
    const { userA, userB } = await setupTwoUsersInGroup(browser, 'MH No Habits Group');

    // Neither user shares any habits
    await navigateToGroupMembers(userA.page, 'MH No Habits Group');

    await expect(userA.page.getByText('No shared habits yet').first()).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── MH-6: Completed habit shows green checkmark in group view ──────────────
  test('MH-6: completed habit shows green checkmark circle in group habits view', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'MH Checkmark Group');

    const habit = await createHabitViaAPI(userA.token, 'Completed Group Habit');
    await shareHabitViaAPI(userA.token, habit.id, [groupId]);
    await completeHabitViaAPI(userA.token, habit.id);

    await navigateToGroupMembers(userB.page, 'MH Checkmark Group');

    // Completed habit's circle shows ✓
    await expect(userB.page.getByText('✓').first()).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });
});
