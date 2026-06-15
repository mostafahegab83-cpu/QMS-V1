# QMS-V1 — Document Control update

Three updated files. Replace the originals in your QMS project root and redeploy.

## 1. `firestore.rules`
Fixes the red "Permission denied reading documents" message. The `documents`
and `documentVersionHistory` collections are now readable by **any signed-in
user** so the Document Control table loads even before an admin marks the
account approved. Writes/deletes are still restricted to approved users /
admins exactly like before.

Deploy with:
```
firebase deploy --only firestore:rules
```

## 2. `storage.rules` (new)
Enables attachment uploads on Firebase Storage with safety limits:
- Path: `documents/{docId}/{timestamp}_{filename}`
- Max 25 MB per file
- Accepted MIME types: PDF, Word (.doc/.docx), Excel (.xls/.xlsx),
  Outlook (.msg) and RFC-822 email (.eml). `.msg` files sometimes arrive as
  `application/octet-stream`, which is also accepted.

Deploy with:
```
firebase deploy --only storage
```
Make sure your `firebase.json` references this file, e.g.:
```json
{
  "storage": { "rules": "storage.rules" }
}
```

## 3. `document-control.js`
Adds an **Attachments** section to the Add/Edit Document modal:
- Multi-file picker accepting `.pdf, .doc, .docx, .xls, .xlsx, .eml, .msg`
- Files are uploaded to Firebase Storage on Save
- Existing attachments are listed with size + open link, and can be removed
- Files are also deleted from Storage when the parent document is deleted
- Either a Shared Document URL **or** at least one attachment is now required
- Main table shows an "Open" link + a badge with the attachment count
- New `attachments` array stored on each document:
  `[{ name, path, url, contentType, size, uploadedBy, uploadedAt }, ...]`

No changes needed to `firebase.js` — it already exports Storage helpers.
No changes needed to `index.html`.
