/**
 * Migration: Ensure all users have orgRoles map
 * ──────────────────────────────────────────────
 * Some users were created with only orgMemberships array
 * but missing the orgRoles map that Firestore rules depend on.
 * This script populates orgRoles from orgMemberships.
 *
 * Usage:
 *   node scripts/migrate-org-roles.mjs
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const serviceAccountPath = resolve(__dirname, "service-account.json");
let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
} catch {
  console.error("ERROR: Cannot find scripts/service-account.json");
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function migrate() {
  console.log("\n═══ Migrate orgRoles ═══\n");

  const usersSnap = await db.collection("users").get();
  console.log(`Found ${usersSnap.size} users\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const uid = userDoc.id;
    const email = data.email ?? "?";

    // Check if orgRoles already exists and is populated
    if (data.orgRoles && Object.keys(data.orgRoles).length > 0) {
      console.log(`  ✓ ${email} — orgRoles already set: ${JSON.stringify(data.orgRoles)}`);
      skipped++;
      continue;
    }

    // Build orgRoles from orgMemberships
    const orgRoles = {};

    if (data.orgMemberships && Array.isArray(data.orgMemberships)) {
      for (const m of data.orgMemberships) {
        if (m.orgId && m.role) {
          orgRoles[m.orgId] = m.role;
        }
      }
    }

    // Fallback: use primaryOrgId + role
    if (Object.keys(orgRoles).length === 0 && data.primaryOrgId && data.role) {
      orgRoles[data.primaryOrgId] = data.role;
    }

    if (Object.keys(orgRoles).length === 0) {
      console.log(`  ⚠ ${email} — no orgMemberships or primaryOrgId, cannot build orgRoles`);
      errors++;
      continue;
    }

    try {
      await userDoc.ref.update({ orgRoles });
      console.log(`  ✔ ${email} — set orgRoles: ${JSON.stringify(orgRoles)}`);
      updated++;
    } catch (err) {
      console.error(`  ✗ ${email} — update failed:`, err.message);
      errors++;
    }
  }

  console.log(`\n═══ Done ═══`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped} (already had orgRoles)`);
  console.log(`  Errors:  ${errors}`);
  console.log();

  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
