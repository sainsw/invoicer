# Simple Invoice Generator

Generate professional PDF invoices straight from your browser. The app keeps settings in localStorage, calculates weekday-only work blocks, and exports a clean PDF layout without needing a backend.

- Live demo: https://invoicer.ainsworth.dev

## Getting started

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to open the builder. Settings and the last invoice are saved automatically in your browser. To reset everything use the **Reset data** action in the header or inside the settings drawer.

## Features

- Invoice metadata with month selector, issue/due date helpers, client details, invoice number, and custom notes.
- Multiple work blocks with weekday counting, per-line descriptions, editable daily rates, duplicate/remove controls, and live totals.
- Tax/VAT percentage support plus subtotal/tax/grand total summary.
- Settings drawer for personal details, defaults, bank information, and an optional notes template—persisted to localStorage.
- Automatically suggests a currency symbol based on your browser locale (editable any time).
- Instant PDF generation (A4 portrait) using jsPDF that mirrors on-screen totals, notes, and payment instructions.
- Works fully offline after the first load; no authentication or backend required.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Create an optimized production build |
| `npm run start` | Run the production server (after `build`) |
| `npm run lint` | Lint the project with ESLint |
| `npm run typecheck` | Run TypeScript in no-emit mode |

## Tech stack

- Next.js (App Router) + TypeScript
- Tailwind CSS for consistent styling
- date-fns style helpers written in-house for weekday math and month handling
- jsPDF for client-side PDF export
