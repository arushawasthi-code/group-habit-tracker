# HabitHive — Playwright E2E Test Cases

> Scope: User-visible workflows through the real UI. Business logic edge cases
> (streak math, DB constraints, JSON parsing) belong in unit/integration tests.
> Exception: **privacy/visibility** is tested here AND at the API level because
> leaking a private habit is a trust violation.

## Notation

- **[exists]** — test already implemented
- **[new]** — test to be written
- **Priority**: P0 = must-have for MVP confidence, P1 = important, P2 = nice-to-have
- Multi-user tests use separate Playwright browser contexts (industry standard for real-time apps)

---

## 1. Authentication

### 1.1 Registration

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| AUTH-1 | Register with valid username, display name, and password → lands on main app with sidebar visible | P0 | [exists] |
| AUTH-2 | Register with duplicate username → shows "taken" error message | P0 | [exists] |
| AUTH-3 | Register with short password (<8 chars) → form validation prevents submission or shows error | P0 | [new] |
| AUTH-4 | Register with short username (<3 chars) → shows validation error | P1 | [new] |
| AUTH-5 | Register with special characters in username (e.g., "user@name") → shows validation error | P1 | [new] |
| AUTH-6 | Register with empty display name → uses username as fallback or shows error | P2 | [new] |
| AUTH-7 | Toggle between Log In and Sign Up tabs → display name field appears/disappears | P1 | [new] |

### 1.2 Login

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| AUTH-8 | Login with correct credentials → lands on main app | P0 | [exists] (part of AUTH-1 flow) |
| AUTH-9 | Login with wrong password → shows "wrong password" error | P0 | [exists] |
| AUTH-10 | Unauthenticated user sees login page, not main app | P0 | [exists] |
| AUTH-11 | Login button shows "Summoning motivation..." while loading | P2 | [new] |

### 1.3 Session Persistence

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| AUTH-12 | After login, reload page → user remains logged in (JWT in localStorage) | P0 | [new] |
| AUTH-13 | Clear localStorage and reload → user is logged out, sees login page | P1 | [new] |

### 1.4 Logout

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| AUTH-14 | Click logout button in sidebar → returns to login page, localStorage cleared | P0 | [new] |

---

## 2. Habit Management

### 2.1 Create Habit

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| HAB-1 | Create a daily habit with name only → appears in sidebar | P0 | [exists] |
| HAB-2 | Create a habit with name + description → both displayed in detail view | P1 | [new] |
| HAB-3 | Create a weekly habit → frequency badge shows "Weekly" | P1 | [new] |
| HAB-4 | Create a custom-frequency habit with specific days → frequency badge shows "Custom · Mon,Wed,Fri" | P1 | [new] |
| HAB-5 | Create habit with empty name → Create button stays disabled | P0 | [new] |
| HAB-6 | Modal closes after successful creation | P1 | [new] |
| HAB-7 | Modal close button (✕) dismisses without creating | P1 | [new] |
| HAB-8 | Click overlay backdrop → modal dismisses | P2 | [new] |

### 2.2 View Habit

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| HAB-9 | Click habit in sidebar → detail view shows name, description, frequency badge, streaks | P0 | [new] |
| HAB-10 | Newly created habit shows streak = 0 with copy "Day 0. Every legend has an origin story." | P1 | [new] |
| HAB-11 | Selecting a habit deselects any selected group (mutual exclusion) | P1 | [new] |

### 2.3 Complete Habit

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| HAB-12 | Mark habit complete → button changes to "Done for today! 🎉" (green) | P0 | [exists] |
| HAB-13 | Mark complete → streak increments to 1, longest streak updates | P0 | [new] |
| HAB-14 | Mark complete → confetti animation fires (canvas-confetti is called) | P1 | [new] |
| HAB-15 | Completed habit → button is disabled, cannot click again | P0 | [exists] |
| HAB-16 | Completed habit shows green checkmark circle in sidebar | P1 | [new] |
| HAB-17 | After completing, "Share to group?" prompt appears if user has groups | P1 | [new] |
| HAB-18 | Share prompt auto-dismisses after ~8 seconds | P2 | [new] |

### 2.4 Edit Habit

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| HAB-19 | Click edit (✏️) → switches to edit mode with current name/description in inputs | P0 | [new] |
| HAB-20 | Edit name and save → name updates in detail view and sidebar | P0 | [new] |
| HAB-21 | Edit and cancel → reverts to original values | P1 | [new] |
| HAB-22 | Edit does NOT reset streak (verify streak unchanged after save) | P1 | [new] |

