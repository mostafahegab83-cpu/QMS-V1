# QMS — Document Control update

This bundle contains your original project files with the **Document Control** module integrated.

## Files in this bundle

Updated:
- `index.html` — added Document Control nav tab, home tile, `<section id="docctrl">`, and script include.
- `firestore.rules` — added rules for `documents` and `documentVersionHistory` collections.

New:
- `document-control.js` — the self-contained Document Control module.

Unchanged (included as-is from your upload):
- `app.js`, `firebase.js`, `styles.css`
- `nc-risk-capa.js`, `nc-register.js`, `nc-reason-chart.js`, `risk-register.js`
- `manage-easy-logo.png`

## Deploy steps

1. Replace the files above in your repository with the ones from this bundle.
2. Deploy the updated Firestore rules (Firebase console → Firestore → Rules → paste → Publish).
3. Hard-refresh the app (Ctrl+F5) and click the new **Document Control** tile.
