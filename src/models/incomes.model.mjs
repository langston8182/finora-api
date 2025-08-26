import { ObjectId } from "mongodb";
import { getDb } from "../utils/db.mjs";

const COL = "incomes";

export async function insertIncome(doc) {
    const db = await getDb();
    const { insertedId } = await db.collection(COL).insertOne(doc);
    return { ...doc, _id: insertedId };
}

export async function findIncomesByMonth(monthKey, { q, page = 1, pageSize = 50 } = {}) {
    const db = await getDb();
    const filter = { monthKey };
    if (q) filter.$text = { $search: q };

    const cursor = db.collection(COL)
        .find(filter)
        .sort({ dateISO: 1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize);

    const [items, total] = await Promise.all([cursor.toArray(), db.collection(COL).countDocuments(filter)]);
    return { items, total, page, pageSize };
}

export async function updateIncome(id, patch) {
    const db = await getDb();
    const { value } = await db.collection(COL).findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: patch },
        { returnDocument: "after" }
    );
    return value;
}

export async function deleteIncome(id) {
    const db = await getDb();
    await db.collection(COL).deleteOne({ _id: new ObjectId(id) });
}