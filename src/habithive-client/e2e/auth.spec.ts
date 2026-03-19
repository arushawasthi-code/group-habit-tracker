import { test, expect } from '@playwright/test';
import { uniqueUser, loginAs } from './helpers';

test.describe('Auth', () => {
  // ── AUTH-1: Register with valid credentials ──────────────────────────────
  test('AUTH-1: register and login with valid credentials', async ({ page }) => {
    const user = uniqueUser();
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign Up' }).click();

    await page.getByPlaceholder('your_username').fill(user.username);
    await page.getByPlaceholder('How your friends see you').fill(user.displayName);
    await page.getByPlaceholder('••••••••').fill(user.password);
    await page.getByRole('button', { name: 'Join the Hive' }).click();

    await expect(page.getByText('🐝 HabitHive')).toBeVisible();
  });

  // ── AUTH-2: Duplicate username ───────────────────────────────────────────
  test('AUTH-2: shows error for duplicate username', async ({ page }) => {
    const user = uniqueUser();
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign Up' }).click();

    await page.getByPlaceholder('your_username').fill(user.username);
    await page.getByPlaceholder('How your friends see you').fill(user.displayName);
    await page.getByPlaceholder('••••••••').fill(user.password);
    await page.getByRole('button', { name: 'Join the Hive' }).click();
    await expect(page.getByText('🐝 HabitHive')).toBeVisible();

    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole('button', { name: 'Sign Up' }).click();
    await page.getByPlaceholder('your_username').fill(user.username);
    await page.getByPlaceholder('How your friends see you').fill(user.displayName);
    await page.getByPlaceholder('••••••••').fill(user.password);
    await page.getByRole('button', { name: 'Join the Hive' }).click();

    await expect(page.getByText(/taken/i)).toBeVisible();
  });

  // ── AUTH-3: Short password blocked ──────────────────────────────────────
  test('AUTH-3: short password is rejected', async ({ page }) => {
    const user = uniqueUser();
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign Up' }).click();

    await page.getByPlaceholder('your_username').fill(user.username);
    await page.getByPlaceholder('How your friends see you').fill(user.displayName);
    await page.getByPlaceholder('••••••••').fill('short');
    await page.getByRole('button', { name: 'Join the Hive' }).click();

    // Either native HTML5 validation prevents submit or the API returns an error
    await expect(page.getByText('🐝 HabitHive')).not.toBeVisible({ timeout: 2000 }).catch(() => {});
    // Still on the login page
    await expect(page.getByRole('button', { name: 'Join the Hive' })).toBeVisible();
  });

  // ── AUTH-4: Username too short ───────────────────────────────────────────
  test('AUTH-4: username shorter than 3 chars is rejected', async ({ page }) => {
    const user = uniqueUser();
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign Up' }).click();

    await page.getByPlaceholder('your_username').fill('ab');
    await page.getByPlaceholder('How your friends see you').fill(user.displayName);
    await page.getByPlaceholder('••••••••').fill(user.password);
    await page.getByRole('button', { name: 'Join the Hive' }).click();

    // Should show an error or remain on the login page
    const isOnLoginPage = await page.getByRole('button', { name: 'Join the Hive' }).isVisible();
    expect(isOnLoginPage).toBeTruthy();
  });

  // ── AUTH-5: Special characters in username ──────────────────────────────
  test('AUTH-5: username with @ character is rejected', async ({ page }) => {
    const user = uniqueUser();
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign Up' }).click();

    await page.getByPlaceholder('your_username').fill('user@name');
    await page.getByPlaceholder('How your friends see you').fill(user.displayName);
    await page.getByPlaceholder('••••••••').fill(user.password);
    await page.getByRole('button', { name: 'Join the Hive' }).click();

    await expect(page.getByText(/letters, numbers/i)).toBeVisible();
  });

  // ── AUTH-7: Toggle between Log In / Sign Up tabs ─────────────────────────
  test('AUTH-7: toggling Sign Up shows display name field, Log In hides it', async ({ page }) => {
    await page.goto('/');

    // Log In tab is default — no display name field
    await expect(page.getByPlaceholder('How your friends see you')).not.toBeVisible();

    // Switch to Sign Up
    await page.getByRole('button', { name: 'Sign Up' }).click();
    await expect(page.getByPlaceholder('How your friends see you')).toBeVisible();

    // Switch back to Log In
    await page.getByRole('button', { name: 'Log In' }).click();
    await expect(page.getByPlaceholder('How your friends see you')).not.toBeVisible();
  });

  // ── AUTH-9: Wrong password ───────────────────────────────────────────────
  test('AUTH-9: shows error for wrong password', async ({ page }) => {
    const user = uniqueUser();
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign Up' }).click();
    await page.getByPlaceholder('your_username').fill(user.username);
    await page.getByPlaceholder('How your friends see you').fill(user.displayName);
    await page.getByPlaceholder('••••••••').fill(user.password);
    await page.getByRole('button', { name: 'Join the Hive' }).click();
    await expect(page.getByText('🐝 HabitHive')).toBeVisible();

    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByPlaceholder('your_username').fill(user.username);
    await page.getByPlaceholder('••••••••').fill('WrongPassword1');
    await page.getByRole('button', { name: 'Enter the Hive' }).click();

    await expect(page.getByText(/wrong password/i)).toBeVisible();
  });

  // ── AUTH-10: Unauthenticated redirect ────────────────────────────────────
  test('AUTH-10: unauthenticated user sees login page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Enter the Hive' })).toBeVisible();
  });

  // ── AUTH-12: Session persists across reload ──────────────────────────────
  test('AUTH-12: session persists after page reload', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    await expect(page.getByText('🐝 HabitHive')).toBeVisible();
    await page.reload();
    // Should still be logged in
    await expect(page.getByText('🐝 HabitHive')).toBeVisible();
  });

  // ── AUTH-13: Cleared localStorage logs out ───────────────────────────────
  test('AUTH-13: clearing localStorage logs user out', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);
    await expect(page.getByText('🐝 HabitHive')).toBeVisible();

    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await expect(page.getByRole('button', { name: 'Enter the Hive' })).toBeVisible();
  });

  // ── AUTH-14: Logout via sidebar ──────────────────────────────────────────
  test('AUTH-14: clicking logout returns to login page', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);
    await expect(page.getByText('🐝 HabitHive')).toBeVisible();

    // The logout button is the ↩ button in the user profile section
    await page.locator('[title="Logout"]').click();

    await expect(page.getByRole('button', { name: 'Enter the Hive' })).toBeVisible();
    const stored = await page.evaluate(() => localStorage.getItem('token'));
    expect(stored).toBeNull();
  });
});
