import { ObjectId } from "mongodb";
import { getDb } from "../utils/db.mjs";

export async function insertExpense(doc) {
    const db = await getDb();
    const { insertedId } = await db.collection("expenses").insertOne(doc);
    return { ...doc, _id: insertedId };
}

export async function findExpensesByMonth(monthKey, { categoryId, q, page = 1, pageSize = 50 } = {}) {
    const db = await getDb();
    const filter = { monthKey };
    if (categoryId) filter.categoryId = new ObjectId(categoryId);
    if (q) filter.$text = { $search: q };

    const cursor = db.collection("expenses")
        .find(filter)
        .sort({ dateISO: 1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize);

    const [items, total] = await Promise.all([cursor.toArray(), db.collection("expenses").countDocuments(filter)]);
    return { items, total, page, pageSize };
}

export async function updateExpense(id, patch) {
    const db = await getDb();
    const { value } = await db.collection("expenses").findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: patch },
        { returnDocument: "after" }
    );
    return value;
}

export async function deleteExpense(id) {
    const db = await getDb();
    await db.collection("expenses").deleteOne({ _id: new ObjectId(id) });
}