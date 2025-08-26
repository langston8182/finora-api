import { insertFixedExpense, findFixedExpenses, updateFixedExpense, deleteFixedExpense } from "../models/fixed-expenses.model.mjs";

export async function listFixedExpenses() {
    return findFixedExpenses();
}

export async function createFixedExpense(payload) {
    const now = new Date().toISOString();
    return insertFixedExpense({
        label: payload.label,
        amountCts: payload.amountCts,
        dayOfMonth: payload.dayOfMonth,
        startDate: payload.startDate,
        endDate: payload.endDate ?? null,
        notes: payload.notes ?? null,
        createdAt: now,
        updatedAt: now
    });
}

export async function patchFixedExpense(id, payload) {
    const patch = { ...payload, updatedAt: new Date().toISOString() };
    return updateFixedExpense(id, patch);
}

export async function removeFixedExpense(id) {
    await deleteFixedExpense(id);
    return true;
}