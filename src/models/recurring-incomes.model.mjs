import { ObjectId } from "mongodb";
import { getDb } from "../utils/db.mjs";

const COL = "recurring_incomes";

export async function insertRecurringIncome(doc) {
    const db = await getDb();
    const { insertedId } = await db.collection(COL).insertOne(doc);
    return { ...doc, _id: insertedId };
}
export async function findRecurringIncomes() {
    const db = await getDb();
    return db.collection(COL).find({}).sort({ dayOfMonth: 1, label: 1 }).toArray();
}
export async function updateRecurringIncome(id, patch) {
    const db = await getDb();
    const { value } = await db.collection(COL).findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: patch },
        { returnDocument: "after" }
    );
    return value;
}
export async function deleteRecurringIncome(id) {
    const db = await getDb();
    await db.collection(COL).deleteOne({ _id: new ObjectId(id) });
}