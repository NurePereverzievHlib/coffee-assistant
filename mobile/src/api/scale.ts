export type ScaleStatus = {
  connected: boolean;
  batteryLevel: number | null;
  signalStrength: "strong" | "weak" | "offline";
  updatedAt: string | null;
};

const SCALE_API_URL = process.env.EXPO_PUBLIC_SCALE_API_URL;
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
  if (!SCALE_API_URL) {
    return {
      connected: false,
      batteryLevel: null,
      signalStrength: "offline",
      updatedAt: null
    };
  }

  const timeout = timeoutSignal(SCALE_STATUS_TIMEOUT_MS);

  try {
    const response = await fetch(`${SCALE_API_URL}/status`, {
      method: "GET",
      signal: timeout.signal
    });

    if (!response.ok) {
      throw new Error("Scale status request failed");
    }

    const responseText = await response.text();
    let data: {
      batteryLevel?: number;
      battery?: number;
      signalStrength?: "strong" | "weak";
    } = {};

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      data = {};
    }

    return {
      connected: true,
      batteryLevel: data.batteryLevel ?? data.battery ?? null,
      signalStrength: data.signalStrength ?? "strong",
      updatedAt: new Date().toISOString()
    };
  } catch {
    return {
      connected: false,
      batteryLevel: null,
      signalStrength: "offline",
      updatedAt: null
    };
  } finally {
    timeout.clear();
  }
}
