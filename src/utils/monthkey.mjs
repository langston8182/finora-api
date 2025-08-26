export function toMonthKey(dateISO) {
    // dateISO: "YYYY-MM-DD" ou ISO complet
    const d = new Date(dateISO);
    if (Number.isNaN(d.getTime())) throw new Error("Invalid date");
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}