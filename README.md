# Manage Easily App — Static Files

Plain HTML / CSS / JS. No build step. Upload the whole folder to GitHub and host with **GitHub Pages**.

## Files

- `index.html` — Login page (matches slide 1)
- `signup.html` — Sign-up page
- `dashboard.html` — Main UI with 9 module tiles + sidebar (matches slide 2)
- `styles.css` — All styling (design tokens at the top)
- `app.js` — Login form handler (stub — replace `handleLogin()` with your real auth call)

## How to host on GitHub Pages

1. Create a new GitHub repository (e.g. `manage-easily-app`).
2. Upload all 5 files to the repo root (drag-and-drop on GitHub works).
3. Go to **Settings → Pages**.
4. Under **Source**, choose `main` branch and `/ (root)` folder. Save.
5. After ~1 minute your site is live at `https://<your-username>.github.io/manage-easily-app/`.

## Customizing

- **Colors / fonts** — edit the `:root` variables at the top of `styles.css`.
- **Add a real login** — open `app.js` and replace the body of `handleLogin()` with a `fetch()` call to your backend.
- **Add more pages** — copy `dashboard.html` as a template; sidebar links already point to `#` so you can wire them up.