### 2.5 Delete Habit

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| HAB-23 | Click delete (🗑️) → confirmation prompt shows "Your streak will cry" | P0 | [exists] |
| HAB-24 | Confirm delete → habit removed from sidebar, detail view clears | P0 | [exists] |
| HAB-25 | Click "Keep it" → dismisses confirmation, habit remains | P1 | [new] |

### 2.6 Empty State

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| HAB-26 | No habits exist → sidebar shows "No habits yet? Couldn't be me 👀" | P1 | [new] |

---

## 3. Groups

### 3.1 Create Group

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| GRP-1 | Create group with valid name → appears in sidebar, group view opens | P0 | [exists] |
| GRP-2 | Group header shows 6-character invite code | P0 | [exists] |
| GRP-3 | Group header shows "1/8 members" after creation (creator is first member) | P1 | [new] |
| GRP-4 | Create group with name < 3 characters → Create button stays disabled | P1 | [new] |
| GRP-5 | Create group with description → description shown in group header | P2 | [new] |

### 3.2 Join Group

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| GRP-6 | Join with valid invite code → group appears in sidebar, group view opens | P0 | [exists] |
| GRP-7 | Join with invalid code → shows "code doesn't match" error | P0 | [exists] |
| GRP-8 | Invite code input auto-uppercases typed text | P1 | [new] |
| GRP-9 | Join button disabled when code < 6 characters | P1 | [new] |
| GRP-10 | Join with lowercase code works (case-insensitive) | P1 | [new] |
| GRP-11 | Already a member → shows "already in this hive" error | P1 | [new] |

### 3.3 Invite Code

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| GRP-12 | Click invite code button → copies to clipboard, button shows "Copied! ✓" | P1 | [new] |
| GRP-13 | "Copied! ✓" reverts to code after ~2 seconds | P2 | [new] |

### 3.4 Group Member Count

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| GRP-14 | After User B joins, User A sees member count increase (reload or re-navigate) | P1 | [new] |

### 3.5 Leave Group

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| GRP-15 | Non-creator clicks "Leave" → confirmation shows "Your shared habits will be hidden" | P0 | [new] |
| GRP-16 | Confirm leave → group removed from sidebar | P0 | [new] |
| GRP-17 | Click "Stay" → dismisses confirmation, group remains | P1 | [new] |

### 3.6 Delete Group

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| GRP-18 | Creator sees "Delete" instead of "Leave" | P0 | [new] |
| GRP-19 | Creator confirms delete → group removed from sidebar, shows "Dissolve the hive?" text | P0 | [new] |
| GRP-20 | After creator deletes group, other members no longer see it (on reload) | P1 | [new] |

### 3.7 Group Limits

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| GRP-21 | User in 5 groups tries to create a 6th → shows "5 groups already" error | P1 | [new] |
| GRP-22 | User in 5 groups tries to join a 6th → shows "5 groups already" error | P1 | [new] |
| GRP-23 | Group at 8 members → 9th user tries to join → shows "hive is full" error | P1 | [new] |

### 3.8 Empty State

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| GRP-24 | No groups exist → sidebar shows "No groups yet. Time to rally the squad!" | P1 | [new] |

---

## 4. Habit Visibility & Privacy

### 4.1 Default Visibility

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| VIS-1 | New user's default is HideAll → create a habit → it has no groups in visibility section | P0 | [new] |
| VIS-2 | Private habit (HideAll, no overrides) is NOT visible in group habits API | P0 | [exists] |

### 4.2 Sharing Habits

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| VIS-3 | Toggle a group checkbox ON in habit detail → habit appears in that group's Members & Habits tab | P0 | [exists] |
| VIS-4 | Toggle a group checkbox OFF → habit disappears from that group's view | P0 | [new] |
| VIS-5 | Share habit with Group A but not Group B → visible in A, NOT in B | P0 | [new] |

### 4.3 Privacy Under State Changes

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| VIS-6 | User leaves group → their shared habits vanish from that group's habits view (verified by other member) | P0 | [new] |
| VIS-7 | User deletes a shared habit → habit vanishes from group's habits view | P1 | [new] |

### 4.4 API-Level Privacy Probing

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| VIS-8 | GET /groups/{id}/habits NEVER includes unshared habits — verified with raw API request from second user's context | P0 | [exists] |
| VIS-9 | Non-member cannot access group habits endpoint (403) — raw API request from non-member | P0 | [new] |

---

## 5. Group Chat — Text Messages

