# Erman Selection and Quotation Draft API

This API is deliberately separate from Edit Mode, Project Cloud and Customer Cloud. Its bearer identity can only call the scopes assigned in the private server configuration. Privileged actions use a two-person approval gate.

## Security and authority boundary

- `fan:select` performs read-only selection against the generated server catalog.
- `quote:draft` accepts only a short-lived, identity-bound, HMAC-signed selection token from `fan:select`.
- `approval:request` lets Erman request one exact `project.write`, `customer.write`, `order.write`, `quotation.send` or `quotation.publish` action. Creating or reading a request never executes it.
- `approval:review` belongs to a separate reviewer identity. It can inspect the exact payload and approve or reject it; the requester cannot review their own request.
- Approval produces a short-lived HMAC-signed grant bound to the requester, action and canonical payload hash. A future write/send connector must atomically consume that one-use grant before performing the exact operation.
- Prices come from the server catalog. Callers cannot replace list prices.
- The default and example discount ceiling is zero. A higher ceiling must be explicitly approved and configured outside the repository.
- Models marked `needs_engineering_review` are excluded from selection and cannot enter a draft.
- Accessory matches are suggestions marked `review-required`; they are never treated as technically approved.
- These endpoints do not themselves save projects or customers, create orders, send email or publish documents. They provide the approval gate that a separately reviewed execution connector must enforce.
- Requests are rate-limited and written to a private audit log without storing raw request bodies.

## Deployment preparation (do not perform without approval)

1. Run `node scripts/build-agent-catalog.mjs` and the complete test suite.
2. Copy `config.example.php` to `.vensis-edit/agent-config.php` outside `public_html`.
3. Generate unique, unrelated high-entropy secrets for Erman and the Metin approver; store only their password hashes or SHA-256 digests and independently generate the signing key. Never use a human password with `secret_sha256`.
4. Keep the configured discount ceiling at `0` unless Metin approves another limit.
5. Deploy the reviewed commit to a staging or production target only after explicit approval.
6. Verify HTTPS, unauthorized/forbidden/rate-limit behavior, selection parity, token expiry, requester/reviewer separation, payload-bound approval grants, audit logging and a draft-only response before enabling a connector.

An approval decision is not an instruction to deploy. Production deployment and the future execution connector still require explicit user approval.

The OpenAPI file is blocked from public HTTP access by the directory `.htaccess`; use the repository copy when configuring an approved connector.
