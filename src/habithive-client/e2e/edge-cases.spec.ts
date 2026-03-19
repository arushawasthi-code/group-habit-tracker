import { test, expect } from '@playwright/test';
import {
  uniqueUser, loginAs,
  createGroupViaAPI, createHabitViaUI,
  setupTwoUsersInGroup, navigateToGroupChat, navigateToGroupMembers,
} from './helpers';

test.describe('Edge Cases & Error Handling', () => {
  // ── EDGE-1: Invalid JWT → login page ───────────────────────────────────────
  test('EDGE-1: invalid JWT in localStorage → app shows login page', async ({ page }) => {
    // Set a bad token directly
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('token', 'not.a.valid.jwt'));
    await page.reload();

    // App should fall back to the login page
    await expect(page.getByRole('button', { name: 'Enter the Hive' })).toBeVisible();
  });

  // ── EDGE-2: Habit with no groups — no visibility section ────────────────────
  test('EDGE-2: creating a habit when not in any groups → no "Shared with" section', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    // User has no groups
    await createHabitViaUI(page, 'Solo Habit');
    await page.getByText('Solo Habit').click();

    // "Shared with" section only shows when groups.length > 0
    await expect(page.getByText('Shared with')).not.toBeVisible();
  });

  // ── EDGE-3: Group with only 1 member ────────────────────────────────────────
  test('EDGE-3: group with only 1 member (creator) shows just the creator in members tab', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    await page.getByRole('button', { name: '+ Create Group' }).click();
    await page.getByPlaceholder('e.g., Gym Bros').fill('Solo Group');
    await page.getByRole('button', { name: 'Create Group', exact: true }).click();

    await page.getByRole('button', { name: 'Members & Habits' }).click();

    // Only creator visible
    await expect(page.getByText(user.displayName)).toBeVisible();
    // Only 1 member card
    const memberCards = page.locator('.bg-white.rounded-xl.border');
    await expect(memberCards).toHaveCount(1);
  });

  // ── EDGE-4: Rapid double-click on Mark Complete ─────────────────────────────
  test('EDGE-4: rapid double-click on Mark Complete → only one completion, no error', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    await createHabitViaUI(page, 'Double Click Habit');
    await page.getByText('Double Click Habit').click();

    const completeBtn = page.getByRole('button', { name: 'Mark Complete ✓' });
    // Double-click rapidly
    await completeBtn.dblclick();

    // Button should show Done state (not an error)
    await expect(page.getByText('Done for today!')).toBeVisible();
    // Streak is 1, not 2
    await expect(page.getByText('🔥 1')).toBeVisible();
  });

  // ── EDGE-5: Whitespace-only message is blocked ─────────────────────────────
  test('EDGE-5: whitespace-only message keeps send button disabled', async ({ browser }) => {
    const { userA, userB } = await setupTwoUsersInGroup(browser, 'Edge Whitespace Group');

    await navigateToGroupChat(userA.page, 'Edge Whitespace Group');
    const sendBtn = userA.page.locator('button').filter({ hasText: '↑' });

    await userA.page.getByPlaceholder('Type a message...').fill('   ');
    await expect(sendBtn).toBeDisabled();

    await userA.context.close();
    await userB.context.close();
  });

  // ── EDGE-6: Network error during habit creation shows error ─────────────────
  test('EDGE-6: network error during habit creation shows error message in modal', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    await page.getByRole('button', { name: '+ New Habit' }).click();
    await page.getByPlaceholder('e.g., Morning run').fill('Network Fail Habit');

    // Intercept the POST /api/habits request and make it fail
    await page.route('**/api/habits', (route) => route.abort('failed'));

    await page.getByRole('button', { name: 'Create Habit' }).click();

    // Modal should still be visible with an error
    await expect(page.getByText('🌱 New Habit')).toBeVisible();
    // Some error message (the exact copy depends on the error handler)
    // The app shows formError which catches err.response?.data?.message || 'Something went wrong'
    await expect(page.locator('.text-coral').first()).toBeVisible();
  });
});
