import { getDb } from "../utils/db.mjs";

/**
 * Calcule le solde projeté pour un mois:
 * - realized: dépenses/recettes déjà saisies (collections expenses/incomes)
 * - remaining fixed: charges fixes actives dont dayOfMonth >= today
 * - remaining recurring: revenus récurrents actifs dont dayOfMonth >= today
 * - extras: scénarios transmis (positifs/négatifs)
 *
 * body = { month: "YYYY-MM", nowISO?: "...", extras?: [{type:'expense'|'income', amountCts}] }
 */
export async function calcForecast(body) {
    const db = await getDb();
    const { month, nowISO, extras = [] } = body;
    const now = nowISO ? new Date(nowISO) : new Date();
    const today = now.getUTCDate();

    // realized
    const [expAgg, incAgg] = await Promise.all([
        db.collection("expenses").aggregate([
            { $match: { monthKey: month } },
            { $group: { _id: null, s: { $sum: "$amountCts" } } },
            { $project: { _id: 0, s: 1 } }
        ]).toArray(),
        db.collection("incomes").aggregate([
            { $match: { monthKey: month } },
            { $group: { _id: null, s: { $sum: "$amountCts" } } },
            { $project: { _id: 0, s: 1 } }
        ]).toArray()
    ]);

    const realizedExpensesCts = expAgg[0]?.s ?? 0;
    const realizedIncomesCts = incAgg[0]?.s ?? 0;

    // fixed remaining (actifs dans le mois, dayOfMonth >= today)
    const fixedRemainingCts = await db.collection("fixed_expenses").aggregate([
        {
            $match: {
                $and: [
                    { $or: [{ endDate: null }, { endDate: { $gte: month + "-01" } }] },
                    { startDate: { $lte: month + "-31" } },
                    { dayOfMonth: { $gte: today } }
                ]
            }
        },
        { $group: { _id: null, s: { $sum: "$amountCts" } } },
        { $project: { _id: 0, s: 1 } }
    ]).toArray().then(a => a[0]?.s ?? 0);

    // recurring remaining (idem)
    const recurringRemainingCts = await db.collection("recurring_incomes").aggregate([
        {
            $match: {
                $and: [
                    { $or: [{ endDate: null }, { endDate: { $gte: month + "-01" } }] },
                    { startDate: { $lte: month + "-31" } },
                    { dayOfMonth: { $gte: today } }
                ]
            }
        },
        { $group: { _id: null, s: { $sum: "$amountCts" } } },
        { $project: { _id: 0, s: 1 } }
    ]).toArray().then(a => a[0]?.s ?? 0);

    // extras
    let extrasExpenseCts = 0, extrasIncomeCts = 0;
    for (const ex of extras) {
        if (ex?.type === "expense") extrasExpenseCts += ex.amountCts || 0;
        else if (ex?.type === "income") extrasIncomeCts += ex.amountCts || 0;
    }

    const projectedBalanceCts =
        (recurringRemainingCts + realizedIncomesCts + extrasIncomeCts) -
        (fixedRemainingCts + realizedExpensesCts + extrasExpenseCts);

    return {
        month,
        projectedBalanceCts,
        components: {
            realizedExpensesCts,
            realizedIncomesCts,
            fixedRemainingCts,
            recurringRemainingCts,
            extrasExpenseCts,
            extrasIncomeCts
        }
    };
}