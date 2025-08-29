// src/services/auth.service.mjs

// Variables d'environnement attendues (aucun .env fichier)
// - COGNITO_DOMAIN         ex: "https://auth.cyrilmarchive.com"
// - COGNITO_CLIENT_ID      ex: "abc123..."
// - COGNITO_CLIENT_SECRET  (OPTIONNEL si tu es en PKCE public client)
// - AUTH_REDIRECT_URI      ex: "https://ton-ui-domain/auth/callback"
// - AUTH_LOGOUT_REDIRECT_URI (optionnel, fallback logout)

function requiredEnv(name) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env: ${name}`);
    return v;
}

const COGNITO_DOMAIN = requiredEnv("COGNITO_DOMAIN"); // ex: https://auth.cyrilmarchive.com
const COGNITO_CLIENT_ID = requiredEnv("COGNITO_CLIENT_ID");
const AUTH_REDIRECT_URI = requiredEnv("AUTH_REDIRECT_URI");
// Optionnels
const COGNITO_CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET || null;
const AUTH_LOGOUT_REDIRECT_URI = process.env.AUTH_LOGOUT_REDIRECT_URI || null;

/**
 * Échange le code d'autorisation contre les tokens Cognito.
 * Supporte:
 *  - PKCE: fournir `codeVerifier`
 *  - Client secret: si COGNITO_CLIENT_SECRET est présent, on utilise Basic Auth
 */
export async function exchangeCodeForTokens({ code, codeVerifier = null, redirectUri }) {
    const tokenUrl = `${COGNITO_DOMAIN}/oauth2/token`;

    const form = new URLSearchParams();
    form.set("grant_type", "authorization_code");
    form.set("client_id", COGNITO_CLIENT_ID);
    form.set("redirect_uri", redirectUri || AUTH_REDIRECT_URI);
    form.set("code", code);
    if (codeVerifier) {
        form.set("code_verifier", codeVerifier);
    }

    const headers = { "Content-Type": "application/x-www-form-urlencoded" };
    if (COGNITO_CLIENT_SECRET && !codeVerifier) {
        // Client "confidential" sans PKCE : Authorization Basic
        const basic = Buffer.from(`${COGNITO_CLIENT_ID}:${COGNITO_CLIENT_SECRET}`).toString("base64");
        headers.Authorization = `Basic ${basic}`;
    }

    const res = await fetch(tokenUrl, { method: "POST", headers, body: form.toString() });
    const txt = await res.text();
    if (!res.ok) {
        throw new Error(`Token endpoint ${res.status}: ${txt}`);
    }

    let json;
    try { json = JSON.parse(txt); } catch { throw new Error("Invalid JSON from token endpoint"); }

    // attendu: { id_token, access_token, refresh_token, token_type, expires_in }
    return json;
}

/**
 * Appelle Cognito /oauth2/userInfo avec un access_token Bearer.
 */
export async function fetchUserInfo(accessToken) {
    const url = `${COGNITO_DOMAIN}/oauth2/userInfo`;
    const res = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    const txt = await res.text();
    if (!res.ok) {
        throw new Error(`userInfo ${res.status}: ${txt}`);
    }
    try { return JSON.parse(txt); } catch { return {}; }
}

/**
 * Construit l'URL de logout Hosted UI
 * /logout?client_id=...&logout_uri=...
 */
export function buildLogoutUrl({ postLogoutRedirectUri }) {
    const logoutUri = postLogoutRedirectUri || AUTH_LOGOUT_REDIRECT_URI || AUTH_REDIRECT_URI.replace(/\/auth\/callback$/, "/");
    const u = new URL(`${COGNITO_DOMAIN}/logout`);
    u.searchParams.set("client_id", COGNITO_CLIENT_ID);
    u.searchParams.set("logout_uri", logoutUri);
    return u.toString();
}