import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function SinPercepcion() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [ptInput, setPtInput] = useState("");
  const [utilidad, setUtilidad] = useState("");

  const pt1 = parseFloat(ptInput) || 0;
  const util = parseFloat(utilidad) || 0;

  const perc = 0;
  const bi1 = pt1 / 1.18;
  const igv1 = pt1 - bi1;

  const bi2 = bi1 + util;
  const igv2 = bi2 * 0.18;
  const pt2 = bi2 + igv2;
  const diferencia = pt2 - pt1;

  const format = (num: number) => `S/ ${num.toFixed(6)}`;

  const limpiar = () => {
    setPtInput("");
    setUtilidad("");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setMenuOpen(!menuOpen)}>
            <Ionicons name="menu" size={30} color="#000" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>SIN PERCEPCION</Text>
        </View>

        {menuOpen && (
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>Opciones</Text>

            <TouchableOpacity
              onPress={() => {
                setMenuOpen(false);
                router.push("/(tabs)/comercial/con-percepcion");
              }}
            >
              <Text style={styles.menuItem}>CON PERCEPCION</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setMenuOpen(false)}>
              <Text style={styles.menuItem}>SIN PERCEPCION</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.grid}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>CUADRO 1</Text>

            <Input label="P.T." value={ptInput} onChangeText={setPtInput} />
            <Result label="PERC." value={format(perc)} />
            <Result label="B.I." value={format(bi1)} />
            <Result label="IGV" value={format(igv1)} />
            <Input label="UTILIDAD" value={utilidad} onChangeText={setUtilidad} />

            <TouchableOpacity style={styles.btnClear} onPress={limpiar}>
              <Text style={styles.btnText}>Limpiar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>CUADRO 2</Text>

            <Result label="B.I." value={format(bi1)} />
            <Result label="UTILIDAD" value={format(util)} />
            <Result label="B.I. 2" value={format(bi2)} />
            <Result label="IGV" value={format(igv2)} />
            <Result label="P.T." value={format(pt2)} />
            <Result label="DIFERENCIA" value={format(diferencia)} highlight />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Input({ label, value, onChangeText }: any) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholder="Ingrese valor"
        placeholderTextColor="#777"
      />
    </View>
  );
}

function Result({ label, value, highlight = false }: any) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.resultBox, highlight && styles.highlightBox]}>
        <Text style={[styles.resultText, highlight && styles.highlightText]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111" },
  scroll: { padding: 16, paddingBottom: 100 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "bold", marginLeft: 12 },
  menu: {
    position: "absolute",
    top: 60,
    left: 0,
    width: 280,
    height: "100%",
    backgroundColor: "#fff",
    zIndex: 999,
    padding: 30,
  },
  menuTitle: { fontSize: 26, fontWeight: "bold", marginBottom: 35 },
  menuItem: { fontSize: 24, marginBottom: 30 },
  grid: { gap: 14 },
  card: {
    backgroundColor: "#242424",
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    borderColor: "#3A3A3A",
  },
  cardTitle: { color: "#fff", fontSize: 16, fontWeight: "bold", marginBottom: 12 },
  field: { marginBottom: 10 },
  label: { color: "#aaa", fontSize: 11, marginBottom: 4, textTransform: "uppercase" },
  input: {
    height: 42,
    borderWidth: 1,
    borderColor: "#3A3A3A",
    borderRadius: 8,
    backgroundColor: "#1A1A1A",
    color: "#fff",
    paddingHorizontal: 10,
  },
  resultBox: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: "#3A3A3A",
    borderRadius: 8,
    backgroundColor: "#1A1A1A",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  resultText: { color: "#fff", fontSize: 14 },
  highlightBox: { borderColor: "#1D9E75" },
  highlightText: { color: "#1D9E75", fontWeight: "bold" },
  btnClear: {
    height: 42,
    borderRadius: 8,
    backgroundColor: "#E8191A",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  btnText: { color: "#fff", fontWeight: "bold" },
});