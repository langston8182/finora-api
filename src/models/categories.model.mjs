import { ObjectId } from "mongodb";
import { getDb } from "../utils/db.mjs";

const COL = "categories";

export async function insertCategory(doc) {
    const db = await getDb();
    const { insertedId } = await db.collection(COL).insertOne(doc);
    return { ...doc, _id: insertedId };
}
export async function findCategories() {
    const db = await getDb();
    return db.collection(COL).find({}).sort({ name: 1 }).toArray();
}
export async function updateCategory(id, patch) {
    const db = await getDb();
    const { value } = await db.collection(COL).findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: patch },
        { returnDocument: "after" }
    );
    return value;
}
export async function deleteCategory(id) {
    const db = await getDb();
    await db.collection(COL).deleteOne({ _id: new ObjectId(id) });
}