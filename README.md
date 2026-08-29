# NUcleus Mobile

NUcleus Mobile is the official React Native (Expo) app for enrolled students and faculty at National University — Dasmariñas. It provides a unified mobile command center for browsing research, submitting papers, and conducting faculty reviews of academic submissions.

## Features

**For Students:**
- Browse and search published research with category filters
- View research details, abstracts, and access PDF links
- Submit new research papers and manage revisions
- Real-time status tracking via the progress map
- Manage notifications and co-author invitations

**For Faculty & Admins:**
- Dedicated command center and workload dashboards
- Review Queue for managing pending paper approvals
- Approve, reject, or request revisions for submissions
- Process formal publication requests and assign DOIs

## Tech Stack

- **Framework:** React Native (Expo)
- **Language:** TypeScript
- **Backend:** Supabase (Auth, Database, Storage, Edge Functions)
- **Navigation:** React Navigation
- **State & Local Storage:** AsyncStorage

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
Create a `.env` file from `.env.example` and set:
```bash
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

3. Start the development server:
```bash
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS) to run the app on your device.

## Core Documentation

The project's architectural and product decisions are documented in the root directory:

- **[CONTEXT.md](./CONTEXT.md)**: The definitive domain glossary and ubiquitous language.
- **[DESIGN.md](./DESIGN.md)**: The design system, strict UI constraints, and styling guidelines (Modern Clarity).
- **[PRODUCT.md](./PRODUCT.md)**: Core product mechanics, user roles, and feature specifications.
