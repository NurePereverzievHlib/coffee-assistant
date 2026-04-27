import { API_URL } from "./auth";

export type CoffeeBean = {
  id: number;
  name: string;
  processing_type: string;
  price: number;
  descriptors?: string[] | null;
  image?: string | null;
  weight_in_grams: number;
  stock?: number | null;
};

export async function getCoffeeBeans(): Promise<CoffeeBean[]> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}/coffee-beans/`);
  } catch {
    throw new Error(`Не вдалося підключитись до API (${API_URL}).`);
  }

  if (!response.ok) {
    throw new Error("Не вдалося завантажити каву з бази даних.");
  }

  return response.json() as Promise<CoffeeBean[]>;
}
