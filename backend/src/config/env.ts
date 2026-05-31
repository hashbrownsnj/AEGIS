import dotenv from "dotenv";
dotenv.config();

const nodeEnv      = process.env.NODE_ENV ?? "development";
const jwtSecret    = process.env.JWT_SECRET ?? "development_only_replace_me";
const anthropicApiKey = process.env.ANTHROPIC_API_KEY ?? "";
const renderUrl    = process.env.RENDER_EXTERNAL_URL;

if (nodeEnv === "production") {
  if (!process.env.JWT_SECRET || jwtSecret === "development_only_replace_me") {
    throw new Error("JWT_SECRET must be set in production");
  }
  if (!process.env.FIELD_ENCRYPTION_KEY) {
    throw new Error(
      "FIELD_ENCRYPTION_KEY must be set in production for PII encryption at rest.\n" +
      "Generate: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
}

if (!anthropicApiKey) {
  console.warn(
    "[AEGIS] ANTHROPIC_API_KEY is not set. ACUITY will use the deterministic rules engine only."
  );
}

if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
  throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment variables");
}

const cookieSecure = process.env.COOKIE_SECURE === "true";

export const env = {
  nodeEnv,
  port:           Number(process.env.PORT ?? 4200),
  mongoUri:       process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/aegis",
  jwtSecret,
  jwtExpiresIn:   process.env.JWT_EXPIRES_IN ?? "2h",
  corsOrigin:     process.env.CORS_ORIGIN   ?? renderUrl ?? "http://localhost:5173",
  frontendUrl:    process.env.FRONTEND_URL  ?? renderUrl ?? "http://localhost:5173",
  cookieSecure,
  anthropicApiKey,
  adminEmail:     process.env.ADMIN_EMAIL,
  adminPassword:  process.env.ADMIN_PASSWORD,
  adminName:      process.env.ADMIN_NAME ?? "System Administrator",
  // Encryption
  fieldEncryptionKeyId: process.env.FIELD_ENCRYPTION_KEY_ID ?? "v1",
};
