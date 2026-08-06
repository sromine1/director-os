export type ConnectedAccount = {
  provider: "google" | "microsoft";
  grantId: string;
  email?: string;
};

type CookieReader = {
  get(name: string): { value: string } | undefined;
};

export function getConnectedAccounts(cookieStore: CookieReader) {
  const accounts: ConnectedAccount[] = [];
  const googleGrantId = cookieStore.get("nylas_google_grant_id")?.value;
  const microsoftGrantId = cookieStore.get("nylas_microsoft_grant_id")?.value;

  if (googleGrantId) {
    accounts.push({
      provider: "google",
      grantId: googleGrantId,
      email: cookieStore.get("nylas_google_account_email")?.value,
    });
  }

  if (microsoftGrantId) {
    accounts.push({
      provider: "microsoft",
      grantId: microsoftGrantId,
      email: cookieStore.get("nylas_microsoft_account_email")?.value,
    });
  }

  if (accounts.length === 0) {
    const grantId = cookieStore.get("nylas_grant_id")?.value;
    const provider = normalizeConnectedProvider(
      cookieStore.get("nylas_account_provider")?.value,
    );

    if (grantId && provider) {
      accounts.push({
        provider,
        grantId,
        email: cookieStore.get("nylas_account_email")?.value,
      });
    }
  }

  return accounts;
}

export function connectedProviderName(provider: ConnectedAccount["provider"]) {
  return provider === "google" ? "Google" : "Outlook";
}

function normalizeConnectedProvider(value?: string) {
  const provider = value?.toLowerCase();
  if (provider?.includes("google")) return "google" as const;
  if (provider?.includes("microsoft") || provider?.includes("outlook")) {
    return "microsoft" as const;
  }
  return null;
}
