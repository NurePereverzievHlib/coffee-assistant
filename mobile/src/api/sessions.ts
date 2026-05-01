import { API_URL } from "./auth";
import { getAccessToken } from "../storage/authToken";

export type ReviewSession = {
  id: number;
  recipe_id: number;
  recipe_name: string;
  brew_method: string;
  recipe_total_time: string;
  brewed_time?: string | null;
  brewed_seconds?: number | null;
  water_temp: number;
  coffee_grams: number;
  start_time: string;
  end_time?: string | null;
  brew_description?: string | null;
  rating?: number | null;
  review_text?: string | null;
  is_favorite: boolean;
  max_weight?: number | null;
  latest_weight?: number | null;
  max_pour_rate?: number | null;
};

export async function getReviewSessions(favoriteOnly = false): Promise<ReviewSession[]> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error("No access token");
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}/sessions/review?favorite_only=${favoriteOnly ? "true" : "false"}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  } catch {
    throw new Error(`Не вдалося підключитись до API (${API_URL}).`);
  }

  if (!response.ok) {
    throw new Error("Не вдалося завантажити журнал заварювань.");
  }

  return response.json() as Promise<ReviewSession[]>;
}

export async function updateReviewSession(
  sessionId: number,
  payload: { brew_description?: string | null; rating?: number; review_text?: string | null; is_favorite?: boolean }
): Promise<ReviewSession> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error("No access token");
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}/sessions/${sessionId}/review`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
  } catch {
    throw new Error(`Не вдалося підключитись до API (${API_URL}).`);
  }

  if (!response.ok) {
    throw new Error("Не вдалося оновити оцінку заварювання.");
  }

  return response.json() as Promise<ReviewSession>;
}
