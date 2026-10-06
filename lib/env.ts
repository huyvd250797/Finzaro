export type FinzaroEnvironment = "development" | "preview" | "production" | "test";

export type PublicSupabaseConfig = {
  url: string;
  publishableKey: string;
};

function normalizeEnvironment(value: string | undefined): FinzaroEnvironment {
  if (value === "production" || value === "preview" || value === "test") {
    return value;
  }
  return "development";
}

export function getFinzaroEnvironment(): FinzaroEnvironment {
  return normalizeEnvironment(process.env.NEXT_PUBLIC_FINZARO_ENV);
}

export function getPublicSupabaseConfig(): PublicSupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    return null;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
      return null;
    }
  } catch {
    return null;
  }

  return { url, publishableKey };
}

export function requirePublicSupabaseConfig(): PublicSupabaseConfig {
  const config = getPublicSupabaseConfig();

  if (!config) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  return config;
}
