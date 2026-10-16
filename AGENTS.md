# Repository Guidelines

## Project Structure & Module Organization
This repository currently contains only `plan.md`, the implementation plan for Digital Closet, a mobile-first wardrobe PWA. Read it before making changes. Application source, tests, assets, and package configuration have not yet been created.

When scaffolding the planned React + TypeScript + Vite application, keep UI and feature code in `src/`, static assets and PWA icons in `public/`, SQL migrations in `supabase/migrations/`, and secure sharing functions in `supabase/functions/`. Group related closet, mixer, outfit, and sharing code together.

## Build, Test, and Development Commands
No executable scripts currently exist. After scaffolding, provide and document these commands in `package.json`:

- `npm install`: install dependencies.
- `npm run dev`: start the local Vite development server.
- `npm run build`: validate TypeScript and produce the production build.
- `npm test`: run automated tests once a test framework is configured.

Run the build and available tests before submitting changes; report checks that could not run.

## Coding Style & Naming Conventions
Use TypeScript, React function components, and Tailwind CSS as specified in the plan. Adopt two-space indentation, PascalCase component names (for example, `OutfitMixer.tsx`), camelCase functions and variables, and `use`-prefixed hooks. No formatter or linter is configured yet; establish shared configuration during scaffolding.

## Testing Guidelines
No test framework or coverage threshold is established. Use `*.test.ts` or `*.test.tsx` for new tests. Prioritize independent top/bottom navigation, saved item references, missing configuration states, owner authorization, restricted guest access, and share-token revocation. Verify permissions through server/API tests as well as UI behavior.

## Commit & Pull Request Guidelines
No Git history is available in this directory to establish commit conventions. Use concise, imperative commit subjects such as `Add independent mixer controls`. Pull requests should describe the change, link relevant issues or plan requirements, list validation results, and include screenshots for UI changes.

## Security & Configuration
Limit work to application code and supporting local files. Do not provision cloud services, authenticate external accounts, or deploy. Provide blank `.env.example` entries for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; never commit populated environment files or secrets. Enforce ownership through RLS, keep Storage private, and validate guest share tokens server-side. Preserve the primary vertical mixer layout.
