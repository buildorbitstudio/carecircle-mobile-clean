# CareCircle

CareCircle is a native, mobile-first family caregiving app for coordinating the daily care of an elderly loved one. It gives a trusted care circle one calm place to manage check-ins, medications, appointments, family tasks, emergency information, documents, and health history.

The signature feature is **Care Pings**. An approved family member sends a medication, wellness, hydration, meal, movement, or custom check-in. The elderly person receives a simplified Elder Mode screen and responds with one large button.

## Product

### Problem statement

Family care is often coordinated across calls, text messages, paper notes, calendars, and memory. Important updates become fragmented, responsibilities are unclear, and elderly family members are asked to navigate tools that were not designed for them. During an emergency, even basic information can be difficult to find quickly.

### Vision

CareCircle aims to become the trusted shared home for family caregiving: simple enough for an elderly person to use confidently, structured enough for a family to coordinate safely, and warm enough to feel supportive rather than clinical.

### Target users

- Adult children coordinating care for an elderly parent
- Spouses and relatives sharing caregiving responsibilities
- Elderly family members who need a low-complexity check-in experience
- Trusted family administrators managing access and emergency information
- Informal caregivers who need a clear view of assigned tasks and recent activity

### MVP goals

- Put the most important daily care information in one mobile app
- Make family check-ins fast to send and effortless to answer
- Give the family a shared, chronological record of meaningful care activity
- Reduce missed medications, unclear ownership, and repeated status calls
- Make emergency information readable and immediately actionable
- Enforce private, family-scoped data access through Supabase Row Level Security

### Key features

- Email/password authentication and guided family onboarding
- Family Dashboard with live care summaries
- Elder profiles and family memberships
- Care Pings with status and severity
- Accessible, large-button Elder Mode
- Medication schedules, reminders, and logs
- Health Timeline with filters and manual notes
- Appointments and family care tasks
- Emergency Mode with tap-to-call contacts
- Supabase-backed Document Vault
- Family invitations and role management
- Local notifications and Expo push-token registration

## Technical overview

### Tech stack

| Layer | Technology |
| --- | --- |
| Mobile framework | Expo SDK 54 |
| UI runtime | React Native 0.81.5, React 19.1 |
| Language | TypeScript 5.9 |
| Navigation | Expo Router 6 |
| Backend | Supabase |
| Database | PostgreSQL |
| Authentication | Supabase Auth |
| File storage | Supabase Storage |
| Forms | React Hook Form and Zod |
| Local client state | Zustand |
| Session/device persistence | AsyncStorage |
| Notifications | Expo Notifications and Expo Device |
| Icons | Expo Vector Icons |

### Required dependencies

The complete dependency list is maintained in `package.json`. Important runtime packages include:

- `expo`, `react`, `react-native`, and `typescript`
- `expo-router`, `react-native-screens`, and `react-native-safe-area-context`
- `@supabase/supabase-js` and `react-native-url-polyfill`
- `react-hook-form`, `@hookform/resolvers`, and `zod`
- `zustand` and `@react-native-async-storage/async-storage`
- `expo-notifications`, `expo-device`, and `expo-constants`
- `expo-document-picker`, `expo-file-system`, and `base64-arraybuffer`

Use `npm install` rather than installing these individually so npm resolves the versions committed in `package-lock.json`.

## Architecture

CareCircle uses a feature-oriented Expo Router architecture:

- Route files own screen composition and navigation.
- Feature folders own domain types, configuration, and Supabase data hooks.
- Shared UI primitives implement the design system and app-wide states.
- Supabase is the source of truth for authenticated family data.
- Zustand stores small amounts of transient app state such as onboarding values, role, and the active elder.
- React Hook Form and Zod own form state and validation.
- Providers restore authentication, expose toast feedback, and bootstrap notifications.

### State management approach

Server-backed care data is loaded and mutated through feature hooks using the Supabase client. It is not duplicated into the Zustand store. Zustand is reserved for lightweight client state that must survive navigation during a flow. Component-specific interaction state remains local to each screen.

### Navigation architecture

```text
Root stack
├── Public
│   ├── Welcome
│   └── (auth): Login and Signup
├── Authenticated but not onboarded
│   └── (onboarding): Profile → Family → Elder → Confirmation
└── Authenticated and onboarded
    ├── (family) tabs: Home, Care Pings, Schedule, Tasks, More
    ├── Elder Mode
    ├── Medications
    ├── Health Timeline
    ├── Emergency Mode
    ├── Documents
    ├── Family Members
    └── Settings
```

Protected routes are driven by the Supabase session and the presence of an active `family_members` record.

