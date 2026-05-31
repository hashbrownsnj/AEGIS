import { app } from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { checkEncryptionConfig } from "./services/encryptionService.js";
import { User } from "./models/User.js";
import { Patient } from "./models/Patient.js";
import { QueueEntry } from "./models/QueueEntry.js";
import { AmbulanceReport } from "./models/AmbulanceReport.js";
import { TriageAssessment } from "./models/TriageAssessment.js";
import { AuditLog } from "./models/AuditLog.js";
import { HospitalMetrics } from "./models/HospitalMetrics.js";
import { OperationalAlert } from "./models/OperationalAlert.js";
import { Settings } from "./models/Settings.js";

// ── Verify encryption config before connecting to DB ─────────────────────────
checkEncryptionConfig();

await connectDb();

// ── Wipe all collections on every startup ─────────────────────────────────
console.log("[AEGIS] Wiping all collections…");
await Promise.all([
  Patient.deleteMany({}),
  QueueEntry.deleteMany({}),
  AmbulanceReport.deleteMany({}),
  TriageAssessment.deleteMany({}),
  AuditLog.deleteMany({}),
  HospitalMetrics.deleteMany({}),
  OperationalAlert.deleteMany({}),
  Settings.deleteMany({}),
  User.deleteMany({}),
]);
console.log("[AEGIS] All collections cleared.");

// ── Provision master admin from environment ────────────────────────────────
const passwordHash = await User.hashPassword(env.adminPassword!);
await User.create({
  name:         env.adminName,
  email:        env.adminEmail,
  passwordHash,
  role:         "admin",
  department:   "Administration",
  active:       true,
});
console.log(`[AEGIS] Master admin created: ${env.adminEmail}`);

app.listen(env.port, () => {
  console.log(`[AEGIS] API listening on port ${env.port}`);
});
