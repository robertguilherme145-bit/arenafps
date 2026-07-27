import assert from "node:assert/strict";
import test from "node:test";
import { createOAuthAuthorization, oauthProviderEnabled, validateOAuthState } from "../src/services/oauth.service.js";

test("gera autorizacao Google com callback e estado protegidos", () => {
  withEnv({
    JWT_SECRET:"oauth-test-secret", PUBLIC_API_URL:"http://localhost:4000",
    GOOGLE_CLIENT_ID:"client-id", GOOGLE_CLIENT_SECRET:"client-secret"
  }, () => {
    assert.equal(oauthProviderEnabled("google"), true);
    const authorization = createOAuthAuthorization("google");
    const url = new URL(authorization.url);
    assert.equal(url.origin, "https://accounts.google.com");
    assert.equal(url.searchParams.get("redirect_uri"), "http://localhost:4000/auth/oauth/google/callback");
    assert.equal(url.searchParams.get("scope"), "openid email profile");
    assert.doesNotThrow(() => validateOAuthState("google", authorization.state, authorization.state));
    assert.throws(() => validateOAuthState("discord", authorization.state, authorization.state));
  });
});

test("inclui o estado no retorno OpenID da Steam", () => {
  withEnv({ JWT_SECRET:"oauth-test-secret", PUBLIC_API_URL:"http://localhost:4000", STEAM_API_KEY:"steam-key" }, () => {
    const authorization = createOAuthAuthorization("steam");
    const url = new URL(authorization.url);
    const returnTo = new URL(url.searchParams.get("openid.return_to"));
    assert.equal(returnTo.origin, "http://localhost:4000");
    assert.equal(returnTo.pathname, "/auth/oauth/steam/callback");
    assert.equal(returnTo.searchParams.get("state"), authorization.state);
  });
});

function withEnv(values, action) {
  const previous = {};
  for (const [key, value] of Object.entries(values)) { previous[key] = process.env[key]; process.env[key] = value; }
  try { action(); }
  finally {
    for (const [key, value] of Object.entries(previous)) value === undefined ? delete process.env[key] : process.env[key] = value;
  }
}
