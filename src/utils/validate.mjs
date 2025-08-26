import { z } from "zod";

export const objectIdLike = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

// ---------- Common ----------
export const monthKeyLike = z.string().regex(/^\d{4}-\d{2}$/, "Invalid month (YYYY-MM)");
export const positiveCents = z.number().int().positive();

// ---------- Categories ----------
export const categoryCreateSchema = z.object({
    name: z.string().min(1),
    color: z.string().optional()
});
export const categoryPatchSchema = z.object({
    name: z.string().min(1).optional(),
    color: z.string().optional()
});

// ---------- Expenses ----------
export const expenseCreateSchema = z.object({
    date: z.string().min(1),
    label: z.string().min(1),
    amountCts: positiveCents,
    categoryId: objectIdLike,
    notes: z.string().optional()
});
export const expensePatchSchema = z.object({
    date: z.string().min(1).optional(),
    label: z.string().min(1).optional(),
    amountCts: positiveCents.optional(),
    categoryId: objectIdLike.optional(),
    notes: z.string().optional()
});

// ---------- Incomes ----------
export const incomeCreateSchema = z.object({
    date: z.string().min(1),
    label: z.string().min(1),
    amountCts: positiveCents,
    notes: z.string().optional()
});
export const incomePatchSchema = z.object({
    date: z.string().min(1).optional(),
    label: z.string().min(1).optional(),
    amountCts: positiveCents.optional(),
    notes: z.string().optional()
});

// ---------- Fixed Expenses ----------
export const fixedExpenseCreateSchema = z.object({
    label: z.string().min(1),
    amountCts: positiveCents,
    dayOfMonth: z.number().int().min(1).max(31),
    startDate: z.string().min(1),
    endDate: z.string().optional(),
    notes: z.string().optional()
});
export const fixedExpensePatchSchema = z.object({
    label: z.string().min(1).optional(),
    amountCts: positiveCents.optional(),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    notes: z.string().optional()
});

// ---------- Recurring Incomes ----------
export const recurringIncomeCreateSchema = z.object({
    label: z.string().min(1),
    amountCts: positiveCents,
    dayOfMonth: z.number().int().min(1).max(31),
    startDate: z.string().min(1),
    endDate: z.string().optional(),
    notes: z.string().optional()
});
export const recurringIncomePatchSchema = z.object({
    label: z.string().min(1).optional(),
    amountCts: positiveCents.optional(),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    notes: z.string().optional()
});