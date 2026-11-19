---
name: secure-auth-rbac
description: Implements Firebase authentication, verified email login, admin and employee role-based access control, account approval, session management and secure API authorization. Use when implementing authentication or protected features.
---

# Authentication and Authorization

## Authentication

- Use Firebase Authentication.
- Use email and password.
- Require verified email.
- Verify Firebase ID tokens on the server.
- Use secure session handling.

## Authorization

- Only ADMIN can access admin APIs.
- EMPLOYEE can only access permitted employee APIs.
- PENDING users cannot access employee dashboard.
- REJECTED and SUSPENDED users cannot perform work.
- Verify ownership of every employee resource.

## Critical Rules

- Never trust frontend role values.
- Never trust client-provided employee IDs.
- Derive user identity from verified tokens.
- Never allow public registration to create ADMIN.
- Protect all server endpoints.
- Use secure, HTTP-only cookies where appropriate.
- Never expose secrets in client-side bundles.

## Testing

Test unauthorized access,
privilege escalation, cross-user access,
suspended accounts and unverified accounts.
