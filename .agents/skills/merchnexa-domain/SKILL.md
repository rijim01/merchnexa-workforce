---
name: merchnexa-domain
description: Understands MerchNexa WorkHub business requirements, employee workflows, admin permissions, task lifecycle, project-based employment and earnings rules. Use when implementing or changing any MerchNexa business feature.
---

# MerchNexa Business Domain

## Platform

MerchNexa WorkHub is an internal project-based
employee and task management system.

Maximum initial capacity: 30 employees.

## Roles

- ADMIN
- EMPLOYEE

## Employee Registration

- Employees register using email/password.
- Email must be verified.
- New accounts start as PENDING.
- Only ADMIN can approve or reject accounts.
- Suspended users cannot access protected features.

## Task Workflow

1. Admin creates task.
2. Admin publishes task.
3. Employee expresses interest.
4. Admin reviews applications.
5. Admin assigns employee.
6. Employee works on assignment.
7. Employee submits deliverables.
8. Admin reviews submission.
9. Admin approves or requests revision.
10. Approved work creates an earning transaction.

## Payment Rules

- Only ADMIN can approve earnings.
- Approved earnings create CREDIT transactions.
- Cashouts create DEBIT transactions.
- Never delete financial history.
- Never directly overwrite employee balance.
- Balance = total credits - total debits.
- Every transaction must have a unique ID.
- Prevent duplicate payment processing.

## Admin Authority

ADMIN controls:

- Employee approvals
- Task publishing
- Task assignment
- Submission verification
- Payment approvals
- Cashout recording
- Account suspension

Employees cannot modify their own:

- Role
- Approval status
- Payment records
- Approved earnings
- Admin decisions
