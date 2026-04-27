import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  PanResponder,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { CurrentUser, getCurrentUser } from "../api/auth";
import { getRecipes, Recipe } from "../api/recipes";
import { getScaleStatus, ScaleStatus } from "../api/scale";
import { BloomLogo } from "../components/BloomLogo";
import { CoffeeFallback } from "../components/CoffeeFallback";
import { ProfileBadge } from "../components/ProfileBadge";
import { SwipeNavigation } from "../components/SwipeNavigation";

const scaleImage = require("../../assets/scale.png");

type HomeScreenProps = {
  onLogout: () => void;
  onOpenJournal: () => void;
  onOpenMyRecipes: () => void;
};

export function HomeScreen({ onLogout, onOpenJournal, onOpenMyRecipes }: HomeScreenProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [profile, setProfile] = useState<CurrentUser | null>(null);
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

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 30 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > 70) {
            onOpenMyRecipes();
          } else if (gesture.dx < -70) {
            onOpenJournal();
          }
        }
      }),
    [onOpenJournal, onOpenMyRecipes]
  );

  async function loadHome(mode: "initial" | "refresh" = "initial") {
    if (mode === "refresh") {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const [recipeData, statusData, profileData] = await Promise.all([
        getRecipes(),
        getScaleStatus(),
        getCurrentUser()
      ]);
      setRecipes(recipeData);
      setScaleStatus(statusData);
      setProfile(profileData);
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
    <SafeAreaView style={styles.safeArea} {...panResponder.panHandlers}>
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
          <ProfileBadge onPress={onLogout} profile={profile} />
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

        <SwipeNavigation
          active="home"
          onPressJournal={onOpenJournal}
          onPressRecipes={onOpenMyRecipes}
        />

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

function remoteImageSource(uri: string) {
  return {
    uri,
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "User-Agent": "Mozilla/5.0"
    }
  };
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
  const hasImage = Boolean(recipe.coffee_image && !imageFailed);
  const method = recipe.brew_method || "";

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
            source={remoteImageSource(recipe.coffee_image as string)}
            style={styles.recipeImage}
          />
        ) : (
          <CoffeeFallback size={index % 2 === 0 ? 132 : 124} variant={index % 2 === 0 ? "line" : "star"} />
        )}
      </View>

      <View style={styles.recipeNameBlock}>
        <Text numberOfLines={2} style={[styles.recipeTitle, styles.recipeTitleTall]}>
          {recipe.name}
        </Text>
      </View>

      <View style={styles.methodBlock}>
        <Text style={styles.methodLabel}>Метод заварювання:</Text>
        <View style={styles.methodRow}>
          <BrewMethodIcon method={method} />
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

