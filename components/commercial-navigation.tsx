import Ionicons from "@expo/vector-icons/Ionicons";
import { Href, router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

type CommercialSection = "prices" | "accounts";

const ITEMS = [
  {
    key: "prices" as const,
    href: "/(tabs)/comercial/lista-precios" as Href,
    icon: "pricetags-outline" as const,
    label: "LISTA DE PRECIOS",
  },
  {
    key: "accounts" as const,
    href: "/(tabs)/comercial/numeros-cuenta" as Href,
    icon: "card-outline" as const,
    label: "NÚMEROS DE CUENTA",
  },
];

export function CommercialNavigation({ active }: { active: CommercialSection }) {
  return (
    <View accessibilityRole="tablist" style={styles.navigation}>
      {ITEMS.map((item) => {
        const selected = item.key === active;

        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => router.push(item.href)}
            style={[styles.link, selected && styles.linkActive]}
          >
            <View style={styles.linkContent}>
              <Ionicons
                name={item.icon}
                size={19}
                color={selected ? "#fff" : "#9aa39e"}
              />
              <Text style={[styles.label, selected && styles.labelActive]}>
                {item.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  navigation: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    padding: 6,
    borderRadius: 14,
    backgroundColor: "#191c1a",
    borderWidth: 1,
    borderColor: "#343936",
  },
  link: {
    flexGrow: 1,
    flexBasis: 220,
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 18,
  },
  linkActive: {
    backgroundColor: "#1D9E75",
  },
  linkContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  label: {
    color: "#9aa39e",
    fontSize: 12,
    fontWeight: "800",
  },
  labelActive: {
    color: "#fff",
  },
});
