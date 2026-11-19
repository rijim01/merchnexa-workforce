---
name: frontend-engineering
description: Builds professional, responsive, accessible and maintainable React.js applications. Use when creating or modifying pages, components, layouts, dashboards, forms, navigation, state management, API integration and UI interactions in MerchNexa WorkHub.
---

# Frontend Engineering - MerchNexa WorkHub

## 1. Project Context

This is the frontend engineering skill for MerchNexa WorkHub.

MerchNexa WorkHub is an internal project-based employee
and task management platform for a maximum of 30 employees.

The application has two main user roles:

- ADMIN
- EMPLOYEE

The frontend must provide different experiences
for administrators and employees.

## 2. Technology Rules

- Use the existing React.js setup.
- Use TypeScript if the project already uses TypeScript.
- Do not migrate React to Next.js.
- Follow the existing build tool (Vite or other).
- Use Tailwind CSS for styling if configured.
- Use shadcn/ui if already installed or approved.
- Use Lucide React for icons.
- Use React Router if routing is required and not already configured.
- Avoid unnecessary dependencies.

Never replace existing project configuration
without inspecting it first.

## 3. UI Design Principles

Build a modern professional SaaS dashboard.

Design characteristics:

- Clean and minimal interface.
- Consistent spacing and typography.
- Clear visual hierarchy.
- Professional color system.
- Subtle shadows and borders.
- Consistent border radius.
- Accessible contrast.
- Responsive layouts.

Avoid:

- Excessive gradients.
- Unnecessary animations.
- Too many colors.
- Overcrowded dashboards.
- Inconsistent components.
- Decorative elements without purpose.

## 4. Design System

Use a consistent design system.

Primary brand direction:

- Professional and trustworthy.
- Modern technology business.
- Clean neutral backgrounds.
- A consistent primary brand color.
- Clear success, warning and error colors.

Define reusable:

- Colors
- Typography
- Spacing
- Border radius
- Shadows
- Breakpoints

Do not hardcode random colors across components.

## 5. Application Layout

Create two separate application layouts.

### Admin Layout

Navigation:

- Dashboard
- Employees
- Projects
- Tasks
- Applications
- Assignments
- Submissions
- Payments
- Reports
- Settings

### Employee Layout

Navigation:

- Dashboard
- Available Tasks
- My Tasks
- Submissions
- Earnings
- Transaction History
- My Profile

Use reusable:

- Sidebar
- Header
- Mobile navigation
- Breadcrumbs
- Page headers
- Notification components

## 6. Component Architecture

Build reusable components.

Examples:

- Button
- Input
- Textarea
- Select
- Dialog
- DataTable
- StatusBadge
- StatCard
- EmptyState
- LoadingState
- ErrorState
- ConfirmDialog
- FileUploader
- TaskCard
- EmployeeCard
- PaymentCard

Keep components focused and reusable.

Do not create giant components containing
unrelated UI and business logic.

## 7. React Best Practices

- Use functional components.
- Use hooks appropriately.
- Avoid unnecessary re-renders.
- Keep state as local as possible.
- Use shared state only when necessary.
- Use stable keys in lists.
- Avoid unnecessary useEffect.
- Use memoization only when beneficial.
- Separate UI from business logic.
- Keep API calls outside presentation components.
- Handle asynchronous states properly.

Do not introduce Redux or other global state
libraries without a real requirement.

## 8. API Integration

- Centralize API communication.
- Create reusable API client functions.
- Handle loading and error states.
- Validate API response assumptions.
- Never expose secret API credentials.
- Never access Google Sheets directly from React.
- Never access Google Drive using service account credentials.
- Send authenticated requests to the backend.
- Handle expired sessions properly.

## 9. Authentication UI

Provide:

- Login page
- Registration page
- Email verification screen
- Pending approval screen
- Rejected account screen
- Suspended account screen
- Unauthorized page

Never trust frontend role information
for security decisions.

Backend authorization is mandatory.

## 10. Task Management UI

Admin must be able to:

- Create tasks.
- Edit tasks.
- Publish tasks.
- View applications.
- Assign employees.
- Review submissions.

Employees must be able to:

- Browse available tasks.
- View task instructions.
- Express interest.
- View assigned tasks.
- Submit completed work.
- Track task status.

Use clear status badges and confirmation dialogs.

## 11. Financial UI

Display:

- Current balance.
- Total earnings.
- Total cashouts.
- Transaction history.

Formatting:

- Currency: BDT
- Display: ৳1,500

Important:

- Never calculate or approve authoritative payments
  using frontend state.
- Display balances returned by the backend.
- Never allow employees to edit financial records.
- Show transaction types clearly.

## 12. Responsive Design

Support:

- Desktop
- Laptop
- Tablet
- Mobile

Prioritize mobile usability for employees.

Admin tables should adapt to smaller screens
using responsive layouts or horizontal scrolling.

Avoid fixed widths that break mobile layouts.

## 13. Accessibility

- Use semantic HTML.
- Provide labels for inputs.
- Support keyboard navigation.
- Use visible focus states.
- Maintain adequate contrast.
- Use accessible dialogs.
- Do not communicate status using color alone.

## 14. Performance

- Lazy-load routes when beneficial.
- Optimize images.
- Avoid unnecessary dependencies.
- Avoid rendering huge lists unnecessarily.
- Use pagination where appropriate.
- Avoid unnecessary API requests.
- Keep bundle size reasonable.

## 15. Development Workflow

Before implementing UI:

1. Inspect existing components.
2. Understand current styling.
3. Identify reusable components.
4. Prepare an implementation plan.
5. Implement incrementally.
6. Test desktop and mobile.
7. Check accessibility.
8. Run lint and build.

Never rewrite existing pages unnecessarily.

Never modify unrelated components.

Always maintain the existing project architecture.
