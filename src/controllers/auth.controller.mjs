// src/controllers/auth.controller.mjs
import {ok, badRequest, unauthorized, redirect} from "../utils/http.mjs";
import {exchangeCodeForTokens, fetchUserInfo, buildLogoutUrl} from "../services/auth.service.mjs";
import {safeDecodeJwt} from "../models/auth.model.mjs";
import {okWithCookies, redirectWithCookies, makeCookie} from "../utils/http.mjs";

function getOrigin(event) {
    return event?.headers?.origin || event?.headers?.Origin || "";
}

function computeRedirectUri(event) {
    const env = (process.env.ENVIRONMENT || "preprod").toLowerCase();
    const origin = getOrigin(event);
    const UI_PROD_BASE = process.env.UI_PROD_BASE || "https://finora.cyrilmarchive.com";
    const UI_PREPROD_BASE = process.env.UI_PREPROD_BASE || "https://finora-preprod.cyrilmarchive.com";

    // Dev local (appel depuis Vite)
    if (origin.startsWith("http://localhost:5173")) {
        return "http://localhost:5173/auth/callback";
    }

    // Environnements
    if (env === "prod") {
        return `${UI_PROD_BASE}/auth/callback`;
    }
    // défaut: preprod
    return `${UI_PREPROD_BASE}/auth/callback`;
}

// Simple cookie parser to read a cookie value from the Cookie header
function getCookieValue(cookieHeader, name) {
    if (!cookieHeader) return null;
    const cookies = cookieHeader.split(";").map(c => c.trim());
    for (const cookie of cookies) {
        const [key, ...valParts] = cookie.split("=");
        if (key === name) return valParts.join("=");
    }
    return null;
}

export async function handleAuth(event) {
    const method = event.requestContext?.http?.method || event.httpMethod || "GET";
    const rawPath = event.rawPath || event.path || "";
    const route = rawPath.replace(/^\/api\/v1\//, ""); // ex: "auth/callback"
    const query = event.queryStringParameters || {};
    const headers = event.headers || {};
    const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || ""; // ex: ".cyrilmarchive.com"

    // GET /auth/callback?code=...&state=...&code_verifier=... (optionnel)
    if (route === "auth/callback" && method === "GET") {
        const code = query.code;
        if (!code) return badRequest("Missing 'code'", event);

        try {
            const redirectUri = computeRedirectUri(event);
            const tokens = await exchangeCodeForTokens({
                code,
                codeVerifier: query.code_verifier || query.codeVerifier || null,
                redirectUri
            });

            // Durées
            const exp = Number(tokens.expires_in || 3600);
            const cookies = [];

            // Cookies HttpOnly (non lisibles par JS)
            if (tokens.access_token) {
                cookies.push(makeCookie("finora_at", tokens.access_token, {
                    domain: COOKIE_DOMAIN, maxAge: exp - 60, secure: true, httpOnly: true, sameSite: "None"
                }));
            }
            if (tokens.refresh_token) {
                // garde-le plus longtemps si Cognito le permet (ex. 30j), ici on ne met pas Max-Age -> cookie session
                cookies.push(makeCookie("finora_rt", tokens.refresh_token, {
                    domain: COOKIE_DOMAIN, secure: true, httpOnly: true, sameSite: "None"
                }));
            }
            if (tokens.id_token) {
                // souvent inutile côté API; si tu veux l'exposer au front, enlève HttpOnly (à éviter)
                cookies.push(makeCookie("finora_id", tokens.id_token, {
                    domain: COOKIE_DOMAIN, maxAge: exp - 60, secure: true, httpOnly: true, sameSite: "None"
                }));
            }

            // Réponse minimaliste : le front n'a pas besoin de lire les tokens, ils sont dans les cookies
            return okWithCookies({ok: true}, event, cookies);
        } catch (e) {
            return badRequest(`Callback exchange failed: ${e?.message || String(e)}`, event);
        }
    }

    // POST /auth/userinfo  — lit l'access token depuis le cookie HttpOnly finora_at
    if (route === "auth/userinfo" && method === "POST") {
        const cookieHeader =
            (Array.isArray(event.cookies) && event.cookies.join("; ")) ||
            headers.cookie ||
            headers.Cookie ||
            "";
        const accessToken = getCookieValue(cookieHeader, "finora_at");
        if (!accessToken) {
            return unauthorized("access_token manquant dans les cookies", event);
        }

        try {
            const userinfo = await fetchUserInfo(accessToken);
            return ok(userinfo, event);
        } catch (e) {
            return unauthorized(`userinfo failed: ${e?.message || String(e)}`, event);
        }
    }

    // GET /auth/signout[?redirect_uri=...]
    if (route === "auth/signout" && method === "GET") {
        const target = buildLogoutUrl({postLogoutRedirectUri: query.redirect_uri});
        const cookies = [
            makeCookie("finora_at", "", {domain: COOKIE_DOMAIN, maxAge: 0}),
            makeCookie("finora_rt", "", {domain: COOKIE_DOMAIN, maxAge: 0}),
            makeCookie("finora_id", "", {domain: COOKIE_DOMAIN, maxAge: 0})
        ];
        return redirectWithCookies(target, event, cookies);
    }

    // Not handled here
    return null;
}