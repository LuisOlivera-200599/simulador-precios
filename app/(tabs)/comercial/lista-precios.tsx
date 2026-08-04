import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Modo = "con" | "sin";
type Matriz = Record<string, string>;

const PLANTAS = ["VALERO", "CALLAO", "PAMPILLA", "CONCHÁN", "PISCO"];
const PRODUCTOS = ["DB5 S50 UV", "DB5 S50", "REGULAR", "PREMIUM"];
const STORAGE_KEY = "lista-precios-comercial-v1";
const LOGO_SOURCE = require("../../../assets/images/Logo_Crumar.png");

const keyFor = (planta: string, producto: string) => `${planta}::${producto}`;
const numberFrom = (value: string) => Number.parseFloat(value.replace(",", ".")) || 0;

function calcularVenta(compra: number, utilidad: number, modo: Modo) {
  if (!compra) return 0;

  const precioTotal = modo === "con" ? compra - compra / 1.01 / 100 : compra;
  const baseImponible = precioTotal / 1.18;
  return (baseImponible + utilidad) * 1.18;
}

function fechaActual() {
  return new Intl.DateTimeFormat("es-PE").format(new Date());
}

export default function ListaPrecios() {
  const [modo, setModo] = useState<Modo>("con");
  const [compras, setCompras] = useState<Matriz>({});
  const [utilidades, setUtilidades] = useState<Matriz>({});
  const [nota, setNota] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const previewRef = useRef<View>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (!saved) return;
        const data = JSON.parse(saved);
        setModo(data.modo ?? "con");
        setCompras(data.compras ?? {});
        setUtilidades(data.utilidades ?? {});
        setNota(data.nota ?? "");
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ modo, compras, utilidades, nota }),
    ).catch(() => undefined);
  }, [compras, loaded, modo, nota, utilidades]);

  const ventas = useMemo(() => {
    const result: Record<string, number> = {};
    PLANTAS.forEach((planta) => {
      PRODUCTOS.forEach((producto) => {
        const key = keyFor(planta, producto);
        result[key] = calcularVenta(
          numberFrom(compras[key] ?? ""),
          numberFrom(utilidades[key] ?? ""),
          modo,
        );
      });
    });
    return result;
  }, [compras, modo, utilidades]);

  const updateCell = (
    setter: React.Dispatch<React.SetStateAction<Matriz>>,
    key: string,
    value: string,
  ) => setter((current) => ({ ...current, [key]: value }));

  const limpiar = () => {
    const clear = () => {
      setCompras({});
      setUtilidades({});
      setNota("");
    };

    if (Platform.OS === "web") {
      if (window.confirm("¿Deseas borrar todos los precios y utilidades?")) clear();
      return;
    }

    Alert.alert("Limpiar lista", "¿Deseas borrar todos los precios y utilidades?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Limpiar", style: "destructive", onPress: clear },
    ]);
  };

  const copiarImagen = async () => {
    if (Platform.OS !== "web" || !previewRef.current) {
      Alert.alert("Copiar imagen", "Esta función está disponible en la versión web.");
      return;
    }

    try {
      const { toBlob } = await import("html-to-image");
      const element = previewRef.current as unknown as HTMLElement;
      const blob = await toBlob(element, {
        backgroundColor: "#f8f8f8",
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
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>COMERCIAL</Text>
            <Text style={styles.headerTitle}>LISTA DE PRECIOS</Text>
          </View>
          <Image
            source={LOGO_SOURCE}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.modeCard}>
          <Text style={styles.sectionTitle}>TIPO DE CÁLCULO</Text>
          <View style={styles.segmented}>
            <ModeButton label="CON PERCEPCIÓN" active={modo === "con"} onPress={() => setModo("con")} />
            <ModeButton label="SIN PERCEPCIÓN" active={modo === "sin"} onPress={() => setModo("sin")} />
          </View>
          <Text style={styles.helper}>
            La utilidad se ingresa antes del IGV, igual que en los simuladores individuales.
          </Text>
        </View>

        <PriceEditor
          title="1. PRECIOS DE COMPRA"
          subtitle="Ingresa el precio del proveedor por galón."
          values={compras}
          onChange={(key, value) => updateCell(setCompras, key, value)}
        />

        <PriceEditor
          title="2. UTILIDAD"
          subtitle="Ingresa la utilidad antes del IGV para cada producto."
          values={utilidades}
          onChange={(key, value) => updateCell(setUtilidades, key, value)}
        />

        <View style={styles.messageCard}>
          <Text style={styles.sectionTitle}>3. MENSAJE PARA EL CLIENTE</Text>
          <TextInput
            style={styles.noteEditor}
            value={nota}
            onChangeText={setNota}
            placeholder="Mensaje opcional"
            placeholderTextColor="#777"
          />
        </View>

        <View ref={previewRef} collapsable={false} style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <View>
              <Text style={styles.previewTitle}>Lista de precios vigentes:</Text>
              <Text style={styles.previewDate}>{fechaActual()}</Text>
            </View>
            <Image
              source={LOGO_SOURCE}
              style={styles.previewLogo}
              resizeMode="contain"
            />
          </View>

          <PriceTable values={ventas} />

          <Text style={styles.clientNote}>
            {nota || "Precios vigentes sujetos a disponibilidad."}
          </Text>
        </View>

        <TouchableOpacity style={styles.exportButton} onPress={copiarImagen}>
          <Ionicons name={copiado ? "checkmark-circle" : "copy-outline"} size={22} color="#fff" />
          <Text style={styles.exportText}>
            {copiado ? "IMAGEN COPIADA" : "COPIAR COMO IMAGEN"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.clearButton} onPress={limpiar}>
          <Ionicons name="trash-outline" size={20} color="#fff" />
          <Text style={styles.clearText}>LIMPIAR TABLA</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function ModeButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.modeButton, active && styles.modeButtonActive]} onPress={onPress}>
      <Text style={[styles.modeText, active && styles.modeTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function PriceEditor({
  title,
  subtitle,
  values,
  onChange,
}: {
  title: string;
  subtitle: string;
  values: Matriz;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.helper}>{subtitle}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableHeader, styles.plantCell]}>PLANTA</Text>
            {PRODUCTOS.map((producto) => (
              <Text key={producto} style={[styles.tableHeader, styles.valueCell]}>{producto}</Text>
            ))}
          </View>
          {PLANTAS.map((planta) => (
            <View key={planta} style={styles.tableRow}>
              <Text style={[styles.plantName, styles.plantCell]}>{planta}</Text>
              {PRODUCTOS.map((producto) => {
                const key = keyFor(planta, producto);
                return (
                  <TextInput
                    key={key}
                    style={[styles.cellInput, styles.valueCell]}
                    value={values[key] ?? ""}
                    onChangeText={(value) => onChange(key, value)}
                    keyboardType="decimal-pad"
                    placeholder="0.0000"
                    placeholderTextColor="#5d5d5d"
                  />
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function PriceTable({ values }: { values: Record<string, number> }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View>
        <View style={styles.outputRow}>
          <Text style={[styles.outputHeader, styles.plantCell]}>PLANTA</Text>
          {PRODUCTOS.map((producto) => (
            <Text key={producto} style={[styles.outputHeader, styles.valueCell]}>{producto}</Text>
          ))}
        </View>
        {PLANTAS.map((planta) => (
          <View key={planta} style={styles.outputRow}>
            <Text style={[styles.outputPlant, styles.plantCell]}>{planta}</Text>
            {PRODUCTOS.map((producto) => {
              const value = values[keyFor(planta, producto)];
              return (
                <Text key={producto} style={[styles.outputValue, styles.valueCell]}>
                  {value ? value.toFixed(4) : ""}
                </Text>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111" },
  scroll: { padding: 16, paddingBottom: 110, gap: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { color: "#1D9E75", fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  headerTitle: { color: "#fff", fontSize: 24, fontWeight: "800" },
  logo: { width: 92, height: 54 },
  modeCard: { backgroundColor: "#242424", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#343434" },
  card: { backgroundColor: "#242424", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#343434" },
  messageCard: { backgroundColor: "#242424", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "#343434" },
  sectionTitle: { color: "#fff", fontSize: 15, fontWeight: "800", marginBottom: 5 },
  helper: { color: "#aaa", fontSize: 12, lineHeight: 18, marginBottom: 12 },
  segmented: { flexDirection: "row", backgroundColor: "#161616", borderRadius: 9, padding: 4, gap: 4 },
  modeButton: { flex: 1, paddingVertical: 11, borderRadius: 7, alignItems: "center" },
  modeButtonActive: { backgroundColor: "#1D9E75" },
  modeText: { color: "#8f8f8f", fontSize: 11, fontWeight: "800" },
  modeTextActive: { color: "#fff" },
  tableRow: { flexDirection: "row" },
  plantCell: { width: 140 },
  valueCell: { width: 190 },
  tableHeader: { backgroundColor: "#080808", color: "#fff", borderWidth: 0.5, borderColor: "#4a4a4a", padding: 9, textAlign: "center", fontSize: 11, fontWeight: "800" },
  plantName: { backgroundColor: "#353535", color: "#fff", borderWidth: 0.5, borderColor: "#4a4a4a", padding: 12, fontSize: 12 },
  cellInput: { backgroundColor: "#171717", color: "#fff", borderWidth: 0.5, borderColor: "#4a4a4a", paddingHorizontal: 10, paddingVertical: 9, textAlign: "center", fontSize: 13 },
  previewCard: { backgroundColor: "#f8f8f8", borderRadius: 14, padding: 16, gap: 14 },
  previewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  previewTitle: { color: "#111", fontSize: 16, fontWeight: "800" },
  previewDate: { color: "#111", fontSize: 17, marginTop: 4 },
  previewLogo: { width: 100, height: 65 },
  outputRow: { flexDirection: "row" },
  outputHeader: { backgroundColor: "#050505", color: "#fff", borderWidth: 0.5, borderColor: "#222", padding: 8, textAlign: "center", fontSize: 11, fontWeight: "800" },
  outputPlant: { backgroundColor: "#bbb7b7", color: "#111", borderWidth: 0.5, borderColor: "#222", padding: 10, textAlign: "center", fontSize: 12 },
  outputValue: { backgroundColor: "#fff", color: "#111", borderWidth: 0.5, borderColor: "#222", padding: 10, textAlign: "center", fontSize: 13 },
  noteEditor: { minHeight: 44, borderRadius: 8, backgroundColor: "#171717", color: "#fff", borderWidth: 1, borderColor: "#4a4a4a", paddingHorizontal: 12, fontWeight: "700" },
  clientNote: { minHeight: 32, color: "#111", paddingTop: 8, fontWeight: "700", fontSize: 14 },
  exportButton: { height: 52, backgroundColor: "#1D9E75", borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  exportText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  clearButton: { height: 48, backgroundColor: "#b4232c", borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  clearText: { color: "#fff", fontSize: 13, fontWeight: "800" },
});
