import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarStyle: {
          backgroundColor: "#000",
          height: 85,
          paddingBottom: 20,
          paddingTop: 10,
          borderTopWidth: 0,
        },

        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 5,
        },

        tabBarIconStyle: {
          marginTop: 4,
        },

        tabBarActiveTintColor: "#2F6BFF",
        tabBarInactiveTintColor: "#8A8A8A",
      }}
    >
      <Tabs.Screen
        name="comercial/con-percepcion"
        options={{
          title: "Con Percepción",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size} color={color} />
          ),
          href: "/comercial/con-percepcion",
        }}
      />

      <Tabs.Screen
        name="comercial/sin-percepcion"
        options={{
          title: "Sin Percepción",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document" size={size} color={color} />
          ),
          href: "/comercial/sin-percepcion",
        }}
      />

      <Tabs.Screen
        name="comercial/realizar-pedido"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="comercial/historial-pedidos"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}