### 5.1 Sending Messages

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| CHAT-1 | Type text and click send → message appears in chat as own message (right-aligned, honey bubble) | P0 | [new] |
| CHAT-2 | Type text and press Enter → same as clicking send | P0 | [new] |
| CHAT-3 | Send button disabled when input is empty | P1 | [new] |
| CHAT-4 | Input clears after sending | P1 | [new] |

### 5.2 Real-Time Message Delivery (Multi-User)

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| CHAT-5 | User A sends a message → User B (in same group, separate browser context) sees it appear without refresh | P0 | [new] |
| CHAT-6 | User B's received message shows as left-aligned with sender name and avatar | P1 | [new] |
| CHAT-7 | Messages show timestamp (HH:MM format) | P2 | [new] |

### 5.3 Message Ordering

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| CHAT-8 | Send multiple messages rapidly → they appear in chronological order | P1 | [new] |

### 5.4 Pagination

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| CHAT-9 | Send 51+ messages → "Load more messages..." link appears at top of chat | P1 | [new] |
| CHAT-10 | Click "Load more" → older messages prepend above existing messages | P1 | [new] |

### 5.5 Chat Empty State

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| CHAT-11 | New group with no messages → shows "It's quiet... too quiet. Say something! 🐝" | P1 | [new] |

### 5.6 Chat Tab Navigation

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| CHAT-12 | Group view defaults to Chat tab | P1 | [new] |
| CHAT-13 | Switch to Members & Habits tab → shows member cards with shared habits | P1 | [new] |
| CHAT-14 | Switch back to Chat tab → messages are preserved (not re-fetched from scratch) | P2 | [new] |

---

## 6. Group Chat — GIF Messages

### 6.1 GIF Picker

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| GIF-1 | Click 🎬 button → GIF picker panel slides up from bottom | P1 | [new] |
| GIF-2 | Click 🎬 button again → picker closes (toggle) | P1 | [new] |
| GIF-3 | GIF search input autofocuses when picker opens | P2 | [new] |
| GIF-4 | Opening GIF picker closes special message picker (mutual exclusion) | P1 | [new] |

### 6.2 GIF Search & Send (Requires Tenor API Key)

> These tests require a configured Tenor API key. Skip in CI if key is absent.

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| GIF-5 | Type search query → GIF grid populates after debounce (~300ms) | P1 | [new] |
| GIF-6 | Click a GIF in the grid → GIF message appears in chat, picker closes | P1 | [new] |
| GIF-7 | GIF message renders as inline image (not as text URL) | P1 | [new] |
| GIF-8 | Search with no results → shows "The GIF bees are on break" message | P2 | [new] |

### 6.3 GIF Button Without API Key

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| GIF-9 | When Tenor key is empty, GIF search returns empty array — picker shows no results but does not error | P1 | [new] |

---

## 7. Group Chat — Habit Completion Posts

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| COMP-1 | Complete habit → click group name in share prompt → completion card appears in that group's chat | P0 | [new] |
| COMP-2 | Completion card shows habit name and streak count | P1 | [new] |
| COMP-3 | Completion card shows sender name and "completed a habit!" text | P1 | [new] |
| COMP-4 | Other group members see the completion card in real-time | P1 | [new] |

---

## 8. Group Chat — Special Messages

### 8.1 Special Message Picker

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| SPEC-1 | Click ⭐ button → special message picker slides up | P0 | [new] |
| SPEC-2 | Three template buttons visible: Lock In (🔒), You Can Do This (💪), Stop Being Lazy (😤) | P0 | [new] |
| SPEC-3 | Select a template → habit dropdown and caption input appear | P0 | [new] |
| SPEC-4 | Habit dropdown lists only OTHER members' shared habits (not own) | P0 | [new] |
| SPEC-5 | No other members' shared habits → shows "No shared habits from other members to reference" | P1 | [new] |
| SPEC-6 | Send button disabled until a habit is selected | P1 | [new] |
| SPEC-7 | Opening special picker closes GIF picker (mutual exclusion) | P1 | [new] |

### 8.2 Sending Special Messages

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| SPEC-8 | Send "Lock In" message → card appears in chat with amber left border, 🔒 icon, habit name chip | P0 | [new] |
| SPEC-9 | Send "You Can Do This" → card with green left border, 💪 icon | P1 | [new] |
| SPEC-10 | Send "Stop Being Lazy" → card with coral left border, 😤 icon | P1 | [new] |
| SPEC-11 | Caption included → shows in italic below template title | P1 | [new] |
| SPEC-12 | Other group members see the special message in real-time | P1 | [new] |

