import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  PanResponder,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { CurrentUser, getCurrentUser } from "../api/auth";
import { getReviewSessions, ReviewSession, updateReviewSession } from "../api/sessions";
import { BloomLogo } from "../components/BloomLogo";
import { ProfileBadge } from "../components/ProfileBadge";
import { SwipeNavigation } from "../components/SwipeNavigation";

type BrewJournalScreenProps = {
  onBackHome: () => void;
  onOpenRecipes: () => void;
};

type JournalTab = "history" | "saved";

export function BrewJournalScreen({ onBackHome, onOpenRecipes }: BrewJournalScreenProps) {
  const [profile, setProfile] = useState<CurrentUser | null>(null);
  const [sessions, setSessions] = useState<ReviewSession[]>([]);
  const [activeTab, setActiveTab] = useState<JournalTab>("history");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingSession, setEditingSession] = useState<ReviewSession | null>(null);
  const [draftRating, setDraftRating] = useState<number | null>(null);
  const [draftReviewText, setDraftReviewText] = useState("");
  const [draftFavorite, setDraftFavorite] = useState(false);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 30 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > 70) {
            onBackHome();
          }
        }
      }),
    [onBackHome]
  );

  async function loadJournal(mode: "initial" | "refresh" = "initial", tab: JournalTab = activeTab) {
    if (mode === "refresh") {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const [profileData, sessionData] = await Promise.all([
        getCurrentUser(),
        getReviewSessions(tab === "saved")
      ]);
      setProfile(profileData);
      setSessions(sessionData);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Не вдалося завантажити журнал.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadJournal();
  }, []);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  async function handleTabChange(tab: JournalTab) {
    setActiveTab(tab);
    await loadJournal("initial", tab);
  }

  function openReviewEditor(session: ReviewSession) {
    setEditingSession(session);
    setDraftRating(session.rating ?? null);
    setDraftReviewText(session.review_text ?? session.brew_description ?? "");
    setDraftFavorite(session.is_favorite);
  }

  function closeReviewEditor() {
    if (isSavingReview) {
      return;
    }

    setEditingSession(null);
  }

  async function saveReview() {
    if (!editingSession) {
      return;
    }

    setIsSavingReview(true);
    try {
      const updated = await updateReviewSession(editingSession.id, {
        brew_description: draftReviewText.trim() || null,
        rating: draftRating ?? undefined,
        review_text: draftReviewText.trim() || null,
        is_favorite: draftFavorite
      });
      setSessions((current) => {
        const next = current.map((session) => (session.id === editingSession.id ? updated : session));
        return activeTab === "saved" ? next.filter((session) => session.is_favorite) : next;
      });
      setEditingSession(null);
    } catch (error) {
      await loadJournal("refresh");
      setErrorMessage(error instanceof Error ? error.message : "Не вдалося оновити оцінку.");
    } finally {
      setIsSavingReview(false);
    }
  }

  const filteredSessions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return sessions;
    }

    return sessions.filter((session) =>
      [
        session.recipe_name,
        session.brew_method,
        session.brew_description ?? "",
        session.review_text ?? ""
      ].some((value) => value.toLowerCase().includes(query))
    );
  }, [searchQuery, sessions]);

  return (
    <SafeAreaView style={styles.safeArea} {...panResponder.panHandlers}>
      <View style={styles.header}>
        <BloomLogo height={64} width={160} />
        <ProfileBadge profile={profile} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            colors={["#fc7240"]}
            refreshing={isRefreshing}
            tintColor="#fc7240"
            onRefresh={() => loadJournal("refresh")}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <SwipeNavigation
          active="journal"
          onPressHome={onBackHome}
          onPressRecipes={onOpenRecipes}
        />

        <Text style={styles.title}>Журнал</Text>

        <View style={styles.segmentedControl}>
          <SegmentButton active={activeTab === "history"} label="Історія" onPress={() => handleTabChange("history")} />
          <SegmentButton active={activeTab === "saved"} label="Збережені" onPress={() => handleTabChange("saved")} />
        </View>

        {isLoading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color="#fc7240" />
            <Text style={styles.stateText}>Завантажуємо завершені заварювання...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.stateBox}>
            <MaterialIcons color="#fc7240" name="cloud-off" size={34} />
            <Text style={styles.stateText}>{errorMessage}</Text>
            <Pressable accessibilityRole="button" onPress={() => loadJournal()} style={styles.retryButton}>
              <Text style={styles.retryText}>Спробувати ще раз</Text>
            </Pressable>
          </View>
        ) : filteredSessions.length === 0 ? (
          <View style={styles.stateBox}>
            <MaterialIcons color="#bdbdbd" name="history" size={42} />
            <Text style={styles.stateText}>
              {searchQuery.trim()
                ? "За цим запитом заварювань не знайдено."
                : activeTab === "saved"
                  ? "Збережених заварювань ще немає."
                  : "Завершених заварювань ще немає."}
            </Text>
          </View>
        ) : (
          <View style={styles.cardList}>
            {filteredSessions.map((session) => (
              <ReviewSessionCard
                key={session.id}
                session={session}
                onPress={() => openReviewEditor(session)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.searchBar, keyboardHeight > 0 && { bottom: keyboardHeight + 10 }]}>
        <TextInput
          onChangeText={setSearchQuery}
          placeholder="Пошук у журналі"
          placeholderTextColor="#4e4e4e"
          style={styles.searchInput}
          value={searchQuery}
        />
        <MaterialIcons color="#111111" name="search" size={42} />
      </View>

      <ReviewEditorModal
        favorite={draftFavorite}
        isSaving={isSavingReview}
        rating={draftRating}
        reviewText={draftReviewText}
        session={editingSession}
        onClose={closeReviewEditor}
        onFavoriteChange={setDraftFavorite}
        onRatingChange={setDraftRating}
        onReviewTextChange={setDraftReviewText}
        onSave={saveReview}
      />
    </SafeAreaView>
  );
}

function SegmentButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.segmentButton, active && styles.segmentButtonActive]}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ReviewSessionCard({
  session,
  onPress
}: {
  session: ReviewSession;
  onPress: () => void;
}) {
  const rating = session.rating ?? 0;
  const dateText = formatSessionDate(session.end_time ?? session.start_time);
  const outputGrams = session.latest_weight ?? session.max_weight ?? session.coffee_grams;
  const brewedTime = session.brewed_time ?? session.recipe_total_time;

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.reviewCard}>
      <View style={styles.cardHeader}>
        <Text numberOfLines={1} style={styles.recipeTitle}>
          {session.recipe_name}
        </Text>
        <View style={styles.dateBlock}>
          <MaterialIcons color="#fc7240" name="calendar-today" size={28} />
          <Text style={styles.dateText}>{dateText}</Text>
        </View>
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.metricsBox}>
          <Metric label="Час" value={brewedTime} />
          <Metric label="Температура" value={`${Math.round(session.water_temp)}°C`} />
          <Metric label="Вихід" value={`${Math.round(outputGrams)} гр`} />
        </View>

        <View style={styles.methodBlock}>
          <BrewMethodGlyph method={session.brew_method} />
          <Text numberOfLines={2} style={styles.methodText}>
            {session.brew_method}
          </Text>
        </View>
      </View>

      <View style={styles.ratingRow}>
        <View style={styles.ratingBlock}>
          <Text style={styles.ratingLabel}>Загальна оцінка:</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((value) => (
              <MaterialIcons
                color="#fc7240"
                key={value}
                name={value <= rating ? "star" : "star-border"}
                size={36}
                style={styles.starIcon}
              />
            ))}
          </View>
        </View>

        <View style={styles.favoriteButton}>
          <MaterialIcons
            color="#fc7240"
            name={session.is_favorite ? "favorite" : "favorite-border"}
            size={48}
          />
        </View>
      </View>
    </Pressable>
  );
}

