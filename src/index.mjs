// handlers/router.handler.mjs
import { handleExpenses } from "./controllers/expenses.controller.mjs";
import { handleIncomes } from "./controllers/incomes.controller.mjs";
import { handleCategories } from "./controllers/categories.controller.mjs";
import { handleFixedExpenses } from "./controllers/fixed-expenses.controller.mjs";
import { handleRecurringIncomes } from "./controllers/recurring-incomes.controller.mjs";
import { handleSummary } from "./controllers/summary.controller.mjs";
import { handleForecast } from "./controllers/forecast.controller.mjs";
import { handleAuth } from "./controllers/auth.controller.mjs";
import { ok, notFound } from "./utils/http.mjs";

// normalise un path comme /api/v1/expenses/123 -> ["expenses", "123"]
function seg(event) {
    const raw = event.rawPath || event.path || "";
    const path = raw.replace(/^\/+|\/+$/g, "");
    return path.split("/").filter(Boolean);
}

export const handler = async (event) => {
    // Gère aussi les REST API (event.resource / event.path) et HTTP API (event.rawPath)
    const method = event.requestContext?.http?.method || event.httpMethod || "GET";
    const s = seg(event);

    // CORS preflight
    if (method === "OPTIONS") return ok({});

    // Si tu as un base path (ex: /api/v1), enlève-le ici
    if (s[0] === "api" && s[1] === "v1") s.splice(0, 2);

    // Routing simple
    // /expenses, /expenses/{id}
    if (s[0] === "expenses") return handleExpenses(event);
    if (s[0] === "incomes") return handleIncomes(event);
    if (s[0] === "categories") return handleCategories(event);
    if (s[0] === "fixed-expenses") return handleFixedExpenses(event);
    if (s[0] === "recurring-incomes") return handleRecurringIncomes(event);
    if (s[0] === "summary") return handleSummary(event);
    if (s[0] === "forecast" && s[1] === "calc") return handleForecast(event);
    if (s[0] === "auth") return handleAuth(event);

    return notFound("Route not found");
};