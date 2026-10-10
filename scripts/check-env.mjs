const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
const missing = required.filter((name) => !process.env[name]?.trim());

if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const allowedEnvironments = new Set(["development", "preview", "production", "test"]);
const configuredEnvironment = process.env.NEXT_PUBLIC_FINZARO_ENV?.trim();
const vercelEnvironment = process.env.VERCEL_ENV?.trim();
const environment = configuredEnvironment || (allowedEnvironments.has(vercelEnvironment ?? "") ? vercelEnvironment : "development");
if (configuredEnvironment && !allowedEnvironments.has(configuredEnvironment)) {
  console.error("NEXT_PUBLIC_FINZARO_ENV must be development, preview, production, or test.");
  process.exit(1);
}

let url;
try {
  url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
} catch {
  console.error("NEXT_PUBLIC_SUPABASE_URL is not a valid URL.");
  process.exit(1);
}

if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
  console.error("NEXT_PUBLIC_SUPABASE_URL must use HTTPS for remote projects.");
  process.exit(1);
}
if (/YOUR_|REPLACE_ME/i.test(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
  console.error("NEXT_PUBLIC_SUPABASE_URL still contains a placeholder value.");
  process.exit(1);
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
if (siteUrl) {
  let parsedSiteUrl;
  try {
    parsedSiteUrl = new URL(siteUrl);
  } catch {
    console.error("NEXT_PUBLIC_SITE_URL is not a valid URL.");
    process.exit(1);
  }
  if (environment === "production" && parsedSiteUrl.protocol !== "https:") {
    console.error("NEXT_PUBLIC_SITE_URL must use HTTPS in production.");
    process.exit(1);
  }
}

const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (/YOUR_|REPLACE_ME/i.test(key)) {
  console.error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY still contains a placeholder value.");
  process.exit(1);
}
if (!key.startsWith("sb_publishable_") && !key.startsWith("eyJ")) {
  console.warn("Warning: publishable key format is unexpected. Verify the value from Supabase Project > Connect.");
}

console.log(`Finzaro environment OK: ${environment}`);
console.log(`Supabase host: ${url.hostname}`);
console.log(`Site URL: ${siteUrl ?? "request origin fallback"}`);
if (environment === "production" && !siteUrl) {
  console.warn("Warning: NEXT_PUBLIC_SITE_URL is not set. Auth redirects will use the request origin fallback.");
}

const ssiApiKey = process.env.SSI_FASTCONNECT_API_KEY?.trim();
const ssiApiSecret = process.env.SSI_FASTCONNECT_API_SECRET?.trim();
if (Boolean(ssiApiKey) !== Boolean(ssiApiSecret)) {
  console.warn("Warning: SSI FastConnect requires both SSI_FASTCONNECT_API_KEY and SSI_FASTCONNECT_API_SECRET. Auto market pricing will stay disabled until both are configured.");
} else if (ssiApiKey && ssiApiSecret) {
  console.log("SSI FastConnect market data: configured (server-only credentials)");
} else {
  console.log("SSI FastConnect market data: optional / not configured");
}