function ReviewEditorModal({
  favorite,
  isSaving,
  rating,
  reviewText,
  session,
  onClose,
  onFavoriteChange,
  onRatingChange,
  onReviewTextChange,
  onSave
}: {
  favorite: boolean;
  isSaving: boolean;
  rating: number | null;
  reviewText: string;
  session: ReviewSession | null;
  onClose: () => void;
  onFavoriteChange: (favorite: boolean) => void;
  onRatingChange: (rating: number) => void;
  onReviewTextChange: (text: string) => void;
  onSave: () => void;
}) {
  return (
    <Modal animationType="fade" transparent visible={Boolean(session)} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text numberOfLines={2} style={styles.modalTitle}>
              {session?.recipe_name ?? "Заварювання"}
            </Text>
            <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8}>
              <MaterialIcons color="#111111" name="close" size={28} />
            </Pressable>
          </View>

          <Text style={styles.modalLabel}>Оцінка</Text>
          <View style={styles.modalStarsRow}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable accessibilityRole="button" key={value} onPress={() => onRatingChange(value)} hitSlop={8}>
                <MaterialIcons
                  color="#fc7240"
                  name={rating !== null && value <= rating ? "star" : "star-border"}
                  size={42}
                  style={styles.starIcon}
                />
              </Pressable>
            ))}
          </View>

          <Text style={styles.modalLabel}>Враження</Text>
          <TextInput
            multiline
            onChangeText={onReviewTextChange}
            placeholder="Що вийшло добре, що змінити наступного разу?"
            placeholderTextColor="#8a8a8a"
            style={styles.reviewInput}
            textAlignVertical="top"
            value={reviewText}
          />

          <Pressable accessibilityRole="checkbox" onPress={() => onFavoriteChange(!favorite)} style={styles.favoriteToggle}>
            <MaterialIcons color="#fc7240" name={favorite ? "favorite" : "favorite-border"} size={32} />
            <Text style={styles.favoriteToggleText}>Зберегти в обраних</Text>
          </Pressable>

          <Pressable accessibilityRole="button" disabled={isSaving} onPress={onSave} style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}>
            <Text style={styles.saveButtonText}>{isSaving ? "Зберігаємо..." : "Зберегти"}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
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

