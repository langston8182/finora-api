import { insertExpense, findExpensesByMonth, updateExpense, deleteExpense } from "../models/expenses.model.mjs";
import { toMonthKey } from "../utils/monthkey.mjs";

export async function createExpense(payload) {
    const now = new Date().toISOString();
    const monthKey = toMonthKey(payload.date);
    const doc = {
        dateISO: payload.date,
        monthKey,
        label: payload.label,
        amountCts: payload.amountCts,
        categoryId: new (await import("mongodb")).ObjectId(payload.categoryId),
        notes: payload.notes ?? null,
        createdAt: now,
        updatedAt: now
    };
    return insertExpense(doc);
}

export async function listExpenses({ month, categoryId, q, page, pageSize }) {
    return findExpensesByMonth(month, { categoryId, q, page, pageSize });
}

export async function patchExpense(id, payload) {
    const patch = { ...payload, updatedAt: new Date().toISOString() };
    if (payload?.date) {
        patch.dateISO = payload.date;
        patch.monthKey = toMonthKey(payload.date);
        delete patch.date;
    }
    if (payload?.categoryId) {
        patch.categoryId = new (await import("mongodb")).ObjectId(payload.categoryId);
    }
    return updateExpense(id, patch);
}

export async function removeExpense(id) {
    await deleteExpense(id);
    return true;
}