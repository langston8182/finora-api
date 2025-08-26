import { ok, badRequest, serverError } from "../utils/http.mjs";
import { getSummaryForMonth, getSummaryForLastMonths } from "../services/summary.service.mjs";

export async function handleSummary(event) {
    try {
        const method = event.requestContext?.http?.method || event.httpMethod;
        if (method === "OPTIONS") return ok({});

        const params = event.queryStringParameters || {};
        if (params.month) {
            const data = await getSummaryForMonth(params.month);
            return ok(data);
        }
        if (params.months) {
            const n = Math.max(1, Math.min(24, Number(params.months)));
            const data = await getSummaryForLastMonths(n);
            return ok(data);
        }
        return badRequest("Provide 'month=YYYY-MM' or 'months=N'");
    } catch (e) {
        return serverError(e);
    }
}