### 8.3 Special Message Constraints

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| SPEC-13 | Cannot target own habit — own habits do not appear in the dropdown | P0 | [new] |
| SPEC-14 | Cannot target a habit not shared with the group — unshared habits not in dropdown | P0 | [new] |

---

## 9. Group Chat — Habit Suggestions

### 9.1 Sending Suggestions

> Suggestion sending requires the special message picker or a dedicated UI flow.
> Currently, suggestions are sent via SignalR. If no dedicated UI exists yet for
> sending suggestions (only for receiving/responding), note that and test via API.

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| SUG-1 | Suggestion card appears in chat with purple left border, 💡 icon | P1 | [new] |
| SUG-2 | Card shows suggestion type badge ("Split" / "Combine" / "Reword") | P1 | [new] |
| SUG-3 | Card shows target habit name and target user name | P1 | [new] |

### 9.2 Responding to Suggestions

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| SUG-4 | Target user sees Accept ✓ and Dismiss ✗ buttons on a Pending suggestion | P0 | [new] |
| SUG-5 | Non-target user does NOT see Accept/Dismiss buttons | P0 | [new] |
| SUG-6 | Click Accept → card updates to show "✓ Accepted" in green | P0 | [new] |
| SUG-7 | Click Dismiss → card updates to show "Dismissed" in muted text | P0 | [new] |
| SUG-8 | After accept/dismiss, buttons disappear (cannot respond twice) | P1 | [new] |
| SUG-9 | Other members see the status update in real-time (via SuggestionUpdated event) | P1 | [new] |

### 9.3 Suggestion Application (Accept Effects)

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| SUG-10 | Accept a "Reword" suggestion → habit name changes in the user's habit list | P1 | [new] |
| SUG-11 | Accept a "Split" suggestion → original habit removed, new habits created in sidebar | P1 | [new] |

---

## 10. Sidebar & Navigation

### 10.1 Layout

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| NAV-1 | Sidebar visible on app load with habits and groups sections | P0 | [new] |
| NAV-2 | Collapse sidebar (← button) → sidebar shrinks to icon-only width | P1 | [new] |
| NAV-3 | Expand sidebar (→ button) → sidebar returns to full width with content | P1 | [new] |

### 10.2 Selection

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| NAV-4 | Click habit → detail view shown, any selected group deselected | P0 | [new] |
| NAV-5 | Click group → group view shown, any selected habit deselected | P0 | [new] |
| NAV-6 | Selected habit has amber-light background highlight in sidebar | P1 | [new] |
| NAV-7 | Selected group has amber-light background highlight in sidebar | P1 | [new] |

### 10.3 Welcome State

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| NAV-8 | No selection → welcome screen with bee emoji and "Welcome to HabitHive!" | P0 | [new] |
| NAV-9 | New user (no habits, no groups) → welcome screen shows "Start by creating a habit or joining a group!" | P1 | [new] |

### 10.4 User Profile

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| NAV-10 | Sidebar shows user avatar (first letter), display name, @username | P1 | [new] |

---

## 11. Group — Members & Habits Tab

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| MH-1 | Members & Habits tab shows a card per group member | P0 | [new] |
| MH-2 | Each member card shows avatar, display name | P1 | [new] |
| MH-3 | Current user's card shows "You" badge | P1 | [new] |
| MH-4 | Member with shared habits → habits listed with completion status and streak | P0 | [new] |
| MH-5 | Member with no shared habits → shows "No shared habits yet" | P1 | [new] |
| MH-6 | Completed habit in group view shows green checkmark | P1 | [new] |

---

## 12. Cross-Feature Workflows

These test complex, realistic user journeys spanning multiple features.

### 12.1 Onboarding Flow

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| FLOW-1 | Full onboarding: register → create first habit → complete it → see confetti → streak shows 1 | P0 | [new] |
| FLOW-2 | Social onboarding: register → create group → share invite code → second user joins with code → both see each other in members list | P0 | [new] |

### 12.2 Sharing Flow

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| FLOW-3 | User A creates habit → shares it with group → User B sees it in Members & Habits tab → User A completes it → User B sees checkmark update (on reload) | P0 | [new] |

### 12.3 Chat Flow

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| FLOW-4 | User A and User B in same group → A sends text → B sees it → B replies → A sees reply — all in real-time without page refresh | P0 | [new] |

### 12.4 Special Message Flow

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| FLOW-5 | User A shares habit → User B sends "Lock In" special message targeting A's habit → both see the styled card in chat | P0 | [new] |