### Component organization

- `components/ui`: buttons, cards, text, fields, feedback banners, skeletons, and reusable app states
- `components/onboarding`: shared onboarding presentation
- `features/*`: domain-specific types, options, formatters, and data hooks
- `theme`: reusable colors, spacing, typography, button sizes, radii, shadows, layout, and motion constants

### Authentication flow

1. `AuthProvider` restores the persisted Supabase session.
2. Supabase Auth emits future sign-in, refresh, and sign-out changes.
3. The provider checks for an active `family_members` record.
4. Logged-out users are restricted to Welcome and Auth routes.
5. Signed-in users without a membership enter onboarding.
6. Onboarding creates the profile, family, elder, and administrator membership atomically.
7. Fully onboarded users enter the protected family experience.
8. Logout deactivates the current device push token before ending the session.

### Notification architecture

- `NotificationBootstrap` requests permission, registers the device, and handles notification taps.
- `push-registration.ts` obtains an Expo push token and stores it in `device_push_tokens`.
- `local-notifications.ts` contains semantic helpers for Care Pings, responses, medication reminders, Need Help events, and unanswered pings.
- Android uses separate general, urgent, and medication notification channels.
- Local notifications provide the MVP fallback.
- A future Supabase Edge Function can use active device tokens to deliver remote notifications without changing screen-level notification semantics.

## Setup

### 1. Clone the repository

Replace the example URL with the repository URL:

```bash
git clone https://github.com/your-organization/carecircle.git
cd carecircle
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

macOS or Linux:

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

Set:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_EAS_PROJECT_ID=your-eas-project-id
```

Find the URL and anon key under **Supabase Dashboard → Project Settings → API**. Never place a service-role key or other server secret in the Expo app.

### 4. Configure Supabase

1. Create a Supabase project.
2. Enable the Email provider under **Authentication → Providers**.
3. For simple MVP testing, disable email confirmation or manually confirm each test account.
4. Apply all SQL migrations in order.
5. Verify the `carecircle-documents` Storage bucket after the Storage migration.
6. Confirm Row Level Security is enabled on the public tables.
7. Add the Supabase URL and anon key to `.env`.

### 5. Start the development server

```bash
npm start
```

After an environment change, clear Metro's cache:

```bash
npx expo start --clear
```

### Run on iOS

On macOS with the iOS Simulator installed:

```bash
npm run ios
```

On Windows, use Expo Go on a physical iPhone or create an EAS development build. A local iOS Simulator is only available on macOS.

### Run on Android

With an Android emulator running or an Android device connected:

```bash
npm run android
```

### Run with Expo Go

1. Install Expo Go on a physical phone.
2. Connect the phone and development computer to the same network.
3. Run `npm start`.
4. Scan the displayed QR code.
5. Accept notification permission.
6. Sign up and complete onboarding.

Expo Go supports most MVP flows and local notifications. Remote push notifications on Android require a development build:

```bash
npx eas-cli build:configure
npx eas-cli build --profile development --platform android
```

## Database

### Schema

The PostgreSQL schema is family-centered. `families` is the primary access boundary, `family_members` joins authenticated profiles to a family, and `elder_profiles` anchors care records. UUID primary keys, foreign keys, timestamps, check constraints, indexes, triggers, and RLS policies are defined by the migrations.

### Tables

| Table | Purpose |
| --- | --- |
| `users_profile` | Application profile linked one-to-one with `auth.users` |
| `families` | A private family care circle |
| `family_members` | User membership, role, and status within a family |
| `elder_profiles` | Elder identity and essential care details |
| `emergency_contacts` | Elder-specific emergency and professional contacts |
| `medical_conditions` | Known medical conditions |
| `allergies` | Allergy and severity information |
| `medications` | Medication details, schedules, dates, and active state |
| `medication_logs` | Taken, skipped, snoozed, missed, and Need Help events |
| `care_pings` | Family check-ins, responses, status, and severity |
| `appointments` | Elder appointments and assignment details |
| `care_tasks` | Family work items, assignee, priority, due date, and status |
| `health_timeline_events` | Chronological care history and manual notes |
| `documents` | Document metadata and Storage paths |
| `family_invitations` | Pending family invitations and intended roles |
| `device_push_tokens` | Per-user Expo push tokens and device metadata |

### Key relationships

