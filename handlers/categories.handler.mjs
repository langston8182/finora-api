import { handleCategories } from "../src/controllers/categories.controller.mjs";
export const handler = async (event) => handleCategories(event);