# Sahay-Setu Bridge

Sahay-Setu Bridge is the full-stack web application for the SAHAY-SETU platform. It brings together profile-based access, authenticated user flows, application workflows, rental management, and messaging in a single app powered by React, TanStack, and Supabase.

## Overview

This project is designed around a few core architectural principles:

- All app data references `profiles.id` instead of the auth user id, and RLS resolves the current caller through `public.my_profile_id()`. This allows sample profiles to exist without matching auth accounts.
- Data access is handled from the browser client using TanStack Query, with Supabase Row Level Security protecting the data layer. Server-side functions are only reserved for privileged or sensitive work.
- Notifications are created by database triggers for events such as applications, rentals, and messages, creating a single source of truth for activity updates.
- Authenticated pages live under `src/routes/_authenticated/`, with the auth gate managed by the application routing layer.

## Tech stack

- React 19
- TanStack Router + Start
- TanStack Query
- TypeScript
- Vite
- Tailwind CSS
- Supabase
- Drizzle (available in the project setup)

## Project structure

- `src/routes/` — file-based route definitions
- `src/routes/_authenticated/` — signed-in application pages
- `src/components/` — shared UI and feature components
- `src/lib/` — app configuration, utilities, and shared logic
- `src/hooks/` — reusable hooks
- `supabase/` — database schema and related SQL

## Local development

Prerequisites:

- Node.js 18+
- npm

Install dependencies:

```sh
git clone <this-repository-url>
cd <repository-name>
npm install
```

Start the app:

```sh
npm run dev
```

Build for production:

```sh
npm run build
```

Run tests:

```sh
npm test
```

## Environment variables

If the app depends on Supabase, configure the required environment variables before running locally:

```sh
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Notes

This project follows a data-first pattern where database constraints and RLS keep access rules consistent, while the frontend remains focused on user experience and interaction flows.
