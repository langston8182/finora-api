import { getDb } from "../utils/db.mjs";

/**
 * Totaux du mois + par catégorie + séries journalières (dépenses/recettes).
 */
export async function getSummaryForMonth(monthKey) {
    const db = await getDb();

    const [varExp, otherInc, byCat, dailyExp, dailyInc] = await Promise.all([
        db.collection("expenses").aggregate([
            { $match: { monthKey } },
            { $group: { _id: null, s: { $sum: "$amountCts" } } },
            { $project: { _id: 0, s: 1 } }
        ]).toArray(),
        db.collection("incomes").aggregate([
            { $match: { monthKey } },
            { $group: { _id: null, s: { $sum: "$amountCts" } } },
            { $project: { _id: 0, s: 1 } }
        ]).toArray(),
        db.collection("expenses").aggregate([
            { $match: { monthKey } },
            { $group: { _id: "$categoryId", amountCts: { $sum: "$amountCts" } } },
            { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "cat" } },
            { $unwind: "$cat" },
            { $project: { _id: 0, categoryId: "$_id", categoryName: "$cat.name", amountCts: 1 } },
            { $sort: { amountCts: -1 } }
        ]).toArray(),
        db.collection("expenses").aggregate([
            { $match: { monthKey } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$dateISO" } }, s: { $sum: "$amountCts" } } },
            { $project: { _id: 0, d: "$_id", s: 1 } },
            { $sort: { d: 1 } }
        ]).toArray(),
        db.collection("incomes").aggregate([
            { $match: { monthKey } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$dateISO" } }, s: { $sum: "$amountCts" } } },
            { $project: { _id: 0, d: "$_id", s: 1 } },
            { $sort: { d: 1 } }
        ]).toArray()
    ]);

    const variableExpensesCts = varExp[0]?.s ?? 0;
    const otherIncomesCts = otherInc[0]?.s ?? 0;

    return {
        month: monthKey,
        totals: {
            variableExpensesCts,
            otherIncomesCts
        },
        byCategory: byCat,
        dailySeries: {
            expenses: dailyExp.map(x => [x.d, x.s]),
            incomes: dailyInc.map(x => [x.d, x.s])
        }
    };
}

/**
 * Derniers N mois (totaux simples) — utile pour graphique barres.
 */
export async function getSummaryForLastMonths(n = 6) {
    const db = await getDb();
    // On agrège par monthKey sur expenses/incomes
    const [exp, inc] = await Promise.all([
        db.collection("expenses").aggregate([
            { $group: { _id: "$monthKey", s: { $sum: "$amountCts" } } },
            { $project: { _id: 0, monthKey: "$_id", expensesCts: "$s" } }
        ]).toArray(),
        db.collection("incomes").aggregate([
            { $group: { _id: "$monthKey", s: { $sum: "$amountCts" } } },
            { $project: { _id: 0, monthKey: "$_id", incomesCts: "$s" } }
        ]).toArray()
    ]);

    // Merge par monthKey
    const map = new Map();
    for (const e of exp) map.set(e.monthKey, { monthKey: e.monthKey, expensesCts: e.expensesCts, incomesCts: 0 });
    for (const i of inc) {
        const row = map.get(i.monthKey) || { monthKey: i.monthKey, expensesCts: 0, incomesCts: 0 };
        row.incomesCts = i.incomesCts;
        map.set(i.monthKey, row);
    }

    // Trie par mois croissant puis prends les N derniers
    const arr = [...map.values()].sort((a,b) => a.monthKey.localeCompare(b.monthKey));
    const last = arr.slice(-n);
    // Ajoute le solde
    for (const r of last) r.balanceCts = (r.incomesCts || 0) - (r.expensesCts || 0);
    return last;
}