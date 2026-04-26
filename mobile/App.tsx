import { Manrope_500Medium, Manrope_700Bold, useFonts } from "@expo-google-fonts/manrope";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { LoginScreen } from "./src/screens/LoginScreen";
import { RegisterScreen } from "./src/screens/RegisterScreen";

type AuthScreen = "login" | "register";

export default function App() {
  const [authScreen, setAuthScreen] = useState<AuthScreen>("login");
  const [fontsLoaded] = useFonts({
    Manrope_500Medium,
    Manrope_700Bold
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#e07a5f" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      {authScreen === "login" ? (
        <LoginScreen onRegisterPress={() => setAuthScreen("register")} />
      ) : (
        <RegisterScreen onLoginPress={() => setAuthScreen("login")} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    flex: 1,
    justifyContent: "center"
  }
});
