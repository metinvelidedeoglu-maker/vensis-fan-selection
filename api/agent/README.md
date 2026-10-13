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
- Only `project-write.php` can save a draft project and its quote snapshot after consuming a separately approved, payload-bound, one-use grant. Customers, orders, email and publication remain outside this connector.
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

## Project creation and update (v1.3)

1. Select a fan and create a quote with signed selection tokens. `quote-draft.php`
   returns `projectWritePayload`, including a valid, deterministic `prj_` ID and
   a signed quote snapshot. It does not persist a project or quote.
2. Request `project.write` approval with this payload unchanged and a stable
   `idempotencyKey`. Validation runs before asking a person to approve. Read the
   returned `approval.payload`; never reconstruct it from the summary.
3. Metin explicitly reviews the visible summary through the separate connector.
   The existing 15-minute grant, identity separation and zero-discount limits
   remain in effect. Expired grants require a newly approved request.
4. Execute `approval.payload` unchanged. Project, quotation snapshot and receipt
   are written in the same private Project Cloud transaction. The quote remains
   a draft; no email, published quotation or order is created.
5. Read `project-read.php` using `projectId` or `requestId`. Only projects with an
   execution receipt belonging to this API identity are visible.

To update, pass the existing `project.id` and its exact `expectedUpdatedAt` to the
quote tool. A stale version, deletion, missing project, commercial status, order
or discount blocks the write before approval is consumed. Create never overwrites
an existing project. A repeated ID cannot produce a duplicate.

Already-approved legacy flat project summaries are converted from verified
catalogue data after verifying their **original** payload hash. Their original
quote ID is retained as `sourceDraftId`; the regenerated signed quote's `draftId`
is returned and stored. The legacy memory-only draft is not represented as an
independently recovered stored quotation.

Validation: `PHP_BIN=/path/to/php node --test tests/agent-project-runtime.test.mjs`
executes isolated PHP storage tests. It never touches production projects.


## Read-only project inventory for date-range reporting (v1.4)

`project-list.php` lists Project Cloud **projects**, not a complete register of quotations.
It is a POST operation requiring the new, separately granted `project:list` scope
(and the same HTTPS, bearer authentication, rate limits and audit trail as existing
agent endpoints). **Do not grant this scope to the default integration identity
automatically**: it allows access to project names, customer references and last
quotation numbers across the entire Project Cloud, including projects created
outside the agent connector. Keep it restricted to an explicitly authorized
reporting identity.

Request example:

```json
{"from":"2026-09-14","to":"2026-10-13","dateField":"createdAt","limit":100,"offset":0}
```

Dates are inclusive Europe/Istanbul days; the filter uses a **project creation
or update timestamp**, not the quotation issue or send date. The response
contains `total`, `snapshot`, `nextOffset` and `projects`. To collect every
record, continue while `nextOffset` is not null, sending the same dates,
dateField and returned `snapshot` on each page. An inventory change produces
409 and requires restarting at offset zero. Do not declare a list complete
unless all pages were read and the totals match. Sorting is deterministic.

This endpoint makes a complete *project* inventory available for read-only
reconciliation; it does **not** recover unsynced browser-only projects or
historic quotation documents/revisions. The current quotation editor stores
its active quotation in browser storage, while the project record holds the
last quotation number. A separate versioned, server-persisted quotation ledger
and send/issue status are required before calling any date-range report an
exhaustive record of *issued offers*.

Deploy only after review, server test and explicit production approval, then
provision the new reporting scope in the PRIVATE agent configuration and
register the endpoint as a connector action. Updating this repository alone
does not deploy the service or extend the installed ChatGPT connector.