function BrewMethodIcon({ method }: { method: string }) {
  const normalized = method.toLowerCase();

  if (normalized.includes("aeropress") || normalized.includes("aero press")) {
    return (
      <Svg height={28} viewBox="0 0 19 32" width={18}>
        <Path
          d="M12.64 0C13.82-.01 14.42-.01 14.99.48c.08.08.07.15.07.26 0 .2-.04.33-.19.48-.17.13-.35.2-.54.27-.68.22-1.41.28-2.12.33-2 .13-3.99.19-6 .17.1.27.11.54.12.84.04.74.09 1.48.09 2.22 0 .61 0 .61-.06.73 1.98.04 3.96.1 5.93.01-.02-.03-.04-.07-.06-.1-.01-.09-.01-.18-.01-.28 0-1.17.01-2.34.05-3.51.03-.7.03-.7.23-.91.13.01.13.01.25.05.11.16.12.2.12.39-.01 1.5-.08 3-.13 4.5.36-.01.72.03 1.06.16.08.11.13.16.16.29.09 1.66.1 3.32.14 4.98.06 2.52.07 5.04.1 7.56.03 2.35.09 4.7.1 7.05 0 .3-.01.53-.17.8-.14.05-.14.05-.26.05-.16-.25-.16-.49-.16-.78-.06-3.53-.11-7.05-.19-10.58-.05-2.02-.05-4.04-.04-6.06h-.61c-.23.13-.48.14-.74.17-.75.07-1.5.07-2.25.06-2.92 0-2.92 0-3.57-.32.01 2.37-.01 4.74-.05 7.12-.05 2.48-.08 4.96-.1 7.44-.01.78-.01 1.56-.09 2.34.14.03.28.05.42.07.98.16 2 .12 2.99.12 1.32.01 2.63-.02 3.94-.23.27-.04.53-.04.8-.03.02.08.03.17.05.25-.44.46-1.37.43-1.97.5-.83.11-1.66.1-2.49.1-2.15 0-2.15 0-3.01-.15-.71-.12-.71-.12-.92-.34.02-.13.02-.13.05-.25-.12-.03-.12-.03-.25-.05-.05.03-.1.07-.15.1-.07.02-.15.03-.22.04-.42.08-.83.23-1.14.52.35.24.69.35 1.1.44 2.81.59 5.88.41 8.72.13.62-.06 1.22-.18 1.82-.35.25-.07.46-.16.68-.3v-.15c-.37-.2-.73-.35-1.15-.38-.15-.01-.19-.02-.31-.12-.04-.11-.04-.11-.03-.22.04-.09.04-.09.14-.19.58-.06 1.29.13 1.76.47.15.13.23.24.27.44.01.22-.06.34-.21.51-1.13 1.19-4.03 1.06-5.57 1.1-1.48.04-2.96.04-4.44-.1-.56-.05-1.12-.13-1.67-.24-.63-.13-1.23-.3-1.62-.84-.08-.16-.07-.33-.05-.51.23-.44.82-.61 1.26-.77.18-.05.34-.05.52-.05h.29v-.19c-.01-3.21.01-6.42.08-9.63.04-1.9.06-3.8.11-5.7.01-.36.02-.72.04-1.07.03-.13.07-.18.18-.26.13-.02.25-.03.38-.04.22-.01.22-.01.32-.01-.02-.17-.04-.35-.06-.52-.05-.87-.09-1.74-.09-2.61 0-.33 0-.66 0-.98 0-.21.02-.34.17-.49-1.51-.03-2.02-.05-2.53-.51-.08-.16-.07-.28-.05-.46.28-.36.74-.47 1.17-.53.72-.1 1.45-.15 2.18-.19 1.35-.09 2.7-.18 4.05-.26 1.16-.08 2.31-.13 3.48-.14Z"
          fill="#111111"
        />
      </Svg>
    );
  }

  if (
    normalized.includes("v60") ||
    normalized.includes("v-60") ||
    normalized.includes("hario") ||
    normalized.includes("pour")
  ) {
    return (
      <Svg height={24} viewBox="0 0 25 21" width={28}>
        <Path
          d="M10 20.49c-1.58-.05-3.87-.22-5.05-.37-1.72-.22-3.29-.58-3.73-.85-.18-.11-.14-.17.24-.32.87-.33 2.19-.59 4.2-.82 1.15-.14 1.21-.14 1.39.02.17.16.45.26.94.35 1.1.19 2.4.29 3.38.25.41-.02.59-.01.61.02.04.06.59.06.63 0 .02-.03.22-.04.7-.02.58.03.69.02.81-.04.11-.05.2-.07.45-.05.5.04 2.03-.15 2.46-.31.12-.05.28-.14.37-.22l.16-.14.72.08c.91.1 2.09.26 2.81.4 1.22.22 2.3.58 2.21.73-.05.08-.44.25-.86.37-2.13.62-6.05.97-10.46.95-.9 0-1.8-.01-2.01-.02Zm2.62-2.41c-.02-.01-.52-.03-1.13-.04-1.65-.03-3.62-.24-3.87-.42-.06-.05-.17-.19-.24-.33-.07-.13-.78-1.71-1.56-3.49C2.49 6.25 1.8 4.7.5 1.77.23 1.16 0 .6 0 .53 0 .37.17.19.42.09.6.02 1.15.02 11.96 0c7.54-.01 11.46.01 11.67.03.51.07.8.26.79.54 0 .06-.07.26-.15.45-.09.18-.42.94-.75 1.68-2.85 6.42-4.46 10.06-5.58 12.6-.14.32-.32.73-.4.9-.08.18-.16.33-.19.33-.02 0-.08.04-.12.08-.04.05-.1.08-.13.08-.03 0-.12.08-.19.19-.07.1-.16.18-.18.19-.02 0-.09.06-.16.13-.07.07-.14.13-.17.13-.02 0-.09.05-.14.1-.15.16-.49.31-.69.31-.1 0-.19.02-.2.04-.01.03-.09.04-.17.04-.08 0-.15.02-.17.04-.01.03-.14.04-.28.04-.17 0-.28.02-.31.06-.04.05-.17.06-.55.06-.28 0-.52.02-.55.05-.04.04-.69.06-.74.02ZM16.82 2.02c1.92-.13 3.3-.26 4.22-.42.63-.11.85-.25.85-.57 0-.12-.03-.17-.11-.24-.13-.1-.13-.1-.78.03-1.67.35-5.06.57-8.74.57-4.19 0-7.65-.25-9.37-.67-.05-.01-.13.02-.21.09-.27.23-.12.58.29.71.65.2 3.43.47 5.82.56 1.45.06 6.84.02 8.04-.06Z"
          fill="#111111"
        />
      </Svg>
    );
  }

  return <MaterialIcons color="#111111" name="local-cafe" size={24} />;
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
    height: 108,
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingTop: 18
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
