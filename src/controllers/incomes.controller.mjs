import { ok, created, noContent, badRequest, serverError, parseJsonBody } from "../utils/http.mjs";
import { incomeCreateSchema, incomePatchSchema } from "../utils/validate.mjs";
import { createIncome, listIncomes, patchIncome, removeIncome } from "../services/incomes.service.mjs";

export async function handleIncomes(event) {
    try {
        const method = event.requestContext?.http?.method || event.httpMethod;
        if (method === "OPTIONS") return ok({});

        if (method === "GET") {
            const params = event.queryStringParameters || {};
            const month = params.month;
            if (!month) return badRequest("Missing 'month' (YYYY-MM)");
            const result = await listIncomes({
                month,
                q: params.q,
                page: params.page ? Number(params.page) : 1,
                pageSize: params.pageSize ? Number(params.pageSize) : 50
            });
            return ok(result);
        }

        if (method === "POST") {
            const body = parseJsonBody(event);
            const parsed = incomeCreateSchema.safeParse(body);
            if (!parsed.success) return badRequest(parsed.error.issues?.[0]?.message || "Invalid body");
            const doc = await createIncome(parsed.data);
            return created(doc);
        }

        if (method === "PATCH") {
            const id = event.pathParameters?.id;
            if (!id) return badRequest("Missing id");
            const body = parseJsonBody(event);
            const parsed = incomePatchSchema.safeParse(body);
            if (!parsed.success) return badRequest(parsed.error.issues?.[0]?.message || "Invalid body");
            const doc = await patchIncome(id, parsed.data);
            return ok(doc);
        }

        if (method === "DELETE") {
            const id = event.pathParameters?.id;
            if (!id) return badRequest("Missing id");
            await removeIncome(id);
            return noContent();
        }

        return badRequest("Unsupported method");
    } catch (e) {
        return serverError(e);
    }
}