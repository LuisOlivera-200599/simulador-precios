import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useRef, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { CommercialNavigation } from "../../../components/commercial-navigation";

const LOGO_SOURCE = require("../../../assets/images/Logo_Crumar.png");
const COMPANY_NAME = "CORPORACION CRUMAR DEL PERU SAC";
const COMPANY_RUC = "20614585952";

const BANKS = [
  {
    bank: "BBVA",
    accounts: [
      { type: "CTA CTE", number: "0011-0716-01-000451414" },
      { type: "CCI", number: "011-716-0001000451414-81" },
    ],
  },
  {
    bank: "BCP",
    accounts: [
      { type: "CTA CTE", number: "191-7383649-0-10" },
      { type: "CCI", number: "002-19100738364901059" },
    ],
  },
] as const;

export default function NumerosCuenta() {
  const [copiado, setCopiado] = useState(false);
  const tableRef = useRef<View>(null);

  const copiarTabla = async () => {
    if (Platform.OS !== "web" || !tableRef.current) {
      Alert.alert("Copiar imagen", "Esta función está disponible en la versión web.");
      return;
    }

    try {
      const { toBlob } = await import("html-to-image");
      const element = tableRef.current as unknown as HTMLElement;
      const blob = await toBlob(element, {
        backgroundColor: "#ffffff",
        cacheBust: true,
        pixelRatio: 2,
      });

      if (!blob) throw new Error("No se pudo crear la imagen");

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      window.alert(
        "No se pudo copiar la imagen. Revisa que Chrome permita el acceso al portapapeles.",
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.pageContent}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>COMERCIAL</Text>
              <Text style={styles.headerTitle}>NÚMEROS DE CUENTA</Text>
            </View>
            <Image source={LOGO_SOURCE} style={styles.headerLogo} resizeMode="contain" />
          </View>

          <CommercialNavigation active="accounts" />

          <View style={styles.introCard}>
            <Text style={styles.sectionTitle}>DATOS BANCARIOS PARA CLIENTES</Text>
            <Text style={styles.helper}>
              Copia la ficha completa como imagen para enviarla por WhatsApp, correo u otro medio.
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            contentContainerStyle={styles.previewScrollContent}
          >
            <View ref={tableRef} collapsable={false} style={styles.accountCard}>
              <View style={styles.companyHeader}>
                <View style={styles.logoFrame}>
                  <Image source={LOGO_SOURCE} style={styles.cardLogo} resizeMode="contain" />
                </View>
                <View style={styles.companyDetails}>
                  <View style={styles.companyRow}>
                    <Text style={styles.companyLabel}>RAZÓN SOCIAL:</Text>
                    <Text style={styles.companyValue}>{COMPANY_NAME}</Text>
                  </View>
                  <View style={styles.companyRow}>
                    <Text style={styles.companyLabel}>RUC:</Text>
                    <Text style={styles.companyValue}>{COMPANY_RUC}</Text>
                  </View>
                </View>
              </View>

              {BANKS.map((bank) => (
                <View key={bank.bank} style={styles.bankTable}>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableHeader, styles.bankColumn]}>Banco</Text>
                    <Text style={[styles.tableHeader, styles.typeColumn]}>Tipo</Text>
                    <Text style={[styles.tableHeader, styles.numberColumn]}>Número</Text>
                  </View>
                  {bank.accounts.map((account) => (
                    <View key={account.type} style={styles.tableRow}>
                      <Text style={[styles.tableCell, styles.bankCell, styles.bankColumn]}>
                        {bank.bank}
                      </Text>
                      <Text style={[styles.tableCell, styles.typeColumn]}>{account.type}</Text>
                      <Text selectable style={[styles.tableCell, styles.numberColumn]}>
                        {account.number}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}

              <Text style={styles.securityNote}>
                Verifica que el titular sea {COMPANY_NAME} antes de realizar una transferencia.
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity
            accessibilityRole="button"
            style={styles.copyButton}
            onPress={copiarTabla}
          >
            <Ionicons
              name={copiado ? "checkmark-circle" : "copy-outline"}
              size={22}
              color="#fff"
            />
            <Text style={styles.copyButtonText}>
              {copiado ? "TABLA COPIADA" : "COPIAR TODA LA TABLA COMO IMAGEN"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f1110" },
  scroll: { padding: 18, paddingBottom: 32 },
  pageContent: { width: "100%", maxWidth: 1500, alignSelf: "center", gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { color: "#1D9E75", fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  headerTitle: { color: "#fff", fontSize: 24, fontWeight: "800" },
  headerLogo: { width: 92, height: 54 },
  introCard: { backgroundColor: "#222523", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#353a37" },
  sectionTitle: { color: "#fff", fontSize: 15, fontWeight: "800", marginBottom: 5 },
  helper: { color: "#aaa", fontSize: 12, lineHeight: 18 },
  previewScrollContent: { minWidth: "100%", justifyContent: "center" },
  accountCard: { width: 820, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#d3d3d3", padding: 34, gap: 24 },
  companyHeader: { flexDirection: "row", alignItems: "stretch", gap: 24 },
  logoFrame: { width: 170, height: 132, borderRadius: 12, borderWidth: 1, borderColor: "#d7d7d7", alignItems: "center", justifyContent: "center", backgroundColor: "#f8f8f8" },
  cardLogo: { width: 132, height: 104 },
  companyDetails: { flex: 1, justifyContent: "center" },
  companyRow: { flexDirection: "row", minHeight: 52 },
  companyLabel: { width: 154, backgroundColor: "#050505", color: "#fff", borderWidth: 0.5, borderColor: "#111", paddingHorizontal: 12, textAlignVertical: "center", fontSize: 15, fontWeight: "800" },
  companyValue: { flex: 1, color: "#111", borderWidth: 0.5, borderColor: "#111", paddingHorizontal: 12, textAlign: "center", textAlignVertical: "center", fontSize: 17 },
  bankTable: { borderWidth: 0.5, borderColor: "#111" },
  tableRow: { flexDirection: "row" },
  tableHeader: { backgroundColor: "#050505", color: "#fff", borderWidth: 0.5, borderColor: "#111", paddingVertical: 11, paddingHorizontal: 8, textAlign: "center", fontSize: 15, fontWeight: "800" },
  tableCell: { color: "#111", backgroundColor: "#fff", borderWidth: 0.5, borderColor: "#555", paddingVertical: 10, paddingHorizontal: 8, textAlign: "center", fontSize: 16, fontVariant: ["tabular-nums"] },
  bankCell: { backgroundColor: "#d6d2d2" },
  bankColumn: { width: 200 },
  typeColumn: { width: 165 },
  numberColumn: { flex: 1 },
  securityNote: { color: "#333", fontSize: 12, lineHeight: 18, textAlign: "center" },
  copyButton: { minHeight: 54, backgroundColor: "#1D9E75", borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 18 },
  copyButtonText: { color: "#fff", fontWeight: "800", fontSize: 14, textAlign: "center" },
});