- `auth.users` → `users_profile`: one-to-one identity
- `families` → `family_members`: one-to-many memberships
- `users_profile` → `family_members`: a user can participate in family circles
- `families` → `elder_profiles`: one-to-many elder profiles
- `elder_profiles` → contacts, conditions, allergies, medications, appointments, tasks, timeline events, documents, and Care Pings
- `medications` → `medication_logs`: one-to-many logs
- `families` → invitations and family-scoped records
- `users_profile` → `device_push_tokens`: one-to-many registered devices

Composite foreign keys ensure an elder record and its related record belong to the same family.

### Migrations

Run these files from `supabase/migrations` in order:

1. `202607020001_initial_carecircle_schema.sql`
2. `202607030001_complete_onboarding_function.sql`
3. `202607030002_care_pings_workflow.sql`
4. `202607030003_medication_logging_workflow.sql`
5. `202607030004_health_timeline_notes.sql`
6. `202607030005_care_tasks_workflow.sql`
7. `202607030006_document_vault_storage.sql`
8. `202607030007_family_members_and_invitations.sql`
9. `202607030008_push_notification_tokens.sql`

For each file:

1. Open **Supabase Dashboard → SQL Editor → New query**.
2. Copy the complete SQL file into the editor.
3. Select **Run**.
4. Confirm **Success** before continuing.

Do not rerun a migration unless it is explicitly written to be idempotent.

### Row Level Security

RLS is enabled for application tables and the document Storage bucket:

- Users can access families and care data only with an active membership.
- Members can create and update permitted care data only inside their families.
- Family administration and sensitive destructive actions are role-restricted.
- Document reads and uploads are family-scoped; deletion is administrator-controlled.
- Push tokens can only be read or modified by their owning user.
- Helper functions centralize family membership and administrator checks.

The anon key is safe in the client only while these policies remain enabled. The service-role key must never be shipped in the mobile bundle.

### Seed data

No production seed file is committed. The safest development seed flow is:

1. Create a test user through Signup.
2. Complete onboarding to create a valid profile, family, elder, and administrator membership.
3. Add medications, tasks, Care Pings, and notes through the app.

This exercises the same RLS and RPC paths as a real user. If automated seed data is added later, place it in `supabase/seed.sql`, use development-only identities, and never run it against production. Auth users should be created through Supabase Auth or the Admin API, not by manually inserting incomplete `auth.users` rows.

## Project structure

```text
carecircle/
├── assets/                    Icons, splash artwork, and static assets
├── src/
│   ├── app/                   Expo Router screens and layouts
│   │   ├── (auth)/            Login and signup
│   │   ├── (onboarding)/      Profile, family, elder, confirmation
│   │   ├── (family)/          Protected tab navigation
│   │   ├── documents/         Document Vault routes
│   │   ├── family-members/    Invitations and role management
│   │   └── medications/       Medication routes
│   ├── components/
│   │   ├── onboarding/        Onboarding-specific presentation
│   │   └── ui/                Shared design-system components
│   ├── features/              Domain types, configuration, and data hooks
│   ├── lib/                   Supabase and notification integrations
│   ├── providers/             Authentication and app-wide feedback
│   ├── store/                 Zustand client state
│   ├── theme/                 Design tokens
│   └── validation/            Zod schemas
├── supabase/
│   └── migrations/            Ordered database and Storage migrations
├── .env.example               Public environment template
├── app.json                   Expo configuration
├── package.json               Scripts and dependencies
└── README.md                  Product and engineering documentation
```

## Roadmap

### MVP features

- [x] Authentication
- [x] Elder profiles
- [x] Care Pings
- [x] Health Timeline
- [x] Medication tracking
- [x] Appointments
- [x] Tasks
- [x] Emergency Mode
- [x] Elder Mode
- [x] Notifications and device registration
- [x] Document Vault
- [x] Basic family invitations and roles

### Future features

- Enhanced family sharing, invitation links, and invitation email
- AI care insights, summaries, and anomaly detection
- Apple Health, Google Health Connect, and wearable integrations
- Telehealth scheduling and video visits
- Subscription plans and household billing
- Care analytics, trends, and family activity reports
- Server push notifications through Supabase Edge Functions
- Scheduled background medication and unanswered-ping jobs
- Realtime dashboard and timeline subscriptions
- Multiple elders per family
- Offline support and background synchronization
- Biometric protection and stronger Document Vault controls
- Automated tests, CI/CD, crash reporting, and production observability

## Development checks

```bash
npx tsc --noEmit
npm run lint
npx expo-doctor
```

## Security

- Keep RLS enabled on every client-accessible table and Storage bucket.
- Never expose the Supabase service-role key.
- Keep server push credentials and payment secrets in server-side functions.
- Test role and family-boundary policies before production deployment.
- Do not use real patient information in development or seed environments.
