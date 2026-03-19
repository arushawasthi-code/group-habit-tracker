# 🐝 HabitHive

A habit tracker where the social layer is the core feature. Track personal habits, share them with groups, and encourage each other through rich real-time chat.

## Tech Stack

- **Backend:** ASP.NET Core 8 Web API + SignalR
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Database:** SQLite (via EF Core)
- **Auth:** JWT (username/password)

## Setup & Run

### Prerequisites
- [.NET 8+ SDK](https://dotnet.microsoft.com/download)
- [Node.js 18+](https://nodejs.org/)

### 1. Start the API

```bash
cd src/HabitHive.Api
dotnet run
```

The API runs at `http://localhost:5000`.

### 2. Start the Frontend (separate terminal)

```bash
cd src/habithive-client
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` and proxies API requests to the backend.

### 3. Open the App

Navigate to **http://localhost:5173** in your browser.

### GIF Support (Optional)

To enable GIF search in chat, add a [Tenor API key](https://developers.google.com/tenor/guides/quickstart) to `src/HabitHive.Api/appsettings.json`:

```json
"Tenor": {
  "ApiKey": "YOUR_TENOR_API_KEY"
}
```

If no key is configured, the GIF button is hidden — everything else works fine.

## Features

- **Habit Management** — Create, edit, delete habits with daily/weekly/custom frequency and streak tracking
- **Groups** — Create groups (max 8 members), share via invite code
- **Selective Sharing** — Choose which habits are visible to which groups (privacy-first: hidden by default)
- **Real-Time Chat** — SignalR-powered group chat with text, GIFs, habit completion posts, and special messages
- **Special Messages** — Send "Lock In" 🔒, "You Can Do This" 💪, or "Stop Being Lazy" 😤 to encourage friends
- **Habit Suggestions** — Suggest splitting, combining, or rewording a friend's habit

## Development

The repository is hosted on GitHub at `arushawasthi-code/group-habit-tracker`.

```bash
git clone git@github.com:arushawasthi-code/group-habit-tracker.git
cd group-habit-tracker
```

Work is done on feature/fix branches and merged into `master` via pull request. Branch naming: `fix/<topic>` for bugs, `feat/<topic>` for new features.

```bash
git checkout -b fix/my-topic     # create a branch
git push -u origin fix/my-topic  # push for review
```

## Notes

- Days reset at midnight UTC
- SQLite database is created automatically on first run (`habithive.db`)
- Photo uploads are stored locally in `wwwroot/uploads/`
