import { test, expect } from '@playwright/test';
import { uniqueUser, loginAs, createHabitViaUI } from './helpers';

test.describe('Habits', () => {
  // ── HAB-1: Create daily habit ────────────────────────────────────────────
  test('HAB-1: create a daily habit and it appears in the sidebar', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    await page.getByRole('button', { name: '+ New Habit' }).click();
    await page.getByPlaceholder('e.g., Morning run').fill('Drink water');
    await page.getByRole('button', { name: 'Create Habit' }).click();

    await expect(page.getByText('Drink water')).toBeVisible();
  });

  // ── HAB-2: Create habit with description ────────────────────────────────
  test('HAB-2: creating habit with description shows it in detail view', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    await page.getByRole('button', { name: '+ New Habit' }).click();
    await page.getByPlaceholder('e.g., Morning run').fill('Meditate');
    await page.getByPlaceholder('Optional details').fill('10 minutes in the morning');
    await page.getByRole('button', { name: 'Create Habit' }).click();

    await page.getByText('Meditate').click();
    await expect(page.getByText('10 minutes in the morning')).toBeVisible();
  });

  // ── HAB-3: Weekly habit frequency badge ─────────────────────────────────
  test('HAB-3: weekly habit shows "Weekly" frequency badge', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    await page.getByRole('button', { name: '+ New Habit' }).click();
    await page.getByPlaceholder('e.g., Morning run').fill('Long run');
    await page.getByRole('button', { name: 'Weekly' }).click();
    await page.getByRole('button', { name: 'Create Habit' }).click();

    await page.getByText('Long run').click();
    await expect(page.locator('span').filter({ hasText: 'Weekly' })).toBeVisible();
  });

  // ── HAB-4: Custom frequency ──────────────────────────────────────────────
  test('HAB-4: custom-frequency habit shows days in badge', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    await page.getByRole('button', { name: '+ New Habit' }).click();
    await page.getByPlaceholder('e.g., Morning run').fill('Gym');
    await page.getByRole('button', { name: 'Custom' }).click();
    await page.getByPlaceholder('e.g., Monday,Wednesday,Friday').fill('Monday,Wednesday,Friday');
    await page.getByRole('button', { name: 'Create Habit' }).click();

    await page.getByText('Gym').click();
    await expect(page.locator('span').filter({ hasText: /Custom/ })).toBeVisible();
    await expect(page.locator('span').filter({ hasText: /Monday,Wednesday,Friday/ })).toBeVisible();
  });

  // ── HAB-5: Empty name keeps Create button disabled ───────────────────────
  test('HAB-5: Create Habit button is disabled when name is empty', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    await page.getByRole('button', { name: '+ New Habit' }).click();
    const createBtn = page.getByRole('button', { name: 'Create Habit' });
    await expect(createBtn).toBeDisabled();

    await page.getByPlaceholder('e.g., Morning run').fill('Something');
    await expect(createBtn).toBeEnabled();
  });

  // ── HAB-6: Modal closes after creation ───────────────────────────────────
  test('HAB-6: modal closes after successful habit creation', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    await page.getByRole('button', { name: '+ New Habit' }).click();
    await expect(page.getByText('🌱 New Habit')).toBeVisible();
    await page.getByPlaceholder('e.g., Morning run').fill('Journaling');
    await page.getByRole('button', { name: 'Create Habit' }).click();

    await expect(page.getByText('🌱 New Habit')).not.toBeVisible();
  });

  // ── HAB-7: Modal close button dismisses without creating ─────────────────
  test('HAB-7: close button dismisses modal without creating habit', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    await page.getByRole('button', { name: '+ New Habit' }).click();
    await page.getByPlaceholder('e.g., Morning run').fill('Abandoned habit');
    await page.locator('.fixed').getByRole('button', { name: '✕' }).click();

    await expect(page.getByText('🌱 New Habit')).not.toBeVisible();
    await expect(page.getByText('Abandoned habit')).not.toBeVisible();
  });

  // ── HAB-8: Click overlay closes modal ────────────────────────────────────
  test('HAB-8: clicking overlay backdrop closes the modal', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    await page.getByRole('button', { name: '+ New Habit' }).click();
    await expect(page.getByText('🌱 New Habit')).toBeVisible();

    // Click the overlay (the absolute backdrop div)
    await page.locator('.fixed.inset-0 .absolute.inset-0').click();

    await expect(page.getByText('🌱 New Habit')).not.toBeVisible();
  });

  // ── HAB-9: Habit detail view shows all fields ────────────────────────────
  test('HAB-9: habit detail view shows name, frequency badge, and streaks', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);
    await createHabitViaUI(page, 'Push-ups');

    await page.getByText('Push-ups').click();

    await expect(page.getByText('Push-ups')).toBeVisible();
    await expect(page.locator('span').filter({ hasText: 'Daily' })).toBeVisible();
    await expect(page.getByText(/🔥/)).toBeVisible();
    await expect(page.getByText(/🏆/)).toBeVisible();
  });

  // ── HAB-10: Zero streak shows origin story copy ──────────────────────────
  test('HAB-10: new habit shows "Day 0. Every legend has an origin story."', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);
    await createHabitViaUI(page, 'Brand new habit');

    await page.getByText('Brand new habit').click();

    await expect(page.getByText(/Every legend has an origin story/i)).toBeVisible();
  });

  // ── HAB-11: Selecting habit clears group selection ───────────────────────
  test('HAB-11: selecting a habit deselects the active group', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    // Create group via UI
    await page.getByRole('button', { name: '+ Create Group' }).click();
    await page.getByPlaceholder('e.g., Gym Bros').fill('My Group');
    await page.getByRole('button', { name: 'Create Group', exact: true }).click();

    // Group view is now shown
    await expect(page.getByPlaceholder('Type a message...')).toBeVisible();

    // Create and select habit
    await createHabitViaUI(page, 'My habit');
    await page.getByText('My habit').click();

    // Habit detail should be visible, not chat
    await expect(page.getByRole('button', { name: 'Mark Complete ✓' })).toBeVisible();
    await expect(page.getByPlaceholder('Type a message...')).not.toBeVisible();
  });

  // ── HAB-12: Mark complete ────────────────────────────────────────────────
  test('HAB-12: marking complete changes button to "Done for today! 🎉"', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);
    await createHabitViaUI(page, 'Morning stretch');

    await page.getByText('Morning stretch').click();
    await page.getByRole('button', { name: 'Mark Complete ✓' }).click();

    await expect(page.getByText('Done for today!')).toBeVisible();
  });

  // ── HAB-13: Streak increments after completion ───────────────────────────
  test('HAB-13: completing habit increments streak to 1', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);
    await createHabitViaUI(page, 'Streak test habit');

    await page.getByText('Streak test habit').click();
    await page.getByRole('button', { name: 'Mark Complete ✓' }).click();

    await expect(page.getByText('🔥 1')).toBeVisible();
  });

  // ── HAB-15: Cannot complete twice ───────────────────────────────────────
  test('HAB-15: done button is disabled after completion', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);
    await createHabitViaUI(page, 'Read 10 pages');

    await page.getByText('Read 10 pages').click();
    await page.getByRole('button', { name: 'Mark Complete ✓' }).click();
    await expect(page.getByText('Done for today!')).toBeVisible();

    await expect(page.getByRole('button', { name: 'Done for today!' })).toBeDisabled();
  });

  // ── HAB-16: Sidebar checkmark after completion ───────────────────────────
  test('HAB-16: completed habit shows green checkmark in sidebar', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);
    await createHabitViaUI(page, 'Sidebar check habit');

    await page.getByText('Sidebar check habit').click();
    await page.getByRole('button', { name: 'Mark Complete ✓' }).click();

    // The completion circle in the sidebar should have a checkmark
    await expect(page.locator('.min-h-screen').getByText('✓')).toBeVisible();
  });

  // ── HAB-17: Share prompt appears after completion ────────────────────────
  test('HAB-17: share prompt appears after completing when user has groups', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    // Create a group first
    await page.getByRole('button', { name: '+ Create Group' }).click();
    await page.getByPlaceholder('e.g., Gym Bros').fill('Share Test Group');
    await page.getByRole('button', { name: 'Create Group', exact: true }).click();

    // Create and complete a habit
    await createHabitViaUI(page, 'Shareable habit');
    await page.getByText('Shareable habit').click();
    await page.getByRole('button', { name: 'Mark Complete ✓' }).click();

    await expect(page.getByText(/Share this win/i)).toBeVisible();
    await expect(page.getByText('Share Test Group')).toBeVisible();
  });

  // ── HAB-19: Edit mode shows current values ───────────────────────────────
  test('HAB-19: clicking edit shows current name and description in inputs', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);
    await createHabitViaUI(page, 'Editable habit', 'Original description');

    await page.getByText('Editable habit').click();
    await page.locator('button', { hasText: '✏️' }).click();

    await expect(page.getByDisplayValue('Editable habit')).toBeVisible();
    await expect(page.getByDisplayValue('Original description')).toBeVisible();
  });

  // ── HAB-20: Edit updates name ────────────────────────────────────────────
  test('HAB-20: editing habit name updates it in detail view and sidebar', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);
    await createHabitViaUI(page, 'Old habit name');

    await page.getByText('Old habit name').click();
    await page.locator('button', { hasText: '✏️' }).click();

    const nameInput = page.getByDisplayValue('Old habit name');
    await nameInput.fill('New habit name');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('New habit name')).toBeVisible();
    await expect(page.getByText('Old habit name')).not.toBeVisible();
  });

  // ── HAB-21: Cancel edit reverts ──────────────────────────────────────────
  test('HAB-21: cancelling edit reverts to original name', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);
    await createHabitViaUI(page, 'Unchanged habit');

    await page.getByText('Unchanged habit').click();
    await page.locator('button', { hasText: '✏️' }).click();
    await page.getByDisplayValue('Unchanged habit').fill('Temporary edit');
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByText('Unchanged habit')).toBeVisible();
    await expect(page.getByText('Temporary edit')).not.toBeVisible();
  });

  // ── HAB-22: Edit does not reset streak ───────────────────────────────────
  test('HAB-22: editing a habit does not reset its streak', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);
    await createHabitViaUI(page, 'Streak preserve habit');

    await page.getByText('Streak preserve habit').click();
    await page.getByRole('button', { name: 'Mark Complete ✓' }).click();
    await expect(page.getByText('🔥 1')).toBeVisible();

    // Edit the habit
    await page.locator('button', { hasText: '✏️' }).click();
    await page.getByDisplayValue('Streak preserve habit').fill('Streak preserve habit (edited)');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('🔥 1')).toBeVisible();
  });

  // ── HAB-23: Delete confirmation shows ───────────────────────────────────
  test('HAB-23: clicking delete shows confirmation with streak warning', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);
    await createHabitViaUI(page, 'To be deleted');

    await page.getByText('To be deleted').click();
    await page.locator('button', { hasText: '🗑️' }).click();

    await expect(page.getByText(/streak will cry/i)).toBeVisible();
  });

  // ── HAB-24: Confirm delete removes habit ─────────────────────────────────
  test('HAB-24: confirming delete removes habit from sidebar', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);
    await createHabitViaUI(page, 'Temporary habit');

    await page.getByText('Temporary habit').click();
    await page.locator('button', { hasText: '🗑️' }).click();
    await page.getByRole('button', { name: 'Delete it' }).click();

    await expect(page.getByText('Temporary habit')).not.toBeVisible();
  });

  // ── HAB-25: Keep it cancels delete ──────────────────────────────────────
  test('HAB-25: clicking "Keep it" cancels the delete', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);
    await createHabitViaUI(page, 'Survivor habit');

    await page.getByText('Survivor habit').click();
    await page.locator('button', { hasText: '🗑️' }).click();
    await page.getByRole('button', { name: 'Keep it' }).click();

    // Confirmation gone, habit still there
    await expect(page.getByText(/streak will cry/i)).not.toBeVisible();
    await expect(page.getByText('Survivor habit')).toBeVisible();
  });

  // ── HAB-26: No habits empty state ───────────────────────────────────────
  test('HAB-26: sidebar shows empty-state copy when no habits exist', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    await expect(page.getByText(/Couldn't be me/i)).toBeVisible();
  });
});
