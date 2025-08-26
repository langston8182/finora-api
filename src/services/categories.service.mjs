import { insertCategory, findCategories, updateCategory, deleteCategory } from "../models/categories.model.mjs";

export async function listCategories() {
    return findCategories();
}
export async function createCategory(payload) {
    const now = new Date().toISOString();
    return insertCategory({
        name: payload.name,
        color: payload.color ?? "#94a3b8",
        createdAt: now,
        updatedAt: now
    });
}
export async function patchCategory(id, payload) {
    const patch = { ...payload, updatedAt: new Date().toISOString() };
    return updateCategory(id, patch);
}
export async function removeCategory(id) {
    await deleteCategory(id);
    return true;
}