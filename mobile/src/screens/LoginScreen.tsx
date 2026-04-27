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
  onAuthenticated: () => void;
  onRegisterPress: () => void;
};

export function LoginScreen({ onAuthenticated, onRegisterPress }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isGoogleReady, signInWithGoogle } = useGoogleAuth();

  const canSubmit = email.trim().length > 0 && password.length >= 6 && !isSubmitting;

  async function handleLogin() {
    if (!canSubmit) return;

    setIsSubmitting(true);

    try {
      const result = await login({
        email: email.trim(),
        password
      });

      await saveAccessToken(result.access_token);
      onAuthenticated();
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
        onAuthenticated();
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

        <View pointerEvents="none" style={styles.blobsWrap}>
  <LinearGradient
    colors={["#A1AFFF", "#C4BEBE", "#F57559"]}
    locations={[0, 0.52, 1]}
    start={{ x: 0.2, y: 0 }}
    end={{ x: 0.85, y: 1 }}
    style={styles.gradientCircle}
  />

  <LinearGradient
    colors={["#E5CF82", "#8C8C8C", "#FF813D"]}
    locations={[0, 0.5, 1]}
    start={{ x: 0.3, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.gradientCircleBottom}
  />
</View>

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
            disabled={!isGoogleReady}
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
    paddingHorizontal: 16,
    paddingBottom: 48
  },

  logoWrap: {
    alignItems: "center",
    height: 210,
    justifyContent: "center",
    width: "100%",
    zIndex: 3
  },

  blobsWrap: {
  bottom: 0,
  height: 760,
  left: 0,
  position: "absolute",
  right: 0,
  top: 220,
  zIndex: 1
},

  gradientCircle: {
  borderRadius: 260,
  height: 520,
  width: 520,
  position: "absolute",
  top: -50,
  left: -140,
  transform: [{ rotate: "-10deg" }],
  zIndex: 2
},

  card: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.72)",
    borderRadius: 10,
    borderWidth: 1,
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

  gradientCircleBottom: {
  borderRadius: 280,
  height: 560,
  width: 560,
  position: "absolute",
  right: -180,
  bottom: -120,
  transform: [{ rotate: "18deg" }]
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

