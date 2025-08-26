import { insertIncome, findIncomesByMonth, updateIncome, deleteIncome } from "../models/incomes.model.mjs";
import { toMonthKey } from "../utils/monthkey.mjs";

export async function createIncome(payload) {
    const now = new Date().toISOString();
    const monthKey = toMonthKey(payload.date);
    return insertIncome({
        dateISO: payload.date,
        monthKey,
        label: payload.label,
        amountCts: payload.amountCts,
        notes: payload.notes ?? null,
        createdAt: now,
        updatedAt: now
    });
}

export async function listIncomes({ month, q, page, pageSize }) {
    return findIncomesByMonth(month, { q, page, pageSize });
}

export async function patchIncome(id, payload) {
    const patch = { ...payload, updatedAt: new Date().toISOString() };
    if (payload?.date) {
        patch.dateISO = payload.date;
        patch.monthKey = toMonthKey(payload.date);
        delete patch.date;
    }
    return updateIncome(id, patch);
}

export async function removeIncome(id) {
    await deleteIncome(id);
    return true;
}