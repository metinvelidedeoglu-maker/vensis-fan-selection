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

`config.local.php` is ignored by Git and blocked by `.htaccess`. On first load, its
resolved values are automatically written with `0600` permissions to
`.vensis-edit/config.php` outside `public_html`; that persistent copy survives
Hostinger Git deployments. `VENSIS_EDIT_CONFIG` can still select another external
path. Login attempts, sessions, CSRF tokens and edits are enforced server-side. Each
accepted edit creates a GitHub commit. Edit Mode is
available in Product Catalog. Series Edit covers the visible series code and name,
brand, categories, General Information, Motor Information, Applications and a new
JPEG, PNG or WebP series image (maximum 3 MB). Model Edit covers every value
displayed on a model card: model
name, power, speed, current, voltage, frequency, nominal airflow, noise, fire rating,
fan type, mount type, IP class and price. The internal model key and fan performance
curves, as well as the internal series key, are not editable through this API.
Add Product creates a new model manually inside an existing series with the same
catalog-card fields. The server generates its internal key, commits it to the
series data file and marks it as catalog-only. It remains available in Product
Catalog and Projects but is excluded from Fan Selection until a verified
performance curve is added through a separate data-import workflow.

## Project Cloud

Projects keep a fast browser copy and synchronize through the same authenticated
server session used by Edit Mode. The canonical server records are stored with
`0600` permissions in `.vensis-edit/projects-v1.json` outside `public_html`, so Git
deployments and browser-data cleanup do not remove them. Existing browser projects
are merged into the cloud on the first authenticated sync. Per-project timestamps
and deletion tombstones prevent an older device from overwriting newer edits or
restoring a deleted project. Project API writes require the authenticated session,
same-origin validation and a CSRF token.
