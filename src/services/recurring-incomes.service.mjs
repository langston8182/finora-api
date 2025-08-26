import {
    insertRecurringIncome,
    findRecurringIncomes,
    updateRecurringIncome,
    deleteRecurringIncome
} from "../models/recurring-incomes.model.mjs";

export async function listRecurringIncomes() {
    return findRecurringIncomes();
}

export async function createRecurringIncome(payload) {
    const now = new Date().toISOString();
    return insertRecurringIncome({
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

export async function patchRecurringIncome(id, payload) {
    const patch = { ...payload, updatedAt: new Date().toISOString() };
    return updateRecurringIncome(id, patch);
}

export async function removeRecurringIncome(id) {
    await deleteRecurringIncome(id);
    return true;
}