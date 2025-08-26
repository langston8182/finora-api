import { ok, created, noContent, badRequest, serverError, parseJsonBody } from "../utils/http.mjs";
import { categoryCreateSchema, categoryPatchSchema } from "../utils/validate.mjs";
import { listCategories, createCategory, patchCategory, removeCategory } from "../services/categories.service.mjs";

export async function handleCategories(event) {
    try {
        const method = event.requestContext?.http?.method || event.httpMethod;
        if (method === "OPTIONS") return ok({});

        if (method === "GET") {
            const items = await listCategories();
            return ok({ items });
        }

        if (method === "POST") {
            const body = parseJsonBody(event);
            const parsed = categoryCreateSchema.safeParse(body);
            if (!parsed.success) return badRequest(parsed.error.issues?.[0]?.message || "Invalid body");
            const doc = await createCategory(parsed.data);
            return created(doc);
        }

        if (method === "PATCH") {
            const id = event.pathParameters?.id;
            if (!id) return badRequest("Missing id");
            const body = parseJsonBody(event);
            const parsed = categoryPatchSchema.safeParse(body);
            if (!parsed.success) return badRequest(parsed.error.issues?.[0]?.message || "Invalid body");
            const doc = await patchCategory(id, parsed.data);
            return ok(doc);
        }

        if (method === "DELETE") {
            const id = event.pathParameters?.id;
            if (!id) return badRequest("Missing id");
            await removeCategory(id);
            return noContent();
        }

        return badRequest("Unsupported method");
    } catch (e) {
        return serverError(e);
    }
}