import { Manrope_500Medium, Manrope_700Bold, useFonts } from "@expo-google-fonts/manrope";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { BrewJournalScreen } from "./src/screens/BrewJournalScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { MyRecipesScreen } from "./src/screens/MyRecipesScreen";
import { RegisterScreen } from "./src/screens/RegisterScreen";
import { clearAccessToken } from "./src/storage/authToken";

type AuthScreen = "login" | "register";
type AppScreen = "auth" | "home" | "my-recipes" | "journal";

export default function App() {
  const [appScreen, setAppScreen] = useState<AppScreen>("auth");
  const [authScreen, setAuthScreen] = useState<AuthScreen>("login");
  const [fontsLoaded] = useFonts({
    Manrope_500Medium,
    Manrope_700Bold
  });

  async function handleLogout() {
    await clearAccessToken();
    setAppScreen("auth");
    setAuthScreen("login");
  }

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
      {appScreen === "home" ? (
        <HomeScreen
          onLogout={handleLogout}
          onOpenJournal={() => setAppScreen("journal")}
          onOpenMyRecipes={() => setAppScreen("my-recipes")}
        />
      ) : appScreen === "my-recipes" ? (
        <MyRecipesScreen
          onBackHome={() => setAppScreen("home")}
          onOpenJournal={() => setAppScreen("journal")}
        />
      ) : appScreen === "journal" ? (
        <BrewJournalScreen
          onBackHome={() => setAppScreen("home")}
          onOpenRecipes={() => setAppScreen("my-recipes")}
        />
      ) : authScreen === "login" ? (
        <LoginScreen
          onAuthenticated={() => setAppScreen("home")}
          onRegisterPress={() => setAuthScreen("register")}
        />
      ) : (
        <RegisterScreen
          onAuthenticated={() => setAppScreen("home")}
          onLoginPress={() => setAuthScreen("login")}
        />
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
