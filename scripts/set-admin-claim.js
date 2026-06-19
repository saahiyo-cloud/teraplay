#!/usr/bin/env node
// ──────────────────────────────────────────────────────────────────────
// set-admin-claim.js
//
// ONE-TIME SETUP SCRIPT
//
// Grants the `admin: true` Firebase custom auth claim to a specified user
// UID. This claim is enforced by database.rules.json to gate admin-only
// writes to /categories, /topCreators, /config, and /auditLogs.
//
// Prerequisites:
//   1. Install firebase-admin:
//        npm install firebase-admin
//   2. Download a Firebase service account key JSON from the Firebase
//      Console → Project Settings → Service Accounts → "Generate new
//      private key". Save it as `service-account-key.json` in this
//      directory (or set GOOGLE_APPLICATION_CREDENTIALS env var).
//   3. Find the target user's UID from Firebase Console → Authentication.
//
// Usage:
//   node scripts/set-admin-claim.js <USER_UID>
//
// Example:
//   node scripts/set-admin-claim.js abc123DEF456ghi789
//
// To VERIFY (without changing):
//   node scripts/set-admin-claim.js <USER_UID> --verify
//
// To REVOKE admin:
//   node scripts/set-admin-claim.js <USER_UID> --revoke
// ──────────────────────────────────────────────────────────────────────

import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize with the service account key
const serviceAccountPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, 'service-account-key.json');

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
  });
} catch (err) {
  console.error('❌ Failed to initialize Firebase Admin.');
  console.error('   Make sure service-account-key.json exists in scripts/');
  console.error('   or set GOOGLE_APPLICATION_CREDENTIALS env var.');
  console.error('   Error:', err.message);
  process.exit(1);
}

const args = process.argv.slice(2);
if (!args[0]) {
  console.log('Usage: node set-admin-claim.js <USER_UID> [--verify | --revoke]');
  process.exit(1);
}

const uid = args[0];
const mode = args[1] || '--grant';

(async () => {
  try {
    if (mode === '--verify') {
      const user = await admin.auth().getUser(uid);
      console.log(`👤 User: ${user.email} (${uid})`);
      console.log(`🔑 Custom claims:`, JSON.stringify(user.customClaims || {}));
      if (user.customClaims?.admin === true) {
        console.log('✅ User HAS admin claim.');
      } else {
        console.log('⚠️  User does NOT have admin claim.');
      }
    } else if (mode === '--revoke') {
      await admin.auth().setCustomUserClaims(uid, { admin: false });
      console.log(`✅ Admin claim REVOKED for ${uid}`);
      console.log('   User must sign out and sign back in for the change to take effect.');
    } else {
      await admin.auth().setCustomUserClaims(uid, { admin: true });
      console.log(`✅ Admin claim GRANTED to ${uid}`);
      console.log('   User must sign out and sign back in for the change to take effect.');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
