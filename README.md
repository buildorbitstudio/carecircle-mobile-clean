# CareCircle Mobile

Native mobile foundation for CareCircle, a family caregiving coordination app built with Expo
React Native and TypeScript.

## Stack

- Expo SDK 57 and Expo Router
- React Native and TypeScript
- Supabase client with persisted React Native auth sessions
- React Hook Form and Zod
- Zustand

## Setup

1. Install packages:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and add your public Supabase project values:

   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

   Only the public/anon key belongs in the app. Never add a Supabase service-role key.

3. Start Expo:

   ```bash
   npm start
   ```

   Then open the project with Expo Go, an Android emulator, or an iOS simulator.

## Structure

```text
src/
  app/             Expo Router screens and route groups
  components/      Reusable mobile UI
  lib/             External clients such as Supabase
  store/           Zustand application state
  theme/           Color, spacing, type, radius, and shadow tokens
  validation/      Shared Zod schemas
```

The family experience uses a five-tab navigation shell. Elder Mode is deliberately separate and
uses a simplified, high-contrast, large-target interface.

## Current scope

This milestone contains navigation, visual foundations, representative forms, placeholder feature
screens, local app state, and Supabase client setup. Authentication calls, database migrations,
RLS, notifications, persistence workflows, and full feature behavior are intentionally deferred.
