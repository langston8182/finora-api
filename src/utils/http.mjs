export function ok(body) {
    return { statusCode: 200, headers: cors(), body: JSON.stringify(body) };
}
export function created(body) {
    return { statusCode: 201, headers: cors(), body: JSON.stringify(body) };
}
export function noContent() {
    return { statusCode: 204, headers: cors(), body: "" };
}
export function badRequest(msg) {
    return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: msg }) };
}
export function notFound(msg = "Not found") {
    return { statusCode: 404, headers: cors(), body: JSON.stringify({ error: msg }) };
}
export function serverError(err) {
    console.error(err);
    return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: "Internal error" }) };
}

export function redirect(location, originOrEvent) {
    const origin = typeof originOrEvent === "string" ? originOrEvent : originFromEvent(originOrEvent);
    const headers = buildCorsHeaders(origin);
    return { statusCode: 302, headers: { ...headers, Location: location }, body: "" };
}

export function cors() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization,content-type",
        "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS"
    };
}
export function parseJsonBody(event) {
    if (!event?.body) return {};
    try { return JSON.parse(event.body); } catch { return {}; }
}