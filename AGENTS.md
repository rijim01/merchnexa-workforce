# MerchNexa WorkHub - Engineering Instructions

## 1. Project Overview

Build MerchNexa WorkHub, an internal project-based
employee management platform for a maximum of 30 employees.

The application is controlled by one authorized admin.

Primary stack:

- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Firebase Authentication
- Google Sheets API
- Google Drive API

## 2. Engineering Principles

- Follow clean architecture.
- Prefer maintainable and reusable code.
- Use strict TypeScript.
- Avoid `any` unless absolutely necessary.
- Keep components small and focused.
- Separate UI, business logic and data access.
- Use server-side validation.
- Follow existing project conventions.
- Avoid unnecessary dependencies.

## Frontend Technology

- React.js
- TypeScript (if already configured)
- Existing build tool (Vite or current setup)
- Tailwind CSS
- shadcn/ui (if configured)
- React Router (if needed)

## Frontend Architecture

- Use reusable React components.
- Follow feature-based folder organization.
- Separate UI components from business logic.
- Centralize API requests.
- Use proper loading and error states.
- Prioritize mobile-first responsive design.
- Avoid unnecessary global state.
- Follow frontend-engineering skill.

## Important

Never migrate the existing React application
to Next.js without explicit approval.

Inspect package.json before installing dependencies.
Preserve the existing project configuration.

## 3. Architecture

Use these layers:

- API: Route handlers
- Services: Business logic
- Repositories: Google Sheets access
- Integrations: Firebase, Google Drive
- Validation: Zod schemas

UI components must never access Google Sheets directly.

## 4. Authentication

- Firebase handles authentication.
- Require email verification.
- Verify ID tokens on the server.
- New employees are PENDING.
- Only approved employees can work.
- Admin privileges must never be assigned through
  public registration.
- Never trust client-provided roles or user IDs.

## 5. Authorization

- Enforce RBAC on every protected API.
- Admin-only actions must be server-protected.
- Employees can only access their own private data.
- Verify task assignment ownership.
- Suspended accounts cannot perform actions.

## 6. Google Sheets

- Use a centralized repository layer.
- Keep spreadsheet credentials server-only.
- Validate every input.
- Use unique IDs.
- Use ISO timestamps.
- Implement retries and error handling.
- Never assume Sheets supports transactions.

## 7. Financial Integrity

- Maintain an append-only transaction ledger.
- Credits represent approved earnings.
- Debits represent completed cashouts.
- Calculate balance from ledger transactions.
- Use integer BDT amounts.
- Prevent duplicate financial operations.
- Never allow negative balance.
- Never delete financial history.
- Require admin authorization for all financial actions.
- Record payment method and reference information.

## 8. Documents

- Store private documents in Google Drive.
- Never expose service credentials.
- Validate uploads.
- Verify ownership before downloads.
- Maintain submission versions.
- Never use public document links for private work.

## 9. UI/UX

- Build a responsive application.
- Prioritize mobile usability.
- Use consistent design tokens.
- Include loading, empty and error states.
- Use accessible forms and dialogs.
- Separate admin and employee navigation.
- Display financial amounts clearly in BDT.

## 10. Testing

- Test every important business operation.
- Test unauthorized requests.
- Test cross-employee data access.
- Test duplicate payments.
- Test concurrent operations.
- Test submission and revision workflows.
- Run lint, tests and production build.

## 11. Git Safety

- Never force push without approval.
- Never reset or delete user changes.
- Never overwrite environment secrets.
- Never modify production data during testing.
- Explain destructive operations before execution.

## 12. Agent Workflow

Before implementing a feature:

1. Inspect the existing code.
2. Explain the proposed changes.
3. Identify affected files.
4. Identify security risks.
5. Implement in small steps.
6. Test the implementation.
7. Review the final changes.
8. Report modified files and test results.

Do not implement unrelated features.
Do not invent requirements.
Ask before making major architectural changes.
