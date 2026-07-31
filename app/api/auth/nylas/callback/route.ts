import { NextRequest, NextResponse } from "next/server";
import { getNylasConfig } from "@/lib/connectors/email/nylas/config";

export const runtime = "nodejs";

type TokenExchangeResponse = {
  grant_id?: string;
  email?: string;
  provider?: string;
  error?: string;
  error_description?: string;
};

export async function GET(request: NextRequest) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const redirectUrl = new URL("/", appUrl);
  const returnedState = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get("nylas_oauth_state")?.value;
  const code = request.nextUrl.searchParams.get("code");
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError) {
    redirectUrl.searchParams.set("nylas", "error");
    redirectUrl.searchParams.set("message", oauthError);
    return clearStateAndRedirect(redirectUrl);
  }

  if (!code) {
    redirectUrl.searchParams.set("nylas", "error");
    redirectUrl.searchParams.set("message", "Nylas did not return an authorization code.");
    return clearStateAndRedirect(redirectUrl);
  }

  if (!expectedState || !returnedState || returnedState !== expectedState) {
    redirectUrl.searchParams.set("nylas", "error");
    redirectUrl.searchParams.set("message", "The OAuth state check failed. Please try connecting again.");
    return clearStateAndRedirect(redirectUrl);
  }

  try {
    const config = getNylasConfig();
    const tokenResponse = await fetch(`${config.apiUri}/v3/connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.apiKey,
        grant_type: "authorization_code",
        code,
        redirect_uri: config.callbackUri,
      }),
      cache: "no-store",
    });

    const tokenData = (await tokenResponse.json()) as TokenExchangeResponse;

    if (!tokenResponse.ok || !tokenData.grant_id) {
      throw new Error(
        tokenData.error_description || tokenData.error || "Nylas token exchange failed.",
      );
    }

    redirectUrl.searchParams.set("nylas", "connected");
    if (tokenData.email) redirectUrl.searchParams.set("email", tokenData.email);
    if (tokenData.provider) redirectUrl.searchParams.set("provider", tokenData.provider);

    const response = clearStateAndRedirect(redirectUrl);
    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    };

    response.cookies.set("nylas_grant_id", tokenData.grant_id, cookieOptions);
    response.cookies.set("nylas_account_email", tokenData.email ?? "", cookieOptions);
    response.cookies.set("nylas_account_provider", tokenData.provider ?? "unknown", cookieOptions);

    return response;
  } catch (error) {
    redirectUrl.searchParams.set("nylas", "error");
    redirectUrl.searchParams.set(
      "message",
      error instanceof Error ? error.message : "Unable to complete Nylas OAuth.",
    );
    return clearStateAndRedirect(redirectUrl);
  }
}

function clearStateAndRedirect(url: URL) {
  const response = NextResponse.redirect(url);
  response.cookies.set("nylas_oauth_state", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
    path: "/",
  });
  return response;
}
