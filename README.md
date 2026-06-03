# QMS — Training permissions fix

This bundle contains your QMS files with the Training module and a corrected `firestore.rules` file.

## What was fixed

- Removed the extra closing braces at the end of `firestore.rules` that caused Firebase to show: `Line 117: Unexpected '}'`.
- Confirmed `training_records` has read/create/update permissions for approved signed-in users.
- Added basic validation for training record saves.
- Updated `training.js` to save the logged-in email from the current session and show a clearer permission message.

## Required deployment steps

1. Replace your current app files with the files from this zip.
2. Open Firebase Console → Firestore Database → Rules.
3. Replace the rules with the included `firestore.rules` content.
4. Click **Publish**.
5. Hard refresh the app with **Ctrl+F5**.
6. Sign in with an approved user/admin account and submit the Training form again.

If the user is not listed in `approved_users` or is revoked, Firebase will still block saving by design.
