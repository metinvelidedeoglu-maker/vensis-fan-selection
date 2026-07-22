# VENSIS Fan Selection

Industrial fan selection application.

## Structure

- `index.html` — application shell
- `css/app.css` — interface styles
- `js/` — selection, catalogue, project and secure Edit Mode logic
- `data/fans-*.js` — fan catalogue chunks
- `assets/vensis-logo.png` — VENSIS logo
- `project.html` — separate selection project page
- `detail.html` — detail fallback page
- `api/edit/` — server-side authenticated Edit Mode and GitHub commit API

## Deployment

Hostinger deploys the `main` branch to `public_html/select`.

## Secure Edit Mode

Edit Mode never stores the password or GitHub token in browser code. Copy
`api/edit/config.example.php` to `api/edit/config.local.php` on Hostinger and set:

1. A PHP `password_hash` value.
2. A fine-grained GitHub token limited to this repository with `Contents: Read and write`.
3. The repository and deployment branch, if they differ from the defaults.

`config.local.php` is ignored by Git and blocked by `.htaccess`. Prefer setting
`VENSIS_EDIT_CONFIG` to a config file outside `public_html` when the hosting plan
supports environment variables. Login attempts, sessions, CSRF tokens and edits
are enforced server-side. Each accepted edit creates a GitHub commit; model identity
and fan performance curves are not editable through this API.
