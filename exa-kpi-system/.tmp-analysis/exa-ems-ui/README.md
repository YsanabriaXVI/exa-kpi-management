# Exa EMS UI – Developer Guide

This project is a React + TypeScript + Vite app built on CoreUI Pro. The codebase is organized by domain “modules” so each feature keeps its API calls, Redux slice, views, and types together.

## Core Layout
- `src/App.tsx` wires routing and auth gating.
- `src/layout/DefaultLayout.tsx` wraps the shell: sidebar, header, footer, content.
- `src/components/AppBreadcrumb.tsx` renders route breadcrumbs.
- `src/components/PageHero.tsx` is the shared header/banner component for pages (icon, title, subtitle, highlights).

## Directory Structure (src)
- `components/` – shared UI (layout pieces, PageHero, breadcrumbs, etc.).
- `constants/` – shared constants (module IDs, etc.).
- `modules/` – feature modules; each module mirrors the pattern below.
- `services/` – axios config, auth storage, helpers.
- `scss/` – global styles and overrides.
- `_nav.tsx` – sidebar navigation config.
- `routes.tsx` – route definitions (lazy loaded).
- `store.ts` – Redux store registration (add new slices here).

## Module Pattern
Each module lives under `src/modules/<Feature>`:
- `api/` – axios-based API client for the feature. Keep response normalization here.
- `store/` – Redux slice (createAsyncThunk + createSlice). Expose thunks for CRUD and state for lists/forms.
- `pages/` – route-level pages (list/detail/form). Use PageHero for consistent headers.
- `components/` – module-specific reusable pieces (forms, tables, filters).
- `types/` – TypeScript types for the module.
- `scss/` – optional module styles.

Example flow:
- API client fetches/normalizes data.
- Slice thunks call the API; reducers store `list`, `current`, `loading`, `error`.
- Pages dispatch thunks in `useEffect`, read state via `useSelector`, and render components.
- Forms emit payloads shaped for the API (map form fields to attribute IDs when needed).

## API & Axios
- Config in `src/services/api/axios.config.ts` (base URL via `VITE_API_URL`, auth token interceptor).
- Prefer keeping headers/query params local to API methods.
- Normalize backend shapes in the API layer so components see clean objects.

## State Management
- Redux Toolkit; register slices in `src/store.ts`.
- Async flows use `createAsyncThunk`; handle loading/error in extraReducers.
- Keep derived UI state local to components; keep server state and mutations in slices.

## UI Patterns
- **PageHero**: use for both list and form pages. Props: `kicker`, `icon`, `title`, `subtitle`, `highlights`, `actions`.
- **Page spacing**: wrap pages in `CContainer fluid`; add cards for main content.
- **Lists**: use `CSmartTable` where possible; keep columns and scoped renderers close to the list page.
- **Forms**: keep form components stateless where possible; let pages handle data loading and submit wiring.
- **Breadcrumbs**: AppBreadcrumb already renders based on `routes.tsx`.

## Adding a New Module
1) Create `src/modules/<Feature>/api` with CRUD client. Normalize payloads here.  
2) Create `store/<feature>.slice.ts` with thunks and slice state (`list`, `current`, `loading`, `error`).  
3) Add pages under `pages/` (list/form/detail) using PageHero.  
4) Add components (forms/tables) under `components/`.  
5) Add types under `types/`.  
6) Register slice in `src/store.ts`.  
7) Add routes in `src/routes.tsx` and nav item in `_nav.tsx` if needed.

## Styling
- Global overrides in `src/scss/style.scss` (sidebar tweaks, hero styles, etc.).
- Use module-level SCSS for feature-specific tweaks.
- Keep gradients/badges readable in dark mode (PageHero badges support explicit `textColor`).

## Scripts
- `npm install` / `npm run dev` to start locally.
- `npm run build` for production build.
- `npm run lint` if configured in package.json.

## Notes
- Favor lazy imports in `routes.tsx` to keep bundle size small.
- When working with legacy attribute-based payloads, map attribute IDs in the API or page so the rest of the app uses friendly keys.
- Keep PageHero subtitles and highlights meaningful: IDs, key names, statuses; avoid showing placeholder badges when data is missing.
