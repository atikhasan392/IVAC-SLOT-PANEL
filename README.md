# INDIAN VISA APPLICATION SLOT PANEL

Requirements: node.js or bun

```bash
bun install
bun start
```

Open: <http://localhost:3000>

For local development, use `bun run dev` to restart the server automatically when backend code changes. An already running `bun start` process must be restarted after backend changes.

Each submission creates a numbered directory inside `uploads/` and adds one object to the `main.json` array (`id`, `phone`, `password`, `file`). Files are numbered in the order shown on screen. Reorder them by dragging before submitting.

Click the delete icon in SLOT DATA to remove a record and its PDFs after confirmation. To change a saved slot, delete it and submit a new one using the form above.

Security: Intended for trusted local environments only. `main.json` stores passwords as plaintext. Do not expose this app to the public internet without authentication, HTTPS, rate limits, and secure password handling.
