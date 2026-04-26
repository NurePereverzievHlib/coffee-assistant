import { MaterialIcons } from "@expo/vector-icons";

type FieldIconProps = {
  name: "mail" | "lock" | "person" | "eye" | "eye-off";
};

const iconNames: Record<FieldIconProps["name"], keyof typeof MaterialIcons.glyphMap> = {
  mail: "mail-outline",
  lock: "lock-outline",
  person: "person-outline",
  eye: "visibility",
  "eye-off": "visibility-off"
};

export function FieldIcon({ name }: FieldIconProps) {
  return <MaterialIcons color="#6a6a6a" name={iconNames[name]} size={24} />;
}
