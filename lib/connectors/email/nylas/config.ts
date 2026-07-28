export type NylasProvider = "google" | "microsoft";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getNylasConfig() {
  const apiUri = (process.env.NYLAS_API_URI ?? "https://api.us.nylas.com").replace(/\/$/, "");
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

  return {
    apiKey: requireEnv("NYLAS_API_KEY"),
    clientId: requireEnv("NYLAS_CLIENT_ID"),
    apiUri,
    callbackUri:
      process.env.NYLAS_CALLBACK_URI?.trim() ||
      `${appUrl}/api/auth/nylas/callback`,
  };
}

export function isNylasProvider(value: string | null): value is NylasProvider {
  return value === "google" || value === "microsoft";
}
