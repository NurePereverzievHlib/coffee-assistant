import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { getRecipes, Recipe } from "../api/recipes";
import { getScaleStatus, ScaleStatus } from "../api/scale";
import { BloomLogo } from "../components/BloomLogo";
import { CoffeeFallback } from "../components/CoffeeFallback";

const scaleImage = require("../../assets/scale.png");

type HomeScreenProps = {
  onLogout: () => void;
};

export function HomeScreen({ onLogout }: HomeScreenProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [failedImages, setFailedImages] = useState<Record<number, true>>({});
  const [scaleStatus, setScaleStatus] = useState<ScaleStatus>({
    connected: false,
    batteryLevel: null,
    signalStrength: "offline",
    updatedAt: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const batteryText = useMemo(() => {
    if (!scaleStatus.connected) {
      return "немає даних";
    }

    return scaleStatus.batteryLevel === null ? "невідомо" : `${scaleStatus.batteryLevel}%`;
  }, [scaleStatus.batteryLevel, scaleStatus.connected]);

  async function loadHome(mode: "initial" | "refresh" = "initial") {
    if (mode === "refresh") {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const [recipeData, statusData] = await Promise.all([getRecipes(), getScaleStatus()]);
      setRecipes(recipeData);
      setScaleStatus(statusData);
      setErrorMessage(null);
    } catch (error) {
      const statusData = await getScaleStatus();
      setScaleStatus(statusData);
      setErrorMessage(error instanceof Error ? error.message : "Не вдалося завантажити рецепти.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadHome();
    const intervalId = setInterval(() => {
      getScaleStatus().then(setScaleStatus);
    }, 15000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            colors={["#fc7240"]}
            refreshing={isRefreshing}
            tintColor="#fc7240"
            onRefresh={() => loadHome("refresh")}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <BloomLogo height={64} width={160} />
          <Pressable accessibilityRole="button" onPress={onLogout} style={styles.avatarButton}>
            <MaterialIcons color="#1d1d1d" name="person" size={27} />
          </Pressable>
        </View>

        <LinearGradient
          colors={["#f5af19", "#ffc29c", "#f12711"]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.devicePanel}
        >
          <Text style={styles.deviceTitle}>Ваш пристрій</Text>
          <Image resizeMode="contain" source={scaleImage} style={styles.scaleImage} />

          <View style={styles.deviceStatusStack}>
            <StatusPill
              icon="bluetooth"
              iconColor="#4d6fff"
              title={scaleStatus.connected ? "Wi‑Fi підключено" : "Ваги не відповідають"}
              subtitle={scaleStatus.connected ? "Стабільний сигнал" : "Очікуємо відповідь від ваг"}
            />
            <StatusPill
              icon="wifi"
              iconColor="#62d27a"
              title="Wi‑Fi синхронізація"
              subtitle={scaleStatus.connected ? "Автоматичне збереження даних" : "Недоступна без з'єднання"}
            />
            <StatusPill
              icon="battery-5-bar"
              iconColor="#dca240"
              title={`Рівень заряду: ${batteryText}`}
              subtitle={scaleStatus.connected ? "Залишилось приблизно: 72 год" : "Перевірте живлення пристрою"}
            />
          </View>
        </LinearGradient>

        <View style={styles.navStrip}>
          <MaterialIcons color="#bfbfbf" name="edit" size={23} />
          <View style={styles.navDash} />
          <MaterialIcons color="#fc7240" name="home" size={24} />
          <View style={styles.navDash} />
          <MaterialIcons color="#bfbfbf" name="book" size={23} />
        </View>

        <Text style={styles.sectionTitle}>Останні рецепти</Text>

        {isLoading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color="#fc7240" />
            <Text style={styles.stateText}>Завантажуємо рецепти...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.stateBox}>
            <MaterialIcons color="#fc7240" name="cloud-off" size={34} />
            <Text style={styles.stateText}>{errorMessage}</Text>
            <Pressable accessibilityRole="button" onPress={() => loadHome()} style={styles.retryButton}>
              <Text style={styles.retryText}>Спробувати ще раз</Text>
            </Pressable>
          </View>
        ) : recipes.length === 0 ? (
          <View style={styles.stateBox}>
            <CoffeeFallback size={82} variant="line" />
            <Text style={styles.stateText}>У базі поки немає рецептів.</Text>
          </View>
        ) : (
          <View style={styles.recipeGrid}>
            {recipes.map((recipe, index) => (
              <RecipeCard
                imageFailed={Boolean(failedImages[recipe.id])}
                index={index}
                key={recipe.id}
                onImageError={() => setFailedImages((current) => ({ ...current, [recipe.id]: true }))}
                recipe={recipe}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type StatusPillProps = {
  icon: keyof typeof MaterialIcons.glyphMap;
  iconColor: string;
  title: string;
  subtitle: string;
};

function StatusPill({ icon, iconColor, title, subtitle }: StatusPillProps) {
  return (
    <View style={styles.statusPill}>
      <View style={[styles.statusIconWrap, { backgroundColor: `${iconColor}2b` }]}>
        <MaterialIcons color={iconColor} name={icon} size={24} />
      </View>
      <View style={styles.statusTextBlock}>
        <Text numberOfLines={1} style={styles.statusTitle}>
          {title}
        </Text>
        <Text numberOfLines={1} style={styles.statusSubtitle}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

type RecipeCardProps = {
  imageFailed: boolean;
  index: number;
  onImageError: () => void;
  recipe: Recipe;
};

function RecipeCard({ imageFailed, index, onImageError, recipe }: RecipeCardProps) {
  const hasImage = Boolean(recipe.image && !imageFailed);
  const isFirstCard = index === 0;
  const method = index % 2 === 0 ? "Hario V-60" : "Aeropress";

  return (
    <View style={styles.recipeCard}>
      <View style={styles.exclamationBox}>
        <Text style={styles.exclamationText}>!</Text>
      </View>

      <View style={styles.recipeImageArea}>
        {hasImage ? (
          <Image
            onError={onImageError}
            resizeMode="cover"
            source={{ uri: recipe.image as string }}
            style={styles.recipeImage}
          />
        ) : (
          <CoffeeFallback size={index % 2 === 0 ? 132 : 124} variant={index % 2 === 0 ? "line" : "star"} />
        )}
      </View>

      <View style={styles.recipeNameBlock}>
        {isFirstCard ? (
          <View style={styles.countryRow}>
            <Text style={styles.countryText}>KENYA</Text>
            <View style={styles.beanTag}>
              <Text numberOfLines={1} style={styles.beanTagText}>
                Mad heads
              </Text>
            </View>
          </View>
        ) : null}
        <Text numberOfLines={2} style={[styles.recipeTitle, !isFirstCard && styles.recipeTitleTall]}>
          {recipe.name}
        </Text>
      </View>

      <View style={styles.methodBlock}>
        <Text style={styles.methodLabel}>Метод заварювання:</Text>
        <View style={styles.methodRow}>
          <MaterialIcons color="#111111" name={method === "Aeropress" ? "coffee-maker" : "local-cafe"} size={24} />
          <Text style={styles.methodText}>{method}</Text>
        </View>
      </View>

      <View style={styles.metricsBox}>
        <Metric label="Час" value={recipe.total_time || "3:10 с"} />
        <Metric label="Температура" value={`${Math.round(recipe.water_temp)}°C`} />
        <Metric label="Порція" value={`${Math.round(recipe.coffee_grams)} гр`} />
      </View>

      <Pressable accessibilityRole="button" style={styles.brewButton}>
        <Text style={styles.brewText}>Варити</Text>
      </Pressable>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#ffffff",
    flex: 1
  },
  scrollContent: {
    paddingBottom: 28
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    height: 82,
    justifyContent: "space-between",
    paddingHorizontal: 8
  },
  avatarButton: {
    alignItems: "center",
    backgroundColor: "#f1f1f1",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    marginRight: 8,
    width: 48
  },
  devicePanel: {
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    height: 252,
    overflow: "hidden",
    position: "relative"
  },
  deviceTitle: {
    color: "#000000",
    fontFamily: "serif",
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 39,
    marginTop: 5,
    textAlign: "center"
  },
  scaleImage: {
    height: 216,
    left: -74,
    position: "absolute",
    top: 41,
    transform: [{ rotate: "15deg" }],
    width: 216
  },
  deviceStatusStack: {
    gap: 6,
    left: 164,
    position: "absolute",
    top: 61,
    width: 226
  },
  statusPill: {
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    flexDirection: "row",
    gap: 10,
    height: 45,
    paddingLeft: 10,
    paddingRight: 8
  },
  statusIconWrap: {
    alignItems: "center",
    borderRadius: 16,
    height: 31,
    justifyContent: "center",
    width: 31
  },
  statusTextBlock: {
    flex: 1
  },
  statusTitle: {
    color: "#000000",
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    lineHeight: 16
  },
  statusSubtitle: {
    color: "#6a6a6a",
    fontFamily: "Manrope_500Medium",
    fontSize: 9,
    lineHeight: 12,
    marginTop: 2
  },
  navStrip: {
    alignItems: "center",
    flexDirection: "row",
    gap: 15,
    height: 60,
    justifyContent: "center"
  },
  navDash: {
    backgroundColor: "#7c7c7c",
    borderRadius: 2,
    height: 4,
    width: 17
  },
  sectionTitle: {
    color: "#000000",
    fontFamily: "serif",
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 32,
    marginBottom: 10,
    textAlign: "center"
  },
  stateBox: {
    alignItems: "center",
    gap: 12,
    padding: 24
  },
  stateText: {
    color: "#333333",
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center"
  },
  retryButton: {
    alignItems: "center",
    backgroundColor: "#fc7240",
    borderRadius: 5,
    height: 36,
    justifyContent: "center",
    paddingHorizontal: 16
  },
  retryText: {
    color: "#ffffff",
    fontFamily: "Manrope_700Bold",
    fontSize: 14
  },
  recipeGrid: {
    borderTopColor: "#000000",
    borderTopWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 0
  },
  recipeCard: {
    backgroundColor: "#ffffff",
    borderBottomColor: "#000000",
    borderBottomWidth: 1,
    borderRightColor: "#000000",
    borderRightWidth: 1,
    height: 394,
    paddingHorizontal: 5,
    position: "relative",
    width: "50%"
  },
  exclamationBox: {
    alignItems: "center",
    backgroundColor: "#d9d9d9",
    borderColor: "#000000",
    borderRadius: 5,
    borderWidth: 1,
    height: 26,
    justifyContent: "center",
    left: 13,
    position: "absolute",
    top: 7,
    width: 23,
    zIndex: 4
  },
  exclamationText: {
    color: "#000000",
    fontFamily: "Manrope_700Bold",
    fontSize: 16,
    lineHeight: 19
  },
  recipeImageArea: {
    alignItems: "center",
    height: 174,
    justifyContent: "center",
    overflow: "hidden",
    paddingTop: 12
  },
  recipeImage: {
    borderRadius: 5,
    height: 154,
    width: 154
  },
  recipeNameBlock: {
    height: 58
  },
  countryRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 24
  },
  countryText: {
    color: "#000000",
    fontFamily: "serif",
    fontSize: 18,
    lineHeight: 22
  },
  beanTag: {
    borderColor: "#d76136",
    borderRadius: 5,
    borderWidth: 0.5,
    maxWidth: 86,
    paddingHorizontal: 4,
    paddingVertical: 1
  },
  beanTagText: {
    color: "#000000",
    fontFamily: "Manrope_500Medium",
    fontSize: 13,
    lineHeight: 16
  },
  recipeTitle: {
    color: "#000000",
    fontFamily: "serif",
    fontSize: 27,
    fontWeight: "700",
    lineHeight: 31
  },
  recipeTitleTall: {
    fontWeight: "500",
    marginTop: 2
  },
  methodBlock: {
    borderTopColor: "#000000",
    borderTopWidth: 1,
    height: 65,
    marginHorizontal: -5,
    paddingHorizontal: 5,
    paddingTop: 7
  },
  methodLabel: {
    color: "#000000",
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16
  },
  methodRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 5
  },
  methodText: {
    color: "#000000",
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16
  },
  metricsBox: {
    backgroundColor: "#efefef",
    borderColor: "#dcdcdc",
    borderRadius: 5,
    borderWidth: 1,
    flexDirection: "row",
    height: 41,
    justifyContent: "space-between",
    marginTop: 8,
    paddingHorizontal: 9,
    paddingTop: 5
  },
  metric: {
    alignItems: "center",
    minWidth: 35
  },
  metricLabel: {
    color: "#656565",
    fontFamily: "Manrope_500Medium",
    fontSize: 10,
    lineHeight: 13
  },
  metricValue: {
    color: "#656565",
    fontFamily: "Manrope_700Bold",
    fontSize: 10,
    lineHeight: 13,
    marginTop: 4
  },
  brewButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#fc7240",
    borderRadius: 5,
    height: 31,
    justifyContent: "center",
    marginTop: 12,
    width: 149
  },
  brewText: {
    color: "#ffffff",
    fontFamily: "Manrope_700Bold",
    fontSize: 16,
    lineHeight: 20
  }
});
