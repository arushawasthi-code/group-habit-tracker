import { test, expect } from '@playwright/test';
import {
  uniqueUser, loginAs,
  createGroupViaAPI, joinGroupViaAPI,
  setupTwoUsersInGroup,
} from './helpers';

test.describe('Groups', () => {
  // ── GRP-1: Create group ─────────────────────────────────────────────────────
  test('GRP-1: create a group and display invite code', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    await page.getByRole('button', { name: '+ Create Group' }).click();
    await page.getByPlaceholder('e.g., Gym Bros').fill('Study Squad');
    await page.getByRole('button', { name: 'Create Group', exact: true }).click();

    await expect(page.getByText('Study Squad').first()).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /^[A-Z0-9]{6}$/ })).toBeVisible();
  });

  // ── GRP-3: Member count after creation ─────────────────────────────────────
  test('GRP-3: group header shows "1/8 members" after creation', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    await page.getByRole('button', { name: '+ Create Group' }).click();
    await page.getByPlaceholder('e.g., Gym Bros').fill('Solo Hive');
    await page.getByRole('button', { name: 'Create Group', exact: true }).click();

    await expect(page.getByText('1/8 members')).toBeVisible();
  });

  // ── GRP-4: Short name keeps Create button disabled ─────────────────────────
  test('GRP-4: Create button stays disabled for name shorter than 3 characters', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    await page.getByRole('button', { name: '+ Create Group' }).click();
    const createBtn = page.getByRole('button', { name: 'Create Group', exact: true });
    await expect(createBtn).toBeDisabled();

    await page.getByPlaceholder('e.g., Gym Bros').fill('AB');
    await expect(createBtn).toBeDisabled();

    await page.getByPlaceholder('e.g., Gym Bros').fill('ABC');
    await expect(createBtn).toBeEnabled();
  });

  // ── GRP-5: Description shown in group header ────────────────────────────────
  test('GRP-5: create group with description → description shown in group header', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    await page.getByRole('button', { name: '+ Create Group' }).click();
    await page.getByPlaceholder('e.g., Gym Bros').fill('Fitness Crew');
    await page.getByPlaceholder('Optional').fill('Stay fit together');
    await page.getByRole('button', { name: 'Create Group', exact: true }).click();

    await expect(page.getByText('Stay fit together')).toBeVisible();
  });

  // ── GRP-6: Join with valid code ─────────────────────────────────────────────
  test('GRP-6: join a group via invite code', async ({ page, browser }) => {
    const userA = uniqueUser();
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    const { token: tokenA } = await loginAs(pageA, userA);
    const group = await createGroupViaAPI(tokenA, 'Yoga Crew');
    await contextA.close();

    const userB = uniqueUser();
    await loginAs(page, userB);

    await page.getByRole('button', { name: '+ Join Group' }).click();
    await page.getByPlaceholder('ABC123').fill(group.inviteCode);
    await page.getByRole('button', { name: /Join the Hive/i }).click();

    await expect(page.getByText('Yoga Crew')).toBeVisible();
  });

  // ── GRP-7: Invalid code shows error ────────────────────────────────────────
  test('GRP-7: rejects invalid invite code', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    await page.getByRole('button', { name: '+ Join Group' }).click();
    await page.getByPlaceholder('ABC123').fill('XXXXXX');
    await page.getByRole('button', { name: /Join the Hive/i }).click();

    await expect(page.getByText(/code doesn't match/i)).toBeVisible();
  });

  // ── GRP-8: Input auto-uppercases ────────────────────────────────────────────
  test('GRP-8: invite code input auto-uppercases typed text', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    await page.getByRole('button', { name: '+ Join Group' }).click();
    const input = page.getByPlaceholder('ABC123');
    await input.fill('abcdef');

    const value = await input.inputValue();
    expect(value).toBe('ABCDEF');
  });

  // ── GRP-9: Join button disabled when code < 6 chars ────────────────────────
  test('GRP-9: Join button disabled when code is shorter than 6 characters', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    await page.getByRole('button', { name: '+ Join Group' }).click();
    const joinBtn = page.getByRole('button', { name: /Join the Hive/i });
    await page.getByPlaceholder('ABC123').fill('ABC12');
    await expect(joinBtn).toBeDisabled();

    await page.getByPlaceholder('ABC123').fill('ABC123');
    await expect(joinBtn).toBeEnabled();
  });

  // ── GRP-10: Lowercase code works (UI auto-uppercases) ──────────────────────
  test('GRP-10: join with lowercase invite code works', async ({ page, browser }) => {
    const userA = uniqueUser();
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    const { token: tokenA } = await loginAs(pageA, userA);
    const group = await createGroupViaAPI(tokenA, 'Case Test Group');
    await contextA.close();

    const userB = uniqueUser();
    await loginAs(page, userB);

    await page.getByRole('button', { name: '+ Join Group' }).click();
    await page.getByPlaceholder('ABC123').fill(group.inviteCode.toLowerCase());
    await page.getByRole('button', { name: /Join the Hive/i }).click();

    await expect(page.getByText('Case Test Group')).toBeVisible();
  });

  // ── GRP-11: Already a member shows error ───────────────────────────────────
  test('GRP-11: already a member shows "already in this hive" error', async ({ page, browser }) => {
    const userA = uniqueUser();
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    const { token: tokenA } = await loginAs(pageA, userA);
    const group = await createGroupViaAPI(tokenA, 'Dupe Test Group');
    await contextA.close();

    const userB = uniqueUser();
    const { token: tokenB } = await loginAs(page, userB);
    await joinGroupViaAPI(tokenB, group.inviteCode);
    await page.reload();

    await page.getByRole('button', { name: '+ Join Group' }).click();
    await page.getByPlaceholder('ABC123').fill(group.inviteCode);
    await page.getByRole('button', { name: /Join the Hive/i }).click();

    await expect(page.getByText(/already in this hive/i)).toBeVisible();
  });

  // ── GRP-12: Copy invite code ────────────────────────────────────────────────
  test('GRP-12: clicking invite code shows "Copied! ✓"', async ({ page, context }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    await page.getByRole('button', { name: '+ Create Group' }).click();
    await page.getByPlaceholder('e.g., Gym Bros').fill('Clipboard Group');
    await page.getByRole('button', { name: 'Create Group', exact: true }).click();

    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.locator('button').filter({ hasText: /^[A-Z0-9]{6}$/ }).click();

    await expect(page.getByText('Copied! ✓')).toBeVisible();
  });

  // ── GRP-13: "Copied! ✓" reverts to code ───────────────────────────────────
  test('GRP-13: "Copied! ✓" reverts to the invite code after ~2 seconds', async ({ page, context }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    await page.getByRole('button', { name: '+ Create Group' }).click();
    await page.getByPlaceholder('e.g., Gym Bros').fill('Revert Test Group');
    await page.getByRole('button', { name: 'Create Group', exact: true }).click();

    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const codeBtn = page.locator('button').filter({ hasText: /^[A-Z0-9]{6}$/ });
    const inviteCode = (await codeBtn.textContent())?.trim();
    await codeBtn.click();

    await expect(page.getByText('Copied! ✓')).toBeVisible();
    // Reverts after 2 seconds (timeout 4s)
    await expect(page.locator('button').filter({ hasText: new RegExp(`^${inviteCode}$`) })).toBeVisible({ timeout: 4000 });
  });

  // ── GRP-14: Member count increases after join ──────────────────────────────
  test('GRP-14: after User B joins, User A sees member count update', async ({ browser }) => {
    const { userA, userB, groupId } = await setupTwoUsersInGroup(browser, 'Count Test Group');

    await userA.page.locator('button').filter({ hasText: 'Count Test Group' }).first().click();
    await expect(userA.page.getByText('2/8 members')).toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── GRP-15: Non-creator leave confirmation ─────────────────────────────────
  test('GRP-15: non-creator clicking Leave shows "shared habits will be hidden" warning', async ({ page, browser }) => {
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    const userA = uniqueUser();
    const { token: tokenA } = await loginAs(pageA, userA);
    const group = await createGroupViaAPI(tokenA, 'Leave Test Group');
    await contextA.close();

    const userB = uniqueUser();
    const { token: tokenB } = await loginAs(page, userB);
    await joinGroupViaAPI(tokenB, group.inviteCode);
    await page.reload();

    await page.locator('button').filter({ hasText: 'Leave Test Group' }).first().click();
    await page.getByRole('button', { name: 'Leave', exact: true }).first().click();

    await expect(page.getByText(/shared habits will be hidden/i)).toBeVisible();
  });

  // ── GRP-16: Confirm leave removes group ────────────────────────────────────
  test('GRP-16: confirming leave removes group from sidebar', async ({ page, browser }) => {
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    const userA = uniqueUser();
    const { token: tokenA } = await loginAs(pageA, userA);
    const group = await createGroupViaAPI(tokenA, 'Leave Confirm Group');
    await contextA.close();

    const userB = uniqueUser();
    const { token: tokenB } = await loginAs(page, userB);
    await joinGroupViaAPI(tokenB, group.inviteCode);
    await page.reload();

    await page.locator('button').filter({ hasText: 'Leave Confirm Group' }).first().click();
    // First "Leave" opens confirmation; second "Leave" (in the confirmation) confirms
    await page.getByRole('button', { name: 'Leave', exact: true }).first().click();
    await expect(page.getByText(/shared habits will be hidden/i)).toBeVisible();
    await page.getByRole('button', { name: 'Leave', exact: true }).last().click();

    await expect(page.getByText('Leave Confirm Group')).not.toBeVisible();
  });

  // ── GRP-17: Stay cancels leave ─────────────────────────────────────────────
  test('GRP-17: clicking "Stay" dismisses leave confirmation, group remains', async ({ page, browser }) => {
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    const userA = uniqueUser();
    const { token: tokenA } = await loginAs(pageA, userA);
    const group = await createGroupViaAPI(tokenA, 'Stay Test Group');
    await contextA.close();

    const userB = uniqueUser();
    const { token: tokenB } = await loginAs(page, userB);
    await joinGroupViaAPI(tokenB, group.inviteCode);
    await page.reload();

    await page.locator('button').filter({ hasText: 'Stay Test Group' }).first().click();
    await page.getByRole('button', { name: 'Leave', exact: true }).first().click();
    await page.getByRole('button', { name: 'Stay', exact: true }).click();

    await expect(page.getByText(/shared habits will be hidden/i)).not.toBeVisible();
    await expect(page.getByText('Stay Test Group')).toBeVisible();
  });

  // ── GRP-18: Creator sees "Delete" not "Leave" ──────────────────────────────
  test('GRP-18: creator sees "Delete" button instead of "Leave"', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    await page.getByRole('button', { name: '+ Create Group' }).click();
    await page.getByPlaceholder('e.g., Gym Bros').fill('Creator Group');
    await page.getByRole('button', { name: 'Create Group', exact: true }).click();

    await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Leave', exact: true })).not.toBeVisible();
  });

  // ── GRP-19: Creator confirms delete ────────────────────────────────────────
  test('GRP-19: creator confirms delete → "Dissolve the hive?" shown and group removed', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    await page.getByRole('button', { name: '+ Create Group' }).click();
    await page.getByPlaceholder('e.g., Gym Bros').fill('Doomed Group');
    await page.getByRole('button', { name: 'Create Group', exact: true }).click();

    await page.getByRole('button', { name: 'Delete' }).first().click();
    await expect(page.getByText(/Dissolve the hive/i)).toBeVisible();
    // Second "Delete" inside confirmation confirms
    await page.getByRole('button', { name: 'Delete' }).last().click();

    await expect(page.getByText('Doomed Group')).not.toBeVisible();
  });

  // ── GRP-20: Members lose deleted group on reload ───────────────────────────
  test('GRP-20: after creator deletes, other members lose the group on reload', async ({ browser }) => {
    const { userA, userB } = await setupTwoUsersInGroup(browser, 'Dissolving Group');

    await userA.page.locator('button').filter({ hasText: 'Dissolving Group' }).first().click();
    await userA.page.getByRole('button', { name: 'Delete' }).first().click();
    await expect(userA.page.getByText(/Dissolve the hive/i)).toBeVisible();
    await userA.page.getByRole('button', { name: 'Delete' }).last().click();

    await userB.page.reload();
    await expect(userB.page.getByText('Dissolving Group')).not.toBeVisible();

    await userA.context.close();
    await userB.context.close();
  });

  // ── GRP-21: Max groups limit on create ─────────────────────────────────────
  test('GRP-21: user in 5 groups tries to create a 6th → error', async ({ page }) => {
    const user = uniqueUser();
    const { token } = await loginAs(page, user);

    // Create 5 groups via API (limit is 5)
    for (let i = 1; i <= 5; i++) {
      await createGroupViaAPI(token, `Group ${i}`);
    }
    await page.reload();

    // Try to create a 6th via UI
    await page.getByRole('button', { name: '+ Create Group' }).click();
    await page.getByPlaceholder('e.g., Gym Bros').fill('Group Six');
    await page.getByRole('button', { name: 'Create Group', exact: true }).click();

    await expect(page.getByText(/5 groups/i)).toBeVisible();
  });

  // ── GRP-22: Max groups limit on join ───────────────────────────────────────
  test('GRP-22: user in 5 groups tries to join a 6th → error', async ({ page, browser }) => {
    const user = uniqueUser();
    const { token } = await loginAs(page, user);

    // Fill up 5 groups via API
    for (let i = 1; i <= 5; i++) {
      await createGroupViaAPI(token, `My Group ${i}`);
    }

    // Create a 6th group owned by someone else
    const contextOwner = await browser.newContext();
    const pageOwner = await contextOwner.newPage();
    const owner = uniqueUser();
    const { token: ownerToken } = await loginAs(pageOwner, owner);
    const extraGroup = await createGroupViaAPI(ownerToken, 'Extra Group');
    await contextOwner.close();

    await page.reload();
    await page.getByRole('button', { name: '+ Join Group' }).click();
    await page.getByPlaceholder('ABC123').fill(extraGroup.inviteCode);
    await page.getByRole('button', { name: /Join the Hive/i }).click();

    await expect(page.getByText(/5 groups/i)).toBeVisible();
  });

  // ── GRP-23: Group capacity (8 members) ─────────────────────────────────────
  test('GRP-23: group at 8 members → 9th user gets "hive is full" error', async ({ page, browser }) => {
    const owner = uniqueUser();
    const contextOwner = await browser.newContext();
    const pageOwner = await contextOwner.newPage();
    const { token: ownerToken } = await loginAs(pageOwner, owner);
    const group = await createGroupViaAPI(ownerToken, 'Full Hive');
    await contextOwner.close();

    // 7 more users join via API (total = 8 including owner)
    for (let i = 0; i < 7; i++) {
      const u = uniqueUser();
      const ctx = await browser.newContext();
      const pg = await ctx.newPage();
      const { token } = await loginAs(pg, u);
      await joinGroupViaAPI(token, group.inviteCode);
      await ctx.close();
    }

    // 9th user tries to join via UI
    const ninth = uniqueUser();
    await loginAs(page, ninth);
    await page.getByRole('button', { name: '+ Join Group' }).click();
    await page.getByPlaceholder('ABC123').fill(group.inviteCode);
    await page.getByRole('button', { name: /Join the Hive/i }).click();

    await expect(page.getByText(/hive is full/i)).toBeVisible();
  });

  // ── GRP-24: No groups empty state ──────────────────────────────────────────
  test('GRP-24: no groups shows "Time to rally the squad!" empty state', async ({ page }) => {
    const user = uniqueUser();
    await loginAs(page, user);

    await expect(page.getByText(/Time to rally the squad/i)).toBeVisible();
  });
});
