import { ok, badRequest, parseJsonBody, serverError } from "../utils/http.mjs";
import { calcForecast } from "../services/forecast.service.mjs";

export async function handleForecast(event) {
    try {
        const method = event.requestContext?.http?.method || event.httpMethod;
        if (method === "OPTIONS") return ok({});
        if (method !== "POST") return badRequest("Use POST");

        const body = parseJsonBody(event);
        if (!body?.month) return badRequest("Missing 'month' (YYYY-MM)");
        const data = await calcForecast(body);
        return ok(data);
    } catch (e) {
        return serverError(e);
    }
}