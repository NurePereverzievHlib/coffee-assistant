import { API_URL } from "./auth";
import { getAccessToken } from "../storage/authToken";

export type Recipe = {
  id: number;
  name: string;
  description?: string | null;
  brew_method: string;
  created_by?: number | null;
  coffee_bean_id: number | null;
  coffee_grams: number;
  water_temp: number;
  grind_level: number;
  total_time: string;
  coffee_name?: string | null;
  coffee_image?: string | null;
  steps: Array<{
    id: number;
    step_number: number;
    step_type: string;
    start_time: number;
    water_volume: number;
  }>;
};

export type RecipeStepPayload = {
  step_number: number;
  step_type: string;
  start_time: number;
  water_volume: number;
};

export type RecipeCreatePayload = {
  name: string;
  description?: string | null;
  brew_method: string;
  coffee_bean_id?: number | null;
  coffee_grams: number;
  water_temp: number;
  grind_level: number;
  total_time: string;
  steps: RecipeStepPayload[];
};

function isDirectImageUrl(image: string) {
  return image.startsWith("data:image/") || /\.(avif|gif|jpe?g|png|webp)(\?.*)?$/i.test(image);
}

function normalizeImageUrl(image?: string | null) {
  if (!image) {
    return null;
  }

  image = image.trim().replace(/^["']|["']$/g, "");

  if (image.startsWith("http://127.0.0.1") || image.startsWith("http://localhost")) {
    try {
      const apiUrl = new URL(API_URL);
      const imageUrl = new URL(image);
      imageUrl.protocol = apiUrl.protocol;
      imageUrl.host = apiUrl.host;
      const normalized = imageUrl.toString();
      return isDirectImageUrl(normalized) ? normalized : null;
    } catch {
      return isDirectImageUrl(image) ? image : null;
    }
  }

  if (image.startsWith("http://") || image.startsWith("https://") || image.startsWith("data:image/")) {
    try {
      const normalized = image.startsWith("data:image/") ? image : new URL(image).toString();
      return isDirectImageUrl(normalized) ? normalized : null;
    } catch {
      return isDirectImageUrl(image) ? image : null;
    }
  }

  if (image.startsWith("/")) {
    return `${API_URL}${image}`;
  }

  return `${API_URL}/${image}`;
}

export async function getRecipes(): Promise<Recipe[]> {
  let response: Response;
  const token = await getAccessToken();

  try {
    response = await fetch(`${API_URL}/recipes/`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
  } catch {
    throw new Error(`Не вдалося підключитись до API (${API_URL}).`);
  }

  if (!response.ok) {
    throw new Error("Не вдалося завантажити рецепти.");
  }

  const recipes = (await response.json()) as Recipe[];

  return recipes.map((recipe) => ({
    ...recipe,
    coffee_image: normalizeImageUrl(recipe.coffee_image)
  }));
}

export async function getRecipe(recipeId: number): Promise<Recipe> {
  let response: Response;
  const token = await getAccessToken();

  try {
    response = await fetch(`${API_URL}/recipes/${recipeId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
  } catch {
    throw new Error(`Не вдалося підключитись до API (${API_URL}).`);
  }

  if (!response.ok) {
    throw new Error("Не вдалося завантажити рецепт.");
  }

  const recipe = (await response.json()) as Recipe;

  return {
    ...recipe,
    coffee_image: normalizeImageUrl(recipe.coffee_image)
  };
}

export async function createRecipe(payload: RecipeCreatePayload): Promise<Recipe> {
  const token = await getAccessToken();
  let response: Response;

  try {
    response = await fetch(`${API_URL}/recipes/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });
  } catch {
    throw new Error(`Не вдалося підключитись до API (${API_URL}).`);
  }

  if (!response.ok) {
    throw new Error("Не вдалося створити рецепт.");
  }

  const recipe = (await response.json()) as Recipe;

  return {
    ...recipe,
    coffee_image: normalizeImageUrl(recipe.coffee_image)
  };
}

export async function updateRecipe(recipeId: number, payload: RecipeCreatePayload): Promise<Recipe> {
  const token = await getAccessToken();
  let response: Response;

  try {
    response = await fetch(`${API_URL}/recipes/${recipeId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });
  } catch {
    throw new Error(`Не вдалося підключитись до API (${API_URL}).`);
  }

  if (!response.ok) {
    throw new Error("Не вдалося оновити рецепт.");
  }

  const recipe = (await response.json()) as Recipe;

  return {
    ...recipe,
    coffee_image: normalizeImageUrl(recipe.coffee_image)
  };
}
