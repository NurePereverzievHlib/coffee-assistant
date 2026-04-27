import Constants from "expo-constants";
import { loginWithGoogle } from "../api/auth";
import { saveAccessToken } from "../storage/authToken";

const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

let nativeGoogleConfigured = false;

async function signInWithNativeGoogle() {
  const googleSignin = await import("@react-native-google-signin/google-signin");
  const { GoogleSignin, statusCodes } = googleSignin;

  GoogleSignin.configure({
    webClientId: googleClientId,
    scopes: ["email", "profile"]
  });
  nativeGoogleConfigured = true;

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    await GoogleSignin.signOut();
    const response = await GoogleSignin.signIn();

    if (response.type === "cancelled") {
      return false;
    }

    const idToken = response.data.idToken;
    if (!idToken) {
      throw new Error("Google не повернув ID token для входу.");
    }

    const authResult = await loginWithGoogle({ id_token: idToken });
    await saveAccessToken(authResult.access_token);
    return true;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === statusCodes.SIGN_IN_CANCELLED
    ) {
      return false;
    }

    throw error;
  }
}

export function useGoogleAuth() {
  async function signInWithGoogle() {
    if (!googleClientId) {
      throw new Error("Google Client ID ще не заданий у Expo env.");
    }

    if (Constants.appOwnership === "expo") {
      throw new Error(
        "Google Sign-In потребує development build. У звичайному Expo Go native Google module недоступний."
      );
    }

    try {
      return await signInWithNativeGoogle();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (
        message.includes("RNGoogleSignin") ||
        message.includes("GoogleSignin") ||
        message.includes("NativeModule") ||
        message.includes("native module")
      ) {
        throw new Error(
          "Google Sign-In потребує development build. У звичайному Expo Go native Google module недоступний."
        );
      }

      throw error;
    }
  }

  return {
    isGoogleReady: Boolean(googleClientId && !nativeGoogleConfigured ? true : googleClientId),
    signInWithGoogle
  };
}
