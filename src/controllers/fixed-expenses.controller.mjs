import { ok, created, noContent, badRequest, serverError, parseJsonBody } from "../utils/http.mjs";
import { fixedExpenseCreateSchema, fixedExpensePatchSchema } from "../utils/validate.mjs";
import { listFixedExpenses, createFixedExpense, patchFixedExpense, removeFixedExpense } from "../services/fixed-expenses.service.mjs";

export async function handleFixedExpenses(event) {
    try {
        const method = event.requestContext?.http?.method || event.httpMethod;
        if (method === "OPTIONS") return ok({});

        if (method === "GET") {
            const items = await listFixedExpenses();
            return ok({ items });
        }

        if (method === "POST") {
            const body = parseJsonBody(event);
            const parsed = fixedExpenseCreateSchema.safeParse(body);
            if (!parsed.success) return badRequest(parsed.error.issues?.[0]?.message || "Invalid body");
            const doc = await createFixedExpense(parsed.data);
            return created(doc);
        }

        if (method === "PATCH") {
            const id = event.pathParameters?.id;
            if (!id) return badRequest("Missing id");
            const body = parseJsonBody(event);
            const parsed = fixedExpensePatchSchema.safeParse(body);
            if (!parsed.success) return badRequest(parsed.error.issues?.[0]?.message || "Invalid body");
            const doc = await patchFixedExpense(id, parsed.data);
            return ok(doc);
        }

        if (method === "DELETE") {
            const id = event.pathParameters?.id;
            if (!id) return badRequest("Missing id");
            await removeFixedExpense(id);
            return noContent();
        }

        return badRequest("Unsupported method");
    } catch (e) {
        return serverError(e);
    }
}