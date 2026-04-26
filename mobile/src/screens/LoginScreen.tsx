import { FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { login } from "../api/auth";
import { BloomLogo } from "../components/BloomLogo";
import { FieldIcon } from "../components/FieldIcon";
import { useGoogleAuth } from "../hooks/useGoogleAuth";
import { saveAccessToken } from "../storage/authToken";

type LoginScreenProps = {
  onRegisterPress: () => void;
};

export function LoginScreen({ onRegisterPress }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isGoogleReady, signInWithGoogle } = useGoogleAuth();

  const canSubmit = email.trim().length > 0 && password.length >= 6 && !isSubmitting;

  async function handleLogin() {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login({
        email: email.trim(),
        password
      });

      await saveAccessToken(result.access_token);
      Alert.alert("Вхід виконано", "Токен збережено. Далі можна відкривати головний екран.");
    } catch (error) {
      Alert.alert("Помилка входу", error instanceof Error ? error.message : "Спробуйте ще раз.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    try {
      const signedIn = await signInWithGoogle();
      if (signedIn) {
        Alert.alert("Вхід виконано", "Google акаунт підключено, токен збережено.");
      }
    } catch (error) {
      Alert.alert(
        "Помилка Google входу",
        error instanceof Error ? error.message : "Спробуйте ще раз."
      );
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.screen}
      >
        <View style={styles.logoWrap}>
          <BloomLogo />
        </View>

        <View pointerEvents="none" style={styles.blueBlob} />
        <View pointerEvents="none" style={styles.coralBlob} />
        <View pointerEvents="none" style={styles.oliveBlob} />

        <View style={styles.card}>
          <Text style={styles.title}>Вітаємо знову!</Text>
          <Text style={styles.subtitle}>Увійдіть до свого облікового запису</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputShell}>
              <FieldIcon name="mail" />
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="your@example.com"
                placeholderTextColor="#626262"
                style={styles.input}
                textContentType="emailAddress"
                value={email}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Пароль</Text>
            <View style={styles.inputShell}>
              <FieldIcon name="lock" />
              <TextInput
                autoCapitalize="none"
                onChangeText={setPassword}
                placeholder="*******"
                placeholderTextColor="#626262"
                secureTextEntry={!passwordVisible}
                style={styles.input}
                textContentType="password"
                value={password}
              />
              <Pressable
                accessibilityLabel={passwordVisible ? "Сховати пароль" : "Показати пароль"}
                hitSlop={12}
                onPress={() => setPasswordVisible((current) => !current)}
                style={styles.eyeButton}
              >
                <FieldIcon name={passwordVisible ? "eye-off" : "eye"} />
              </Pressable>
            </View>
          </View>

          <Pressable accessibilityRole="button" style={styles.forgotButton}>
            <Text style={styles.forgotText}>Забули пароль?</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={!canSubmit}
            onPress={handleLogin}
            style={({ pressed }) => [
              styles.loginButton,
              (!canSubmit || pressed) && styles.loginButtonMuted
            ]}
          >
            <LinearGradient
              colors={["#ffa58e", "#e07a5f"]}
              end={{ x: 1, y: 0.5 }}
              start={{ x: 0, y: 0.5 }}
              style={styles.loginGradient}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.loginText}>Увійти</Text>
              )}
            </LinearGradient>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>або</Text>
            <View style={styles.divider} />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Увійти через Google"
            onPress={handleGoogleLogin}
            style={({ pressed }) => [
              styles.googleButton,
              (!isGoogleReady || pressed) && styles.googleButtonPressed
            ]}
          >
            <View style={styles.googleIcon}>
              <FontAwesome color="#db4437" name="google" size={21} />
            </View>
            <Text style={styles.googleText}>Увійти через Google</Text>
          </Pressable>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Немає облікового запису? </Text>
            <Pressable accessibilityRole="button" onPress={onRegisterPress}>
              <Text style={styles.registerLink}>Зареєструватись</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#ffffff",
    flex: 1
  },
  screen: {
    alignItems: "center",
    flex: 1,
    overflow: "hidden",
    paddingHorizontal: 16
  },
  logoWrap: {
    alignItems: "center",
    height: 175,
    justifyContent: "flex-end",
    width: "100%",
    zIndex: 2
  },
  blueBlob: {
    backgroundColor: "#818bd3",
    borderRadius: 292,
    height: 585,
    left: -246,
    opacity: 0.72,
    position: "absolute",
    top: 205,
    transform: [{ rotate: "75deg" }],
    width: 585
  },
  coralBlob: {
    backgroundColor: "#f4775a",
    borderRadius: 226,
    bottom: -32,
    height: 453,
    left: -168,
    opacity: 0.73,
    position: "absolute",
    transform: [{ rotate: "-7deg" }],
    width: 453
  },
  oliveBlob: {
    backgroundColor: "#949063",
    borderRadius: 240,
    bottom: -120,
    height: 480,
    opacity: 0.72,
    position: "absolute",
    right: -244,
    transform: [{ rotate: "-22deg" }],
    width: 480
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderColor: "rgba(255,255,255,0.72)",
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 80,
    minHeight: 578,
    paddingHorizontal: 25,
    paddingTop: 21,
    width: 337,
    zIndex: 3
  },
  title: {
    color: "#333333",
    fontFamily: "Manrope_500Medium",
    fontSize: 33,
    lineHeight: 45,
    textAlign: "center"
  },
  subtitle: {
    color: "#646464",
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 22,
    marginTop: 9,
    textAlign: "center"
  },
  fieldGroup: {
    gap: 9,
    marginTop: 23
  },
  label: {
    color: "#2f2f2f",
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 22
  },
  inputShell: {
    alignItems: "center",
    borderColor: "#2f2f2f",
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    height: 48,
    paddingHorizontal: 18
  },
  input: {
    color: "#2f2f2f",
    flex: 1,
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    height: 46,
    padding: 0
  },
  eyeButton: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    marginRight: -4,
    width: 32
  },
  forgotButton: {
    alignItems: "flex-end",
    marginTop: 8
  },
  forgotText: {
    color: "#ffffff",
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 22,
    textDecorationLine: "underline"
  },
  loginButton: {
    borderRadius: 15,
    height: 55,
    marginTop: 25,
    overflow: "hidden",
    width: "100%"
  },
  loginButtonMuted: {
    opacity: 0.75
  },
  loginGradient: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  },
  loginText: {
    color: "#ffffff",
    fontFamily: "Manrope_700Bold",
    fontSize: 23,
    lineHeight: 31
  },
  dividerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 22,
    marginHorizontal: 12,
    marginTop: 22
  },
  divider: {
    backgroundColor: "#626262",
    flex: 1,
    height: 1
  },
  dividerText: {
    color: "#626262",
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    lineHeight: 22
  },
  googleButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: "rgba(47,47,47,0.18)",
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    height: 50,
    justifyContent: "center",
    marginTop: 16,
    shadowColor: "#2f2f2f",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10
  },
  googleButtonPressed: {
    opacity: 0.82
  },
  googleIcon: {
    alignItems: "center",
    height: 24,
    justifyContent: "center",
    width: 24
  },
  googleText: {
    color: "#2f2f2f",
    fontFamily: "Manrope_700Bold",
    fontSize: 16,
    lineHeight: 22
  },
  registerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20
  },
  registerText: {
    color: "#000000",
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 19
  },
  registerLink: {
    color: "#ffffff",
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 19,
    textDecorationLine: "underline"
  }
});
