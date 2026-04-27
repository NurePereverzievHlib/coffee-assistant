import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { CurrentUser, getCurrentUser } from "../api/auth";
import { createCoffeeBean } from "../api/coffeeBeans";
import { createRecipe, getRecipe, getRecipes, Recipe, RecipeCreatePayload, RecipeStepPayload, updateRecipe } from "../api/recipes";
import { BloomLogo } from "../components/BloomLogo";
import { CoffeeFallback } from "../components/CoffeeFallback";
import { ProfileBadge } from "../components/ProfileBadge";
import { SwipeNavigation } from "../components/SwipeNavigation";

type MyRecipesScreenProps = {
  onBackHome: () => void;
  onOpenJournal: () => void;
};

type RecipeStepForm = {
  step_type: string;
  start_time: string;
  water_volume: string;
};

function remoteImageSource(uri: string) {
  return {
    uri,
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "User-Agent": "Mozilla/5.0"
    }
  };
}

const brewMethods = [
  "Hario V-60",
  "Aeropress",
  "Chemex",
  "French Press",
  "Kalita Wave",
  "Origami",
  "Clever Dripper",
  "Moka Pot",
  "Espresso",
  "Cold Brew",
  "Turkish Coffee"
];

const stepTypes = ["Блюмінг", "Чекати", "Лити", "Фініш"];

