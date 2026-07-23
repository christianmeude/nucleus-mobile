# NUcleus Mobile

NUcleus Mobile is a React Native (Expo) app for enrolled students at National University — Dasmariñas. It provides a mobile interface for browsing research, submitting papers, reading paper details, and managing student notifications and invitations.

## Features

- Student authentication and session persistence
- Browse published research with search and category filters
- View research details and PDF links
- Submit and resubmit research papers with draft autosave
- Access My Papers and dashboard summaries
- Manage notifications and co-author invitations

## Tech Stack

- React Native (Expo)
- TypeScript
- Supabase (Auth, Database, Storage)
- React Navigation
- AsyncStorage

## Setup

1. Install dependencies

```bash
npm install
```

2. Configure environment variables

Create a `.env` file from `.env.example` and set:

```bash
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

3. Start the development server

```bash
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS) to run the app on your device. If you're on a network with connectivity issues, use tunnel mode:

```bash
npx expo start --tunnel
```

## Documentation

- [PROJECT_CONTEXT.md](./docs/PROJECT_CONTEXT.md)
- [PRODUCT_ROADMAP.md](./docs/PRODUCT_ROADMAP.md)
- [SUPABASE_MIGRATION.md](./docs/plans/SUPABASE_MIGRATION.md)
- [UI_OVERHAUL.md](./docs/plans/UI_OVERHAUL.md)
- [SUBMIT_RESEARCH.md](./docs/plans/SUBMIT_RESEARCH.md)
- [Conventions](./docs/CONVENTIONS.md)
