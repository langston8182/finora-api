// src/services/forecast.service.mjs
import { getDb } from "../utils/db.mjs";

/**
 * Objectif :
 * - budgetBaseCts (mois N) = solde prévisionnel (projectedBalanceCts) du mois N-1
 *   -> si un forecast sauvegardé existe pour N-1 (collection "forecasts"), on l'utilise
 *   -> sinon, on recalcule le forecast de N-1 en fin de mois (sans extras) et on prend son projectedBalanceCts
 *
 * - Pour le mois N courant :
 *   realized = variables saisies + récurrents/fixes déjà tombés (dayOfMonth <= today)
 *   remaining = récurrents/fixes après aujourd'hui (dayOfMonth > today)
 *   extras = scénarios UI
 *   projectedBalanceCts(N) = budgetBaseCts + realizedNet(N) + remainingNet(N) + extrasNet
 */

// Additionne un pipeline sur plusieurs collections (snake_case / camelCase)
async function sumAgg(db, collectionNames, pipeline) {
    let total = 0;
    for (const name of collectionNames) {
        try {
            const arr = await db.collection(name).aggregate(pipeline).toArray();
            if (arr?.length && typeof arr[0].s === "number") total += arr[0].s;
        } catch (_) {
            // collection absente: ignore
        }
    }
    return total;
}

// Calcule les composantes pour un mois donné, avec un "cutoffDay" (jour de référence)
// cutoffDay = dernier jour du mois -> tout passe en "réalisé", nothing remaining
async function calcMonthComponents(db, month, cutoffDay) {
    const COL = {
        fixed: ["fixed_expenses", "fixedExpenses"],
        recurring: ["recurring_incomes", "recurringIncomes"],
        expenses: ["expenses"],
        incomes: ["incomes"],
    };

    const monthFirst = `${month}-01`;
    const monthLast  = `${month}-31`; // OK pour filtre ISO "YYYY-MM-DD"

    // Variables saisies sur le mois
    const [varExp, varInc] = await Promise.all([
        sumAgg(db, COL.expenses, [
            { $match: { monthKey: month } },
            { $group: { _id: null, s: { $sum: "$amountCts" } } },
            { $project: { _id: 0, s: 1 } }
        ]),
        sumAgg(db, COL.incomes, [
            { $match: { monthKey: month } },
            { $group: { _id: null, s: { $sum: "$amountCts" } } },
            { $project: { _id: 0, s: 1 } }
        ])
    ]);

    // Récurrents/fixes <= cutoffDay => réalisés
    const [fixedOccurred, recurringOccurred] = await Promise.all([
        sumAgg(db, COL.fixed, [
            {
                $match: {
                    $and: [
                        { startDate: { $lte: monthLast } },
                        { $or: [{ endDate: null }, { endDate: { $gte: monthFirst } }] },
                        { dayOfMonth: { $lte: cutoffDay } }
                    ]
                }
            },
            { $group: { _id: null, s: { $sum: "$amountCts" } } },
            { $project: { _id: 0, s: 1 } }
        ]),
        sumAgg(db, COL.recurring, [
            {
                $match: {
                    $and: [
                        { startDate: { $lte: monthLast } },
                        { $or: [{ endDate: null }, { endDate: { $gte: monthFirst } }] },
                        { dayOfMonth: { $lte: cutoffDay } }
                    ]
                }
            },
            { $group: { _id: null, s: { $sum: "$amountCts" } } },
            { $project: { _id: 0, s: 1 } }
        ])
    ]);

    // Récurrents/fixes > cutoffDay => restants
    const [fixedRemaining, recurringRemaining] = await Promise.all([
        sumAgg(db, COL.fixed, [
            {
                $match: {
                    $and: [
                        { startDate: { $lte: monthLast } },
                        { $or: [{ endDate: null }, { endDate: { $gte: monthFirst } }] },
                        { dayOfMonth: { $gt: cutoffDay } }
                    ]
                }
            },
            { $group: { _id: null, s: { $sum: "$amountCts" } } },
            { $project: { _id: 0, s: 1 } }
        ]),
        sumAgg(db, COL.recurring, [
            {
                $match: {
                    $and: [
                        { startDate: { $lte: monthLast } },
                        { $or: [{ endDate: null }, { endDate: { $gte: monthFirst } }] },
                        { dayOfMonth: { $gt: cutoffDay } }
                    ]
                }
            },
            { $group: { _id: null, s: { $sum: "$amountCts" } } },
            { $project: { _id: 0, s: 1 } }
        ])
    ]);

    return {
        realizedExpensesCts: varExp + fixedOccurred,
        realizedIncomesCts:  varInc + recurringOccurred,
        fixedRemainingCts:   fixedRemaining,
        recurringRemainingCts: recurringRemaining
    };
}