### 12.5 Suggestion Flow (End-to-End)

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| FLOW-6 | User A shares habit → User B sends "Reword" suggestion via API → card appears in chat → User A clicks Accept → habit name changes | P1 | [new] |

### 12.6 Privacy Flow

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| FLOW-7 | User A has 2 habits, shares only one with group → User B sees exactly 1 habit in group view, not 2 | P0 | [new] |
| FLOW-8 | User A shares habit with group → leaves group → User B no longer sees A's habit (on reload) | P0 | [new] |

### 12.7 Group Lifecycle

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| FLOW-9 | Create group → invite 2 users → chat together → one user leaves → remaining user sees updated member count (on reload) | P1 | [new] |
| FLOW-10 | Creator deletes group → all members lose the group from their sidebar (on reload) | P1 | [new] |

---

## 13. Edge Cases & Error Handling

| ID | Test Case | Priority | Status |
|----|-----------|----------|--------|
| EDGE-1 | Attempt to access app with expired/invalid JWT (manually set bad token in localStorage) → app shows login page | P1 | [new] |
| EDGE-2 | Create habit while not in any groups → visibility section does not appear (no groups to share with) | P1 | [new] |
| EDGE-3 | Group with only 1 member (creator) → Members & Habits tab shows only creator | P2 | [new] |
| EDGE-4 | Rapid double-click on "Mark Complete" → only one completion recorded, no error | P1 | [new] |
| EDGE-5 | Send empty message (whitespace only) → send button stays disabled, nothing sent | P1 | [new] |
| EDGE-6 | Network error during habit creation → error message displayed in modal | P2 | [new] |

---

## Summary

| Category | Total | Exists | New |
|----------|-------|--------|-----|
| Authentication | 14 | 4 | 10 |
| Habit Management | 26 | 5 | 21 |
| Groups | 24 | 4 | 20 |
| Visibility & Privacy | 9 | 2 | 7 |
| Chat — Text | 14 | 0 | 14 |
| Chat — GIFs | 9 | 0 | 9 |
| Chat — Completion Posts | 4 | 0 | 4 |
| Chat — Special Messages | 14 | 0 | 14 |
| Chat — Suggestions | 11 | 0 | 11 |
| Sidebar & Navigation | 10 | 0 | 10 |
| Members & Habits Tab | 6 | 0 | 6 |
| Cross-Feature Workflows | 10 | 0 | 10 |
| Edge Cases | 6 | 0 | 6 |
| **Total** | **157** | **15** | **142** |

---

## Out of Scope for Playwright (Belongs in Unit/Integration Tests)

These test cases are critical but should be implemented with xUnit and
`WebApplicationFactory`, not Playwright:

- **Streak calculation**: daily consecutive days reset, weekly reset, custom-day
  reset, longest streak never decreases — requires time manipulation on the server
- **DB unique constraints**: double-completion via concurrent API calls (409 from
  unique index on `HabitId + CompletedDate`)
- **Suggestion application logic**: Split creates N habits with copied visibility,
  Combine deletes other habits, payload JSON parsing edge cases
- **Group member soft-delete**: LeftAt set correctly, re-join clears LeftAt
- **Auth token expiration**: JWT expires after 7 days
- **File upload validation**: 5MB limit (413), wrong MIME type (415)
- **Input sanitization**: XSS via habit names, chat messages, group names
- **Concurrent access**: Two users complete the same shared action simultaneously

---

## Notes for Implementation

1. **Multi-user tests** (`CHAT-5`, `FLOW-4`, etc.): Use `browser.newContext()` to
   create isolated sessions for each user. Each context gets its own localStorage
   and cookies. This is standard Playwright practice for real-time app testing.

2. **SignalR race conditions**: Add small waits (`expect(...).toBeVisible()` with
   Playwright's auto-retry, not `page.waitForTimeout`) after sending messages to
   account for SignalR delivery latency.

3. **Test data isolation**: Each test creates fresh users via `uniqueUser()` helper.
   Tests do not depend on or clean up after each other. The DB can be reset between
   full test suite runs by deleting `habithive.db`.

4. **GIF tests**: Conditionally skip GIF-5 through GIF-8 if no Tenor API key is
   configured. GIF-9 tests the graceful degradation path.

5. **Suggestion sending UI**: The current UI has no dedicated "send suggestion"
   button — suggestions are only sent via SignalR programmatically. Tests that
   need to create suggestions (SUG-1 through SUG-11, FLOW-6) should send them
   via the API or SignalR in the test setup, then verify the UI rendering and
   response flow.
