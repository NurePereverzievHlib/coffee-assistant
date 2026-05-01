import { API_URL } from "./auth";
import { getAccessToken } from "../storage/authToken";

export type ScaleStatus = {
  connected: boolean;
  batteryLevel: number | null;
  signalStrength: "strong" | "weak" | "offline";
  updatedAt: string | null;
  scaleId: number | null;
  scaleName: string | null;
  latestWeight: number | null;
  latestPourRate: number | null;
};

const SCALE_STATUS_TIMEOUT_MS = 2500;

function timeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId)
  };
}

export async function getScaleStatus(): Promise<ScaleStatus> {
  const token = await getAccessToken();

  if (!token) {
    return {
      connected: false,
      batteryLevel: null,
      signalStrength: "offline",
      updatedAt: null,
      scaleId: null,
      scaleName: null,
      latestWeight: null,
      latestPourRate: null
    };
  }

  const timeout = timeoutSignal(SCALE_STATUS_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}/scales/status`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      },
      signal: timeout.signal
    });

    if (!response.ok) {
      throw new Error("Scale status request failed");
    }

    const data = (await response.json()) as {
      connected?: boolean;
      signal_strength?: "strong" | "weak" | "offline";
      scale_id?: number | null;
      scale_name?: string | null;
      latest_weight?: number | null;
      latest_pour_rate?: number | null;
      updated_at?: string | null;
    };

    return {
      connected: Boolean(data.connected),
      batteryLevel: null,
      signalStrength: data.signal_strength ?? (data.connected ? "strong" : "offline"),
      updatedAt: data.updated_at ?? null,
      scaleId: data.scale_id ?? null,
      scaleName: data.scale_name ?? null,
      latestWeight: data.latest_weight ?? null,
      latestPourRate: data.latest_pour_rate ?? null
    };
  } catch {
    return {
      connected: false,
      batteryLevel: null,
      signalStrength: "offline",
      updatedAt: null,
      scaleId: null,
      scaleName: null,
      latestWeight: null,
      latestPourRate: null
    };
  } finally {
    timeout.clear();
  }
}
