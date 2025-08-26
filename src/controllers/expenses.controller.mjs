import { ok, created, noContent, badRequest, serverError, parseJsonBody } from "../utils/http.mjs";
import { expenseCreateSchema } from "../utils/validate.mjs";
import { createExpense, listExpenses, patchExpense, removeExpense } from "../services/expenses.service.mjs";

export async function handleExpenses(event) {
    try {
        const method = event.requestContext?.http?.method || event.httpMethod; // REST or HTTP API
        if (method === "OPTIONS") return ok({}); // CORS preflight

        if (method === "GET") {
            const params = event.queryStringParameters || {};
            const month = params.month;
            if (!month) return badRequest("Missing 'month' (YYYY-MM)");
            const result = await listExpenses({
                month,
                categoryId: params.categoryId,
                q: params.q,
                page: params.page ? Number(params.page) : 1,
                pageSize: params.pageSize ? Number(params.pageSize) : 50
            });
            return ok(result);
        }

        if (method === "POST") {
            const body = parseJsonBody(event);
            const parsed = expenseCreateSchema.safeParse(body);
            if (!parsed.success) return badRequest(parsed.error.issues?.[0]?.message || "Invalid body");
            const doc = await createExpense(parsed.data);
            return created(doc);
        }

        if (method === "PATCH") {
            const id = event.pathParameters?.id;
            if (!id) return badRequest("Missing id");
            const body = parseJsonBody(event);
            const updated = await patchExpense(id, body);
            return ok(updated);
        }

        if (method === "DELETE") {
            const id = event.pathParameters?.id;
            if (!id) return badRequest("Missing id");
            await removeExpense(id);
            return noContent();
        }

        return badRequest("Unsupported method");
    } catch (err) {
        return serverError(err);
    }
}