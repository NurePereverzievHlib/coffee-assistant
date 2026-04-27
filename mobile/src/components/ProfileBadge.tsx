import { MaterialIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { CurrentUser } from "../api/auth";

type ProfileBadgeProps = {
  onPress?: () => void;
  profile?: CurrentUser | null;
};

export function ProfileBadge({ onPress, profile }: ProfileBadgeProps) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatarUrl = useMemo(() => normalizeProfileImageUrl(profile?.avatar_url), [profile?.avatar_url]);
  const username = profile?.username ? `@${profile.username.replace(/^@/, "")}` : "";
  const content = (
    <>
      <View style={styles.avatarButton}>
        {avatarUrl && !avatarFailed ? (
          <Image
            onError={() => setAvatarFailed(true)}
            resizeMode="cover"
            source={remoteImageSource(avatarUrl)}
            style={styles.avatarImage}
          />
        ) : (
          <MaterialIcons color="#1d1d1d" name="person" size={30} />
        )}
      </View>
      <Text numberOfLines={1} style={styles.profileName}>
        {username}
      </Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.profileBlock}>
        {content}
      </Pressable>
    );
  }

  return <View style={styles.profileBlock}>{content}</View>;
}

function normalizeProfileImageUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim().replace(/^["']|["']$/g, "");

  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    if (url.hostname.endsWith("unsplash.com")) {
      url.searchParams.set("fm", "jpg");
    }

    return url.toString();
  } catch {
    return null;
  }
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

const styles = StyleSheet.create({
  profileBlock: {
    alignItems: "center",
    marginRight: 8,
    width: 82
  },
  avatarButton: {
    alignItems: "center",
    backgroundColor: "#f1f1f1",
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    overflow: "hidden",
    width: 56
  },
  avatarImage: {
    height: 56,
    width: 56
  },
  profileName: {
    color: "#1d1d1d",
    fontFamily: "Manrope_700Bold",
    fontSize: 11,
    lineHeight: 14,
    marginTop: 4,
    maxWidth: 82,
    minHeight: 14,
    textAlign: "center"
  }
});