function BrewMethodGlyph({ method }: { method: string }) {
  const normalized = method.toLowerCase();
  const icon = normalized.includes("press") ? "coffee-maker" : normalized.includes("v60") || normalized.includes("pour") ? "filter-alt" : "local-cafe";

  return <MaterialIcons color="#111111" name={icon} size={30} />;
}

function formatSessionDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}.${month} ${hours}:${minutes}`;
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#ffffff",
    flex: 1
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    height: 82,
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingTop: 18
  },
  scrollContent: {
    alignItems: "center",
    paddingBottom: 96,
    paddingHorizontal: 10
  },
  title: {
    color: "#000000",
    fontFamily: "serif",
    fontSize: 37,
    fontWeight: "700",
    lineHeight: 45,
    marginBottom: 10,
    textAlign: "center"
  },
  segmentedControl: {
    borderColor: "#000000",
    borderRadius: 5,
    borderWidth: 1,
    flexDirection: "row",
    height: 34,
    marginBottom: 10,
    overflow: "hidden",
    width: 264
  },
  segmentButton: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  },
  segmentButtonActive: {
    backgroundColor: "#fc7240"
  },
  segmentText: {
    color: "#161616",
    fontFamily: "Manrope_700Bold",
    fontSize: 15
  },
  segmentTextActive: {
    color: "#ffffff"
  },
  cardList: {
    gap: 11,
    width: "100%"
  },
  reviewCard: {
    alignSelf: "center",
    backgroundColor: "#ffffff",
    borderColor: "#000000",
    borderWidth: 1,
    gap: 14,
    padding: 12,
    width: "100%"
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  recipeTitle: {
    color: "#000000",
    flex: 1,
    fontFamily: "serif",
    fontSize: 27,
    fontWeight: "700",
    lineHeight: 31
  },
  dateBlock: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7
  },
  dateText: {
    color: "#000000",
    fontFamily: "Manrope_700Bold",
    fontSize: 12
  },
  detailsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 18,
    justifyContent: "space-between"
  },
  metricsBox: {
    alignItems: "center",
    backgroundColor: "#efefef",
    borderColor: "#dcdcdc",
    borderRadius: 5,
    borderWidth: 1,
    flexDirection: "row",
    gap: 16,
    height: 62,
    justifyContent: "center",
    paddingHorizontal: 9
  },
  metric: {
    alignItems: "center",
    gap: 4
  },
  metricLabel: {
    color: "#656565",
    fontFamily: "Manrope_500Medium",
    fontSize: 15
  },
  metricValue: {
    color: "#656565",
    fontFamily: "Manrope_700Bold",
    fontSize: 15
  },
  methodBlock: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    width: 96
  },
  methodText: {
    color: "#000000",
    flex: 1,
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
    lineHeight: 16
  },
  ratingRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  ratingBlock: {
    gap: 4
  },
  ratingLabel: {
    color: "#000000",
    fontFamily: "Manrope_700Bold",
    fontSize: 15
  },
  starsRow: {
    flexDirection: "row",
    marginLeft: -2
  },
  starIcon: {
    marginRight: -4
  },
  favoriteButton: {
    alignItems: "center",
    height: 52,
    justifyContent: "center",
    width: 58
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
  searchBar: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: "#000000",
    borderWidth: 1,
    bottom: 14,
    flexDirection: "row",
    height: 70,
    justifyContent: "space-between",
    paddingHorizontal: 17,
    position: "absolute",
    width: "92%"
  },
  searchInput: {
    color: "#4e4e4e",
    flex: 1,
    fontFamily: "Manrope_500Medium",
    fontSize: 28,
    height: "100%",
    paddingRight: 10
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.34)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 18
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderColor: "#000000",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 16,
    width: "100%"
  },
  modalHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  modalTitle: {
    color: "#000000",
    flex: 1,
    fontFamily: "serif",
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 32
  },
  modalLabel: {
    color: "#000000",
    fontFamily: "Manrope_700Bold",
    fontSize: 15
  },
  modalStarsRow: {
    flexDirection: "row",
    marginLeft: -2
  },
  reviewInput: {
    borderColor: "#dcdcdc",
    borderRadius: 6,
    borderWidth: 1,
    color: "#111111",
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    minHeight: 104,
    paddingHorizontal: 10,
    paddingVertical: 9
  },
  favoriteToggle: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 40
  },
  favoriteToggleText: {
    color: "#111111",
    fontFamily: "Manrope_700Bold",
    fontSize: 15
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: "#fc7240",
    borderRadius: 5,
    height: 42,
    justifyContent: "center"
  },
  saveButtonDisabled: {
    opacity: 0.65
  },
  saveButtonText: {
    color: "#ffffff",
    fontFamily: "Manrope_700Bold",
    fontSize: 16
  }
});
