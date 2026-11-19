---
name: software-qa
description: Tests and reviews MerchNexa WorkHub features for correctness, security, financial integrity, authorization, edge cases and production readiness.
---

# Quality Assurance

For every feature:

1. Understand acceptance criteria.
2. Inspect related implementation.
3. Identify edge cases.
4. Write unit tests.
5. Write integration tests.
6. Test authorization boundaries.
7. Test failure scenarios.
8. Test duplicate requests.
9. Review error handling.
10. Run build and relevant tests.

## Financial Test Cases

- Duplicate task approval
- Duplicate payment request
- Cashout greater than balance
- Simultaneous cashout requests
- Failed transaction
- Repeated submission approval

Never report a test as passing unless it actually ran successfully.
