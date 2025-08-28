// src/controllers/auth.controller.mjs
import { ok, badRequest, unauthorized, redirect } from "../utils/http.mjs";
import { exchangeCodeForTokens, fetchUserInfo, buildLogoutUrl } from "../services/auth.service.mjs";
import { safeDecodeJwt } from "../models/auth.model.mjs";

export async function handleAuth(event) {
    const method = event.requestContext?.http?.method || event.httpMethod || "GET";
    const rawPath = event.rawPath || event.path || "";
    const route = rawPath.replace(/^\/api\/v1\//, ""); // ex: "auth/callback"
    const query = event.queryStringParameters || {};
    const headers = event.headers || {};

    // GET /auth/callback?code=...&state=...&code_verifier=... (optionnel)
    if (route === "auth/callback" && method === "GET") {
        const code = query.code;
        if (!code) return badRequest("Missing 'code'");

        // PKCE: code_verifier peut venir du query, ou d'un cookie côté UI
        const codeVerifierFromQuery = query.code_verifier || query.codeVerifier || null;

        try {
            const tokens = await exchangeCodeForTokens({
                code,
                // si tu gères le PKCE côté UI, renvoie le verifier ici ou mets-le en cookie
                codeVerifier: codeVerifierFromQuery,
            });

            // (optionnel) Décoder l'ID token pour renvoyer un résumé
            const idPayload = tokens.id_token ? safeDecodeJwt(tokens.id_token) : null;

            return ok({
                ...tokens,
                id_payload: idPayload || undefined,
            });
        } catch (e) {
            return badRequest(`Callback exchange failed: ${e?.message || String(e)}`);
        }
    }

    // POST /auth/userinfo   (Authorization: Bearer <access_token>)
    if (route === "auth/userinfo" && method === "POST") {
        const auth = headers.authorization || headers.Authorization;
        if (!auth || !auth.toLowerCase().startsWith("bearer ")) {
            return unauthorized("Missing Bearer access_token");
        }
        const accessToken = auth.slice(7).trim();
        try {
            const userinfo = await fetchUserInfo(accessToken);
            return ok(userinfo);
        } catch (e) {
            return unauthorized(`userinfo failed: ${e?.message || String(e)}`);
        }
    }

    // GET /auth/signout[?redirect_uri=...]
    if (route === "auth/signout" && method === "GET") {
        const target = buildLogoutUrl({ postLogoutRedirectUri: query.redirect_uri });
        return redirect(target);
    }

    // Not handled here
    return null;
}