function previousMonthKey(month) {
    const [y, mm] = month.split("-").map(Number);
    const d = new Date(Date.UTC(y, mm - 1, 1));
    d.setUTCMonth(d.getUTCMonth() - 1);
    const yy = d.getUTCFullYear();
    const m2 = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${yy}-${m2}`;
}

function lastDayOfMonth(month) {
    const [y, m] = month.split("-").map(Number);
    // jour 0 du mois suivant = dernier jour du mois courant
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export async function calcForecast(body) {
    const db = await getDb();
    const { month, nowISO, extras = [] } = body || {};
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        throw new Error("Missing or invalid 'month' (YYYY-MM)");
    }

    // 0) Budget de base = projectedBalanceCts du mois précédent
    const prevMonth = previousMonthKey(month);

    // a) essaie de lire un forecast sauvegardé (collection "forecasts")
    let budgetBaseCts = 0;
    try {
        const saved = await db.collection("forecasts").findOne({ monthISO: prevMonth });
        if (saved && typeof saved.projectedBalanceCts === "number") {
            budgetBaseCts = saved.projectedBalanceCts;
        }
    } catch (_) {
        // pas de collection/clé : on recalcule
    }

    // b) si pas trouvé, recalculer le prévisionnel de N-1 en "fin de mois" (sans extras)
    if (budgetBaseCts === 0) {
        const cutoffPrev = lastDayOfMonth(prevMonth); // tout devient "réalisé"
        const prevComp = await calcMonthComponents(db, prevMonth, cutoffPrev);
        const prevProjected =
            0 // base pour N-2 non incluse volontairement : on veut juste le solde prévisionnel de N-1
            + (prevComp.realizedIncomesCts - prevComp.realizedExpensesCts);
        // pas de remaining (cutoff = fin de mois), pas d'extras
        budgetBaseCts = prevProjected;
    }

    // 1) Composantes du mois N
    const now = nowISO ? new Date(nowISO) : new Date();
    const cutoffN = now.getUTCDate(); // si tu veux TZ Paris, adapte ici
    const compN = await calcMonthComponents(db, month, cutoffN);

    // 2) Extras (scénarios) du mois N
    let extrasExpenseCts = 0, extrasIncomeCts = 0;
    for (const ex of extras) {
        if (!ex) continue;
        if (ex.type === "expense") extrasExpenseCts += ex.amountCts || 0;
        else if (ex.type === "income") extrasIncomeCts += ex.amountCts || 0;
    }

    // 3) Solde prévisionnel du mois N
    const projectedBalanceCts =
        budgetBaseCts
        + (compN.realizedIncomesCts - compN.realizedExpensesCts)
        + (compN.recurringRemainingCts + extrasIncomeCts)
        - (compN.fixedRemainingCts + extrasExpenseCts);

    return {
        month,
        projectedBalanceCts,
        components: {
            budgetBaseCts,
            realizedExpensesCts: compN.realizedExpensesCts,
            realizedIncomesCts:  compN.realizedIncomesCts,
            fixedRemainingCts:   compN.fixedRemainingCts,
            recurringRemainingCts: compN.recurringRemainingCts,
            extrasExpenseCts,
            extrasIncomeCts
        }
    };
}