import { getAccessToken } from "../storage/authToken";

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  username: string;
  email: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: "bearer";
};

export type GoogleLoginPayload = {
  id_token: string;
};

export type RegisterResponse = {
  id: number;
  username: string;
  email: string;
  avatar_url?: string | null;
  created_at: string;
};

export type CurrentUser = RegisterResponse;

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const connectionError = `Не вдалося підключитись до API (${API_URL}). Перевірте, що FastAPI запущений з --host 0.0.0.0.`;

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  } catch {
    throw new Error(connectionError);
  }

  if (!response.ok) {
    let message = "Не вдалося увійти. Перевірте email і пароль.";

    try {
      const error = (await response.json()) as { detail?: string };
      if (error.detail === "Invalid credentials") {
        message = "Невірний email або пароль.";
      } else if (error.detail) {
        message = error.detail;
      }
    } catch {
      // Keep the friendly default when the server returns a non-JSON error.
    }

    throw new Error(message);
  }

  return response.json() as Promise<LoginResponse>;
}

export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  } catch {
    throw new Error(connectionError);
  }

  if (!response.ok) {
    let message = "Не вдалося створити обліковий запис. Перевірте введені дані.";

    try {
      const error = (await response.json()) as { detail?: string };
      if (error.detail === "Email already registered") {
        message = "Цей email вже зареєстрований.";
      } else if (error.detail === "Username already taken") {
        message = "Це ім'я користувача вже зайняте.";
      } else if (error.detail) {
        message = error.detail;
      }
    } catch {
      // Keep the friendly default when the server returns a non-JSON error.
    }

    throw new Error(message);
  }

  return response.json() as Promise<RegisterResponse>;
}

export async function loginWithGoogle(payload: GoogleLoginPayload): Promise<LoginResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}/auth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  } catch {
    throw new Error(connectionError);
  }

  if (!response.ok) {
    let message = "Не вдалося увійти через Google.";

    try {
      const error = (await response.json()) as { detail?: string };
      if (error.detail === "Google client ID is not configured") {
        message = "Google Client ID ще не налаштований на сервері.";
      } else if (error.detail === "Invalid Google token") {
        message = "Google не підтвердив цей токен. Спробуйте увійти ще раз.";
      } else if (error.detail === "Google email is not verified") {
        message = "Google email не підтверджений.";
      } else if (error.detail) {
        message = error.detail;
      }
    } catch {
      // Keep the friendly default when the server returns a non-JSON error.
    }

    throw new Error(message);
  }

  return response.json() as Promise<LoginResponse>;
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error("No access token");
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  } catch {
    throw new Error(connectionError);
  }

  if (!response.ok) {
    throw new Error("Не вдалося завантажити профіль.");
  }

  return response.json() as Promise<CurrentUser>;
}
