// src/models/auth.model.mjs

/**
 * Décodage "safe" d'un JWT sans vérification cryptographique.
 * Utile pour lire les claims (email, sub, exp) côté serveur ou pour debug.
 * Ne remplace PAS une vérification de signature si tu en as besoin.
 */
export function safeDecodeJwt(token) {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;
        const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
        return payload;
    } catch {
        return null;
    }
}