export function MyRecipesScreen({ onBackHome, onOpenJournal }: MyRecipesScreenProps) {
  const [mode, setMode] = useState<"list" | "form">("list");
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [profile, setProfile] = useState<CurrentUser | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [openingRecipeId, setOpeningRecipeId] = useState<number | null>(null);
  const [failedRecipeImages, setFailedRecipeImages] = useState<Record<number, true>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const ownRecipes = useMemo(
    () => recipes.filter((recipe) => profile?.id && recipe.created_by === profile.id),
    [profile?.id, recipes]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 30 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx < -70) {
            onBackHome();
          }
        }
      }),
    [onBackHome]
  );

  async function loadMyRecipes() {
    setIsLoading(true);

    try {
      const [profileData, recipeData] = await Promise.all([getCurrentUser(), getRecipes()]);
      setProfile(profileData);
      setRecipes(recipeData);
      setFailedRecipeImages({});
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не вдалося завантажити рецепти.");
    } finally {
      setIsLoading(false);
    }
  }

  function openCreateForm() {
    setEditingRecipe(null);
    setMode("form");
  }

  async function openEditForm(recipe: Recipe) {
    setOpeningRecipeId(recipe.id);

    try {
      const fullRecipe = await getRecipe(recipe.id);
      setEditingRecipe(fullRecipe);
      setMode("form");
    } catch (error) {
      Alert.alert("Не вдалося відкрити рецепт", error instanceof Error ? error.message : "Спробуй ще раз.");
    } finally {
      setOpeningRecipeId(null);
    }
  }

  async function closeFormAndReload() {
    setEditingRecipe(null);
    setMode("list");
    await loadMyRecipes();
  }

  useEffect(() => {
    loadMyRecipes();
  }, []);

  if (mode === "form") {
    return (
      <RecipeFormScreen
        key={editingRecipe?.id ?? "new"}
        initialRecipe={editingRecipe}
        onBack={() => {
          setEditingRecipe(null);
          setMode("list");
        }}
        profile={profile}
        onSaved={closeFormAndReload}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} {...panResponder.panHandlers}>
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BloomLogo height={64} width={160} />
          <ProfileBadge profile={profile} />
        </View>

        <Pressable accessibilityRole="button" onPress={onBackHome} style={styles.backRow}>
          <MaterialIcons color="#fc7240" name="chevron-left" size={34} />
          <Text style={styles.backText}>Мої рецепти</Text>
        </Pressable>

        <SwipeNavigation
          active="recipes"
          onPressHome={onBackHome}
          onPressJournal={onOpenJournal}
        />

        <View style={styles.titleRow}>
          <Text style={styles.pageTitle}>Мої рецепти</Text>
          <Pressable accessibilityRole="button" onPress={openCreateForm} style={styles.addButton}>
            <MaterialIcons color="#ffffff" name="add" size={22} />
            <Text style={styles.addButtonText}>Новий</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color="#fc7240" />
            <Text style={styles.stateText}>Завантажуємо твої рецепти...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.stateBox}>
            <MaterialIcons color="#fc7240" name="cloud-off" size={34} />
            <Text style={styles.stateText}>{errorMessage}</Text>
          </View>
        ) : ownRecipes.length === 0 ? (
          <View style={styles.emptyPanel}>
            <CoffeeFallback size={116} variant="star" />
            <Text style={styles.emptyTitle}>Тут поки порожньо</Text>
            <Text style={styles.emptyText}>Створи перший власний рецепт і він з'явиться на цій сторінці.</Text>
            <Pressable accessibilityRole="button" onPress={openCreateForm} style={styles.emptyButton}>
              <Text style={styles.emptyButtonText}>Створити рецепт</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.myRecipeList}>
            {ownRecipes.map((recipe) => (
              <View
                key={recipe.id}
                style={[styles.myRecipeCard, openingRecipeId === recipe.id && styles.myRecipeCardLoading]}
              >
                <View style={styles.myRecipeImageWrap}>
                  {recipe.coffee_image && !failedRecipeImages[recipe.id] ? (
                    <Image
                      onError={() => setFailedRecipeImages((current) => ({ ...current, [recipe.id]: true }))}
                      resizeMode="cover"
                      source={remoteImageSource(recipe.coffee_image)}
                      style={styles.myRecipeImage}
                    />
                  ) : (
                    <CoffeeFallback size={88} variant="line" />
                  )}
                </View>
                <View style={styles.myRecipeBody}>
                  <View style={styles.recipeCardHeader}>
                    <Text numberOfLines={2} style={styles.myRecipeTitle}>
                      {recipe.name}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      disabled={openingRecipeId === recipe.id}
                      hitSlop={10}
                      onPress={() => openEditForm(recipe)}
                      style={styles.editRecipeButton}
                    >
                      <MaterialIcons color="#fc7240" name="edit" size={20} />
                    </Pressable>
                  </View>
                  <Text numberOfLines={1} style={styles.myRecipeMeta}>
                    {recipe.brew_method} · {Math.round(recipe.coffee_grams)} гр · {Math.round(recipe.water_temp)}°C
                  </Text>
                  <View style={styles.stepBadge}>
                    {openingRecipeId === recipe.id ? (
                      <ActivityIndicator color="#fc7240" size="small" />
                    ) : (
                      <MaterialIcons color="#fc7240" name="playlist-add-check" size={17} />
                    )}
                    <Text style={styles.stepBadgeText}>
                      {openingRecipeId === recipe.id ? "Відкриваємо..." : `${recipe.steps.length} кроків`}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function RecipeFormScreen({
  initialRecipe,
  onBack,
  profile,
  onSaved
}: {
  initialRecipe?: Recipe | null;
  onBack: () => void;
  profile?: CurrentUser | null;
  onSaved: () => void | Promise<void>;
}) {
  const isEditing = Boolean(initialRecipe);
  const [name, setName] = useState(initialRecipe?.name ?? "");
  const [description, setDescription] = useState(initialRecipe?.description ?? "");
  const [coffeeGrams, setCoffeeGrams] = useState(initialRecipe ? String(initialRecipe.coffee_grams) : "");
  const [waterTemp, setWaterTemp] = useState(initialRecipe ? String(initialRecipe.water_temp) : "");
  const [beanName, setBeanName] = useState(initialRecipe?.coffee_name ?? "");
  const [beanPhoto, setBeanPhoto] = useState(initialRecipe?.coffee_image ?? "");
  const [brewMethod, setBrewMethod] = useState(initialRecipe?.brew_method ?? brewMethods[0]);
  const [steps, setSteps] = useState<RecipeStepForm[]>(
    initialRecipe?.steps.length
      ? initialRecipe.steps.map((step) => ({
          step_type: step.step_type || "Лити",
          start_time: String(step.start_time),
          water_volume: String(step.water_volume)
        }))
      : [{ step_type: "Блюмінг", start_time: "0", water_volume: "50" }]
  );
  const [openStepTypeIndex, setOpenStepTypeIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 30 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > 70) {
            onBack();
          }
        }
      }),
    [onBack]
  );

  function addStep() {
    setSteps((current) => [...current, { step_type: "Лити", start_time: "", water_volume: "" }]);
  }

  function updateStep(index: number, key: keyof RecipeStepForm, value: string) {
    setSteps((current) => current.map((step, stepIndex) => (stepIndex === index ? { ...step, [key]: value } : step)));
  }

  async function submitRecipe() {
    const parsedCoffeeGrams = Number(coffeeGrams.replace(",", "."));
    const parsedWaterTemp = Number(waterTemp.replace(",", "."));
    const parsedSteps: RecipeStepPayload[] = steps.map((step, index) => ({
      step_number: index + 1,
      step_type: step.step_type,
      start_time: Number(step.start_time.replace(",", ".")),
      water_volume: Number(step.water_volume.replace(",", "."))
    }));

    if (!name.trim() || !Number.isFinite(parsedCoffeeGrams) || !Number.isFinite(parsedWaterTemp)) {
      Alert.alert("Перевір рецепт", "Назва, закладка і температура обов'язкові.");
      return;
    }

    if (parsedSteps.some((step) => !Number.isFinite(step.start_time) || !Number.isFinite(step.water_volume))) {
      Alert.alert("Перевір кроки", "У кожному кроці має бути час і об'єм води.");
      return;
    }

    setIsSaving(true);

    try {
      const shouldCreateBean =
        Boolean(beanName.trim() || beanPhoto.trim()) &&
        (!isEditing ||
          beanName.trim() !== (initialRecipe?.coffee_name ?? "") ||
          beanPhoto.trim() !== (initialRecipe?.coffee_image ?? ""));
      const bean = shouldCreateBean
        ? await createCoffeeBean({
            name: beanName.trim() || `${name.trim()} зерно`,
            processing_type: "custom",
            price: 1,
            descriptors: [],
            image: beanPhoto.trim() || null,
            weight_in_grams: Math.max(1, Math.round(parsedCoffeeGrams)),
            stock: 1
          })
        : null;
      const totalSeconds = parsedSteps.reduce((max, step) => Math.max(max, step.start_time), 0);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = String(totalSeconds % 60).padStart(2, "0");
      const payload: RecipeCreatePayload = {
        name: name.trim(),
        description: description.trim() || null,
        brew_method: brewMethod,
        coffee_bean_id: bean?.id ?? initialRecipe?.coffee_bean_id ?? null,
        coffee_grams: parsedCoffeeGrams,
        water_temp: parsedWaterTemp,
        grind_level: initialRecipe?.grind_level ?? 3,
        total_time: `${minutes}:${seconds}`,
        steps: parsedSteps
      };

      if (initialRecipe) {
        await updateRecipe(initialRecipe.id, payload);
      } else {
        await createRecipe(payload);
      }

      await onSaved();
    } catch (error) {
      Alert.alert(isEditing ? "Не вдалося оновити рецепт" : "Не вдалося створити рецепт", error instanceof Error ? error.message : "Спробуй ще раз.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} {...panResponder.panHandlers}>
      <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BloomLogo height={64} width={160} />
          <ProfileBadge profile={profile} />
        </View>

        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backRow}>
          <MaterialIcons color="#fc7240" name="chevron-left" size={34} />
          <Text style={styles.backText}>{isEditing ? "Назад до рецептів" : "Записати рецепт"}</Text>
        </Pressable>

        <Text style={styles.formTitle}>{isEditing ? "Редагувати рецепт" : "Новий рецепт"}</Text>

        <TextInput
          placeholder="Назва рецепту"
          placeholderTextColor="#636363"
          style={styles.fullInput}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          multiline
          placeholder="Опис рецепту"
          placeholderTextColor="#636363"
          style={styles.descriptionInput}
          textAlignVertical="top"
          value={description}
          onChangeText={setDescription}
        />

        <ScrollView
          contentContainerStyle={styles.methodPicker}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {brewMethods.map((method) => (
            <Pressable
              accessibilityRole="button"
              key={method}
              onPress={() => setBrewMethod(method)}
              style={[styles.methodChip, brewMethod === method && styles.methodChipActive]}
            >
              <Text style={[styles.methodChipText, brewMethod === method && styles.methodChipTextActive]}>
                {method}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            keyboardType="numeric"
            placeholder="Закладка (гр)"
            placeholderTextColor="#777777"
            style={styles.halfInput}
            value={coffeeGrams}
            onChangeText={setCoffeeGrams}
          />
          <TextInput
            keyboardType="numeric"
            placeholder="Температура(C°)"
            placeholderTextColor="#777777"
            style={styles.halfInput}
            value={waterTemp}
            onChangeText={setWaterTemp}
          />
        </View>

        <View style={styles.inputRow}>
          <TextInput
            placeholder="Назва зерна"
            placeholderTextColor="#636363"
            style={styles.beanInput}
            value={beanName}
            onChangeText={setBeanName}
          />
          <TextInput
            placeholder="URL фото"
            placeholderTextColor="#636363"
            style={styles.photoInput}
            value={beanPhoto}
            onChangeText={setBeanPhoto}
          />
        </View>

        <Text style={styles.stepsTitle}>Кроки</Text>

        {steps.map((step, index) => (
          <View key={index} style={styles.stepBlock}>
            <View style={styles.stepActionWrap}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setOpenStepTypeIndex((current) => (current === index ? null : index))}
                style={styles.stepAction}
              >
                <Text style={styles.stepActionText}>{step.step_type || "Оберіть дію"}</Text>
                <MaterialIcons color="#111111" name="keyboard-arrow-down" size={22} />
              </Pressable>
              {openStepTypeIndex === index ? (
                <View style={styles.stepTypeMenu}>
                  {stepTypes.map((type) => (
                    <Pressable
                      accessibilityRole="button"
                      key={type}
                      onPress={() => {
                        updateStep(index, "step_type", type);
                        setOpenStepTypeIndex(null);
                      }}
                      style={styles.stepTypeOption}
                    >
                      <Text style={styles.stepTypeOptionText}>{type}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
            <View style={styles.inputRow}>
              <TextInput
                keyboardType="numeric"
                placeholder="Час"
                placeholderTextColor="#111111"
                style={styles.halfInput}
                value={step.start_time}
                onChangeText={(value) => updateStep(index, "start_time", value)}
              />
              <TextInput
                keyboardType="numeric"
                placeholder="Об'єм води"
                placeholderTextColor="#111111"
                style={styles.halfInput}
                value={step.water_volume}
                onChangeText={(value) => updateStep(index, "water_volume", value)}
              />
            </View>
          </View>
        ))}

        <View style={styles.addStepRow}>
          <View style={styles.stepLine} />
          <Pressable accessibilityRole="button" onPress={addStep} style={styles.addStepButton}>
            <Text style={styles.addStepText}>+ крок</Text>
          </Pressable>
          <View style={styles.stepLine} />
        </View>
      </ScrollView>

      <View style={styles.bottomAction}>
        <LinearGradient colors={["#f97f5f", "#e16645"]} style={styles.saveButton}>
          <Pressable accessibilityRole="button" disabled={isSaving} onPress={submitRecipe} style={styles.saveButtonPressable}>
            <Text style={styles.saveButtonText}>
              {isSaving ? "Зберігаємо..." : isEditing ? "Зберегти рецепт" : "Записати рецепт"}
            </Text>
          </Pressable>
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#ffffff",
    flex: 1
  },
  listContent: {
    paddingBottom: 30
  },
  formContent: {
    paddingBottom: 112
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    height: 100,
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingTop: 18
  },
  backRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
    marginLeft: 8,
    marginTop: 8
  },
  backText: {
    color: "#5a5a5a",
    fontFamily: "Manrope_700Bold",
    fontSize: 10
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 22,
    paddingHorizontal: 20
  },
  pageTitle: {
    color: "#000000",
    fontFamily: "serif",
    fontSize: 27,
    fontWeight: "700"
  },
  addButton: {
    alignItems: "center",
    backgroundColor: "#fc7240",
    borderRadius: 10,
    flexDirection: "row",
    gap: 4,
    height: 38,
    justifyContent: "center",
    paddingHorizontal: 12
  },
  addButtonText: {
    color: "#ffffff",
    fontFamily: "Manrope_700Bold",
    fontSize: 14
  },
  stateBox: {
    alignItems: "center",
    gap: 12,
    padding: 28
  },
  stateText: {
    color: "#333333",
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    textAlign: "center"
  },
  emptyPanel: {
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 84
  },
  emptyTitle: {
    color: "#000000",
    fontFamily: "serif",
    fontSize: 28,
    fontWeight: "700",
    marginTop: 10
  },
  emptyText: {
    color: "#555555",
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: "center"
  },
  emptyButton: {
    backgroundColor: "#fc7240",
    borderRadius: 10,
    marginTop: 18,
    paddingHorizontal: 22,
    paddingVertical: 10
  },
  emptyButtonText: {
    color: "#ffffff",
    fontFamily: "Manrope_700Bold",
    fontSize: 15
  },
  myRecipeList: {
    gap: 12,
    marginTop: 18,
    paddingHorizontal: 16
  },
  myRecipeCard: {
    alignItems: "stretch",
    borderColor: "#111111",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    height: 112,
    overflow: "hidden"
  },
  myRecipeCardLoading: {
    opacity: 0.65
  },
  myRecipeImageWrap: {
    alignItems: "center",
    backgroundColor: "#f7f7f7",
    justifyContent: "center",
    height: 112,
    width: 112
  },
  myRecipeImage: {
    height: 112,
    width: 112
  },
  myRecipeBody: {
    flex: 1,
    justifyContent: "center",
    padding: 12
  },
  recipeCardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  editRecipeButton: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32
  },
  myRecipeTitle: {
    color: "#000000",
    flex: 1,
    fontFamily: "serif",
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 28
  },
  myRecipeMeta: {
    color: "#555555",
    fontFamily: "Manrope_500Medium",
    fontSize: 12,
    marginTop: 7
  },
  stepBadge: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    marginTop: 10
  },
  stepBadgeText: {
    color: "#fc7240",
    fontFamily: "Manrope_700Bold",
    fontSize: 12
  },
  formTitle: {
    color: "#000000",
    fontFamily: "serif",
    fontSize: 27,
    fontWeight: "700",
    marginTop: 24,
    textAlign: "center"
  },
  fullInput: {
    borderColor: "#111111",
    borderRadius: 10,
    borderWidth: 1,
    color: "#111111",
    fontFamily: "Manrope_500Medium",
    fontSize: 20,
    height: 51,
    marginHorizontal: 20,
    marginTop: 24,
    paddingHorizontal: 12
  },
  descriptionInput: {
    borderColor: "#111111",
    borderWidth: 1,
    color: "#111111",
    fontFamily: "Manrope_500Medium",
    fontSize: 20,
    height: 111,
    marginHorizontal: 20,
    marginTop: 24,
    paddingHorizontal: 12,
    paddingTop: 14
  },
  methodPicker: {
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 18
  },
  methodChip: {
    borderColor: "#111111",
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  methodChipActive: {
    backgroundColor: "#fc7240",
    borderColor: "#fc7240"
  },
  methodChipText: {
    color: "#111111",
    fontFamily: "Manrope_700Bold",
    fontSize: 12
  },
  methodChipTextActive: {
    color: "#ffffff"
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 20,
    marginTop: 24
  },
  halfInput: {
    borderColor: "#111111",
    borderRadius: 10,
    borderWidth: 1,
    color: "#111111",
    flex: 1,
    fontFamily: "Manrope_500Medium",
    fontSize: 17,
    height: 51,
    paddingHorizontal: 12
  },
  beanInput: {
    borderColor: "#111111",
    borderRadius: 10,
    borderWidth: 1,
    color: "#111111",
    flex: 1,
    fontFamily: "Manrope_500Medium",
    fontSize: 20,
    height: 51,
    paddingHorizontal: 12
  },
  photoInput: {
    borderColor: "#111111",
    borderRadius: 10,
    borderWidth: 1,
    color: "#111111",
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    height: 51,
    paddingHorizontal: 10,
    width: 118
  },
  stepsTitle: {
    color: "#000000",
    fontFamily: "Manrope_700Bold",
    fontSize: 27,
    marginHorizontal: 20,
    marginTop: 28
  },
  stepBlock: {
    marginTop: 12
  },
  stepActionWrap: {
    alignSelf: "flex-start",
    marginLeft: 20,
    zIndex: 10
  },
  stepAction: {
    alignItems: "center",
    borderColor: "#111111",
    borderRadius: 5,
    borderWidth: 1,
    flexDirection: "row",
    height: 34,
    paddingLeft: 4,
    paddingRight: 2
  },
  stepActionText: {
    color: "#111111",
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    minWidth: 92,
    paddingLeft: 2
  },
  stepTypeMenu: {
    backgroundColor: "#ffffff",
    borderColor: "#111111",
    borderRadius: 6,
    borderWidth: 1,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    top: 38,
    width: 126,
    zIndex: 20
  },
  stepTypeOption: {
    borderBottomColor: "#e6e6e6",
    borderBottomWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 7
  },
  stepTypeOptionText: {
    color: "#111111",
    fontFamily: "Manrope_500Medium",
    fontSize: 14
  },
  addStepRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 10
  },
  stepLine: {
    backgroundColor: "#111111",
    flex: 1,
    height: 1
  },
  addStepButton: {
    alignItems: "center",
    backgroundColor: "#d9d9d9",
    borderRadius: 15,
    height: 28,
    justifyContent: "center",
    width: 100
  },
  addStepText: {
    color: "#000000",
    fontFamily: "Manrope_500Medium",
    fontSize: 15
  },
  bottomAction: {
    backgroundColor: "rgba(255,255,255,0.95)",
    bottom: 0,
    height: 90,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0
  },
  saveButton: {
    alignSelf: "center",
    borderRadius: 15,
    height: 55,
    overflow: "hidden",
    width: 287
  },
  saveButtonPressable: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  },
  saveButtonText: {
    color: "#ffffff",
    fontFamily: "Manrope_700Bold",
    fontSize: 23
  }
});
