Project: Simple Invoice Generator (Next.js)
1. Purpose & Scope
Build a browser-based Next.js app that lets a solo user quickly generate PDF invoices for work billed at a daily rate, with minimal monthly input.
Key points:
User enters blocks of work (start date, end date, daily rate).
User manually manages invoice numbers (e.g. “Invoice #14”).
User can add free-text notes per invoice.
App stores user settings in localStorage; no backend in v1.
2. Personas & Usage Scenarios
2.1 Persona
Freelancer / Contractor
Bills clients on a daily rate.
Creates one or more invoices per month.
Wants a lightweight alternative to full accounting software.
2.2 Main Scenario: Monthly Invoice Creation
User opens the app.
Their details & defaults load from localStorage.
The current month is pre-selected.
User:
Enters invoice metadata (client, invoice number, dates, etc.).
Adds one or more work blocks (start/end, rate).
Optionally adds invoice notes.
App calculates days and totals automatically.
User clicks “Generate PDF”.
PDF appears/downloads; user emails it to the client.
3. High-Level UX Flow
Invoice Builder (main view)
Settings shortcut (e.g. “⚙️ Settings”).
Invoice metadata form.
Work blocks table.
Notes box.
Totals section.
Generate PDF button.
Settings Panel
User/business details.
Defaults (daily rate, payment terms, etc.).
Optionally a default “invoice notes” template.
(Optional) Info / Help
Very short “How this works” and data/privacy explanation.
4. Functional Requirements
4.1 Invoice Metadata
F-1: User can select the invoice month (month/year).
F-2: App suggests:
Invoice issue date (default = today).
Invoice due date (default = issue date + default payment terms).
F-3: User can enter/override:
Invoice number (free-text, fully manual, e.g. “14” or “Invoice #14”).
Client name.
Client address (multi-line free-text).
F-4: Invoice month selection is used to default work block dates to that month, but user can override.
Note: No automatic sequencing or incrementing of invoice numbers. The app does not enforce uniqueness.
4.2 Work Blocks (Line Items)
Each work block = one continuous period charged at one daily rate.
F-5: User can add multiple work blocks.
F-6: For each work block, user can input:
Start date.
End date.
Daily rate (default from settings; editable).
Optional short description.
F-7: App automatically calculates:
Number of working days in the block.
Line total = working days × daily rate.
F-8: Working days definition:
Monday–Friday only.
Weekends excluded.
Public/bank holidays ignored for v1.
F-9: User can delete a work block.
(Optional nice-to-have: duplicate / copy a block.)
F-10: Validation:
End date ≥ start date.
Dates must be valid.
Show simple, clear error feedback when invalid.
4.3 Invoice Notes
F-11: There is a free-text “Notes” box on the invoice builder page.
Intended for things like: “Thank you for your business”, PO numbers, specific agreed terms, or narrative description of the work.
F-12: Notes are included in the PDF, e.g. in a “Notes” or “Additional Information” section near the totals.
F-13: (Optional) Settings can include a default notes template that pre-fills this field, which can then be edited per invoice.
4.4 Totals
F-14: Display a line-item table with:
Description.
Start date.
End date.
Number of working days.
Daily rate.
Line total.
F-15: Compute and display:
Subtotal (sum of line totals).
Optional tax/VAT amount (single percentage; default 0%).
Grand total.
F-16: Totals update in real time as inputs change.
4.5 User Settings (Local Storage)
F-17: Settings view allows configuration of:
Personal/business name.
Business address (multi-line).
Email.
Phone number.
Default client name (optional).
Default daily rate.
Default currency symbol (e.g. “£”).
Default payment terms in days (for due date calculation).
Bank/payment details (free-text, multi-line).
Optional default invoice notes template.
F-18: All settings are persisted to localStorage automatically on change.
F-19: On app load, settings are read from localStorage and applied to the UI.
F-20: Provide a “Clear all data / Reset settings” action which:
Clears the app’s localStorage keys.
Resets fields to hard-coded defaults.
4.6 PDF Generation
F-21: On clicking “Generate PDF”, the app creates a PDF with:
Header / From:
User/business name.
Address.
Contact details.
To:
Client name.
Client address (if provided).
Invoice metadata:
Invoice number (as entered by the user).
Invoice date.
Due date.
Work block table:
Description.
Start date.
End date.
Days.
Daily rate.
Line total.
Totals:
Subtotal.
Tax/VAT (if configured).
Grand total.
Notes section:
Content of the free-text notes field.
Payment details / footer:
Bank info and any default/payment wording from settings.
F-22: Layout:
A4 portrait.
Clean, legible font.
Basic alignment and spacing ready for printing or emailing as an attachment.
F-23: The PDF should either:
Download directly with a sensible filename (e.g. invoice-<invoice-number>.pdf if possible), or
Open in a new tab with the browser’s native download/print options.
F-24: All values in the PDF must be consistent with what is shown on screen.
4.7 Data Persistence & Offline Behaviour
F-25: All user-specific settings and optionally last-used invoice details may be persisted to localStorage (implementation decision).
F-26: App works without a backend and should function offline after initial load (no network calls required for core features).
5. Non-Functional Requirements
NFR-1 – Simplicity: UI is minimal and focused on the invoice builder. No unnecessary navigation or configuration.
NFR-2 – Performance: Invoice editing and PDF generation feel instant on consumer hardware.
NFR-3 – Privacy: No data sent to a server; everything stays in the browser.
NFR-4 – Tech stack:
Next.js (App Router), TypeScript.
Minimal external dependencies (particularly for date and PDF handling).
NFR-5 – Responsiveness:
Works well on desktop.
Should be usable on tablet/mobile, but desktop is primary.
6. Technical Implementation Notes
Framework: Next.js (latest), TypeScript, App Router.
State: React hooks for local UI state; optionally React Context for settings.
PDF Generation:
Option A: Use a library like pdf-lib/jspdf to generate PDFs client side.
Option B: Render an invoice layout in HTML and use window.print() + user’s “Save as PDF” as a simpler v1 (then upgrade later).
Date Logic:
Either a lightweight library (e.g. date-fns) or small custom helpers to:
Count weekdays between two dates (inclusive).
Add days for due date calculation.
Storage:
Namespaced keys, e.g.:
simpleInvoice.settings
simpleInvoice.lastInvoice (if you want to restore last invoice content).
7. Out of Scope for v1
Automatic invoice number sequencing.
Client library / multiple saved clients.
Export/import of invoices or settings.
Authentication, user accounts, or syncing across devices.
Multi-currency support.
Multiple tax rates or line-level tax config.