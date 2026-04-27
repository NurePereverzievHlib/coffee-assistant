import { useEffect, useMemo, useState } from "react";
import { PanResponder, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { CurrentUser, getCurrentUser } from "../api/auth";
import { BloomLogo } from "../components/BloomLogo";
import { ProfileBadge } from "../components/ProfileBadge";
import { SwipeNavigation } from "../components/SwipeNavigation";

type BrewJournalScreenProps = {
  onBackHome: () => void;
  onOpenRecipes: () => void;
};

export function BrewJournalScreen({ onBackHome, onOpenRecipes }: BrewJournalScreenProps) {
  const [profile, setProfile] = useState<CurrentUser | null>(null);
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

  useEffect(() => {
    getCurrentUser().then(setProfile).catch(() => setProfile(null));
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} {...panResponder.panHandlers}>
      <View style={styles.header}>
        <BloomLogo height={64} width={160} />
        <ProfileBadge profile={profile} />
      </View>

      <SwipeNavigation
        active="journal"
        onPressHome={onBackHome}
        onPressRecipes={onOpenRecipes}
      />

      <View style={styles.content}>
        <Text style={styles.title}>Журнал заварювання</Text>
        <Text style={styles.subtitle}>Тут будуть останні сесії заварювання.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#ffffff",
    flex: 1
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    height: 100,
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingTop: 18
  },
  content: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28
  },
  title: {
    color: "#000000",
    fontFamily: "serif",
    fontSize: 30,
    fontWeight: "700",
    textAlign: "center"
  },
  subtitle: {
    color: "#555555",
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    textAlign: "center"
  }
});
