import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";

type SwipeNavigationProps = {
  active: "recipes" | "home" | "journal";
  onPressHome?: () => void;
  onPressJournal?: () => void;
  onPressRecipes?: () => void;
};

export function SwipeNavigation({
  active,
  onPressHome,
  onPressJournal,
  onPressRecipes
}: SwipeNavigationProps) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    pulse.setValue(1);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          duration: 900,
          toValue: 1.08,
          useNativeDriver: true
        }),
        Animated.timing(pulse, {
          duration: 900,
          toValue: 1,
          useNativeDriver: true
        })
      ])
    );

    loop.start();

    return () => loop.stop();
  }, [active, pulse]);

  return (
    <View style={styles.navStrip}>
      <NavItem active={active === "recipes"} icon="edit" onPress={onPressRecipes} pulse={pulse} />
      <View style={styles.navDash} />
      <NavItem active={active === "home"} icon="home" onPress={onPressHome} pulse={pulse} />
      <View style={styles.navDash} />
      <NavItem active={active === "journal"} icon="book" onPress={onPressJournal} pulse={pulse} />
    </View>
  );
}

function NavItem({
  active,
  icon,
  onPress,
  pulse
}: {
  active: boolean;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress?: () => void;
  pulse: Animated.Value;
}) {
  const iconNode = (
    <Animated.View style={[styles.iconMotion, active ? { transform: [{ scale: pulse }] } : undefined]}>
      <MaterialIcons color={active ? "#fc7240" : "#bfbfbf"} name={icon} size={28} />
    </Animated.View>
  );

  if (!onPress) {
    return <View style={styles.navButton}>{iconNode}</View>;
  }

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.navButton}>
      {iconNode}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  navStrip: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    height: 60,
    justifyContent: "center"
  },
  navButton: {
    alignItems: "center",
    height: 38,
    justifyContent: "center",
    width: 38
  },
  iconMotion: {
    alignItems: "center",
    justifyContent: "center"
  },
  navDash: {
    backgroundColor: "#7c7c7c",
    borderRadius: 2,
    height: 5,
    opacity: 0.9,
    width: 28
  }
});
