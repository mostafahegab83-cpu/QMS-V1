# QMS — Quality Management System (Firebase Edition)

A Quality Management System web app built with **vanilla HTML/CSS/JavaScript** and **Firebase** (Auth + Firestore). Ready to push to GitHub and deploy to Firebase Hosting.

## Features (Phase 1 — Foundation & Auth)

- Email/password authentication (Firebase Auth)
- Role-based access: `super_admin`, `admin`, `auditor`, `employee`
- Auto-assigns `super_admin` to `mostafa.hegab83@gmail.com` on first signup
- Dashboard shell with sidebar navigation
- Placeholder modules: Document Control, Audits, CAPA, KPIs, User Management, Audit Trail
- Navy Trust enterprise theme (dark + light)
- Audit log collection in Firestore

## Tech Stack

- HTML5 / CSS3 / Vanilla JavaScript (ES modules)
- Firebase v10 (modular SDK, loaded via CDN)
- Firestore for data, Firebase Auth for users
- Firebase Hosting for deployment

## Project Structure

```
.
├── public/                  # Files served by Firebase Hosting
│   ├── index.html           # Login page
│   ├── signup.html
│   ├── dashboard.html
│   ├── pages/               # Module placeholders
│   │   ├── documents.html
│   │   ├── audits.html
│   │   ├── capa.html
│   │   ├── kpis.html
│   │   ├── users.html
│   │   └── audit-logs.html
│   ├── css/styles.css
│   └── js/
│       ├── firebase-config.js   # ← put your Firebase keys here
│       ├── auth.js
│       ├── guard.js             # route protection
│       ├── app.js               # shared shell logic
│       └── modules/             # per-page logic
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── .firebaserc
├── .gitignore
└── README.md
```

## Setup

### 1. Create a Firebase project
1. Go to https://console.firebase.google.com → **Add project**.
2. Enable **Authentication → Email/Password**.
3. Enable **Firestore Database** (start in production mode).

### 2. Add your Firebase web config
In the Firebase console: Project Settings → Your apps → Web → register app → copy the config object. Paste it into **`public/js/firebase-config.js`**:

```js
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

### 3. Update `.firebaserc`
Replace `YOUR_FIREBASE_PROJECT_ID` with your real project id.

### 4. Push to GitHub
```bash
git init
git add .
git commit -m "Initial QMS commit"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

### 5. Deploy to Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase deploy
```

This deploys hosting + Firestore rules.

## First Sign-In

1. Open the deployed URL (or `firebase serve` locally).
2. Sign up with **`mostafa.hegab83@gmail.com`** — this account is automatically granted `super_admin`.
3. Other accounts default to `employee`. Promote them from the **User Management** page once it's built out.

## Firestore Data Model

```
users/{uid}
  email: string
  fullName: string
  role: "super_admin" | "admin" | "auditor" | "employee"
  createdAt: timestamp

auditLogs/{autoId}
  actorId: string
  actorEmail: string
  action: string
  target: string
  meta: map
  createdAt: timestamp
```

## Security Rules

See `firestore.rules`. Highlights:
- A user can read their own `users/{uid}` doc.
- Only `super_admin` / `admin` can read all users or change roles.
- `auditLogs` are append-only for authenticated users; only admins can read.

## Roadmap

- **Module 1**: Document Control (versioning, approvals, file uploads via Firebase Storage)
- **Module 2**: Internal Audits (checklists, findings)
- **Module 3**: CAPA (corrective & preventive actions, workflow)
- **Module 4**: KPIs & Reports
- Backup/restore, notifications (FCM), email alerts

## License

MIT
