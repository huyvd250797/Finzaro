const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
const missing = required.filter((name) => !process.env[name]?.trim());

if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
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

const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!key.startsWith("sb_publishable_") && !key.startsWith("eyJ")) {
  console.warn("Warning: publishable key format is unexpected. Verify the value from Supabase Project > Connect.");
}

console.log(`Finzaro environment OK: ${process.env.NEXT_PUBLIC_FINZARO_ENV ?? "development"}`);
console.log(`Supabase host: ${url.hostname}`);
