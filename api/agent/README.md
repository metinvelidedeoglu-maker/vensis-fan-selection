# Erman Selection and Quotation Draft API

This API is deliberately separate from Edit Mode, Project Cloud and Customer Cloud. Its bearer identity can only call the scopes assigned in the private server configuration.

## Security and authority boundary

- `fan:select` performs read-only selection against the generated server catalog.
- `quote:draft` accepts only a short-lived, identity-bound, HMAC-signed selection token from `fan:select`.
- Prices come from the server catalog. Callers cannot replace list prices.
- The default and example discount ceiling is zero. A higher ceiling must be explicitly approved and configured outside the repository.
- Models marked `needs_engineering_review` are excluded from selection and cannot enter a draft.
- Accessory matches are suggestions marked `review-required`; they are never treated as technically approved.
- The API does not save projects or customers, create orders, send email, publish documents, or modify catalog data.
- Requests are rate-limited and written to a private audit log without storing raw request bodies.

## Deployment preparation (do not perform without approval)

1. Run `node scripts/build-agent-catalog.mjs` and the complete test suite.
2. Copy `config.example.php` to `.vensis-edit/agent-config.php` outside `public_html`.
3. Generate a unique Erman secret, store only its password hash, and independently generate the signing key.
4. Keep the configured discount ceiling at `0` unless Metin approves another limit.
5. Deploy the reviewed commit to a staging or production target only after explicit approval.
6. Verify HTTPS, unauthorized/forbidden/rate-limit behavior, selection parity, token expiry, audit logging and a draft-only response before enabling a connector.

The OpenAPI file is blocked from public HTTP access by the directory `.htaccess`; use the repository copy when configuring an approved connector.
