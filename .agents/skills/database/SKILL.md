---
name: google-sheets-engineering
description: Implements secure Google Sheets API data access, schema management, data validation, append-only financial ledgers and concurrency-safe workflows. Use whenever working with Google Sheets storage or financial records.
---

# Google Sheets Engineering

## Core Rules

- Google Sheets is the primary MVP datastore.
- Access Sheets only through server-side code.
- Never expose service account credentials.
- Never call Sheets API directly from browser code.
- Use centralized repository functions.
- Validate all data with Zod.

## Data Integrity

- Every entity must have a unique ID.
- Use ISO timestamps.
- Use consistent column schemas.
- Validate existing records before updates.
- Never silently overwrite records.
- Implement retry with exponential backoff.
- Handle Google API quota errors.

## Financial Ledger

- Ledger is append-only.
- Never edit or delete existing transactions.
- Use unique transaction IDs.
- Prevent duplicate credits and debits.
- Calculate balances from transactions.
- Validate available balance before cashout.
- Never use floating point for money calculations.

## Concurrency

- Do not assume Sheets provides database transactions.
- Detect conflicting updates.
- Recheck business conditions before writes.
- Use idempotency keys.
- Avoid multiple independent writes for one logical operation.
- Implement reconciliation for interrupted operations.

## Security

- Never return private employee data to other employees.
- Never expose internal Sheet IDs unnecessarily.
- Enforce authorization in backend services.
