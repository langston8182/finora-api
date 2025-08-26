import { ok, created, noContent, badRequest, serverError, parseJsonBody } from "../utils/http.mjs";
import { recurringIncomeCreateSchema, recurringIncomePatchSchema } from "../utils/validate.mjs";
import { listRecurringIncomes, createRecurringIncome, patchRecurringIncome, removeRecurringIncome } from "../services/recurring-incomes.service.mjs";

export async function handleRecurringIncomes(event) {
    try {
        const method = event.requestContext?.http?.method || event.httpMethod;
        if (method === "OPTIONS") return ok({});

        if (method === "GET") {
            const items = await listRecurringIncomes();
            return ok({ items });
        }

        if (method === "POST") {
            const body = parseJsonBody(event);
            const parsed = recurringIncomeCreateSchema.safeParse(body);
            if (!parsed.success) return badRequest(parsed.error.issues?.[0]?.message || "Invalid body");
            const doc = await createRecurringIncome(parsed.data);
            return created(doc);
        }

        if (method === "PATCH") {
            const id = event.pathParameters?.id;
            if (!id) return badRequest("Missing id");
            const body = parseJsonBody(event);
            const parsed = recurringIncomePatchSchema.safeParse(body);
            if (!parsed.success) return badRequest(parsed.error.issues?.[0]?.message || "Invalid body");
            const doc = await patchRecurringIncome(id, parsed.data);
            return ok(doc);
        }

        if (method === "DELETE") {
            const id = event.pathParameters?.id;
            if (!id) return badRequest("Missing id");
            await removeRecurringIncome(id);
            return noContent();
        }

        return badRequest("Unsupported method");
    } catch (e) {
        return serverError(e);
    }
}