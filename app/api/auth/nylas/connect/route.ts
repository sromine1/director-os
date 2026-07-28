import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  getNylasConfig,
  isNylasProvider,
} from "@/lib/connectors/email/nylas/config";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get("provider");

  if (!isNylasProvider(provider)) {
    return NextResponse.json(
      { error: "Provider must be either google or microsoft." },
      { status: 400 },
    );
  }

  try {
    const config = getNylasConfig();
    const state = randomBytes(32).toString("hex");
    const authorizationUrl = new URL(`${config.apiUri}/v3/connect/auth`);

    authorizationUrl.searchParams.set("client_id", config.clientId);
    authorizationUrl.searchParams.set("redirect_uri", config.callbackUri);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("provider", provider);
    authorizationUrl.searchParams.set("state", state);

    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set("nylas_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 10 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start Nylas OAuth.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
