import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useMemo, useState } from "react";
import { LOGO_CRUMAR_DATA_URI } from "../../../constants/logo-crumar";
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function ListaPrecios() {
  const [modo, setModo] = useState<Modo>("con");
  const [compras, setCompras] = useState<Matriz>({});
  const [utilidades, setUtilidades] = useState<Matriz>({});
  const [nota, setNota] = useState("");
  const [loaded, setLoaded] = useState(false);

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

  const crearHtml = () => {
    const rows = PLANTAS.map((planta) => {
      const cells = PRODUCTOS.map((producto) => {
        const value = ventas[keyFor(planta, producto)];
        return `<td>${value ? value.toFixed(4) : ""}</td>`;
      }).join("");
      return `<tr><th>${escapeHtml(planta)}</th>${cells}</tr>`;
    }).join("");

    return `<!doctype html>
      <html><head><meta charset="utf-8"><title>Lista de precios CRUMAR</title>
      <style>
        @page { size: landscape; margin: 18mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; color: #111; margin: 0; }
        .sheet { border: 1px solid #222; padding: 34px 54px; min-height: 520px; }
        .header { display: grid; grid-template-columns: 1fr auto 210px; align-items: center; gap: 28px; margin-bottom: 18px; }
        .title { font-size: 25px; font-weight: 700; }
        .date { font-size: 28px; }
        .brand { width: 180px; height: 125px; object-fit: contain; justify-self: end; }
        table { border-collapse: collapse; width: 100%; table-layout: fixed; font-size: 21px; }
        th, td { border: 1px solid #222; height: 39px; padding: 5px 9px; text-align: center; }
        thead th { background: #050505; color: white; font-weight: 700; }
        tbody th { background: #bbb7b7; font-weight: 400; }
        .note { margin-top: 38px; font-size: 22px; font-weight: 700; }
      </style></head>
      <body><div class="sheet">
        <div class="header">
          <div class="title">Lista de precios vigentes:</div>
          <div class="date">${fechaActual()}</div>
          <img class="brand" src="${LOGO_CRUMAR_DATA_URI}" alt="CRUMAR">
        </div>
        <table><thead><tr><th>PLANTA</th>${PRODUCTOS.map((p) => `<th>${escapeHtml(p)}</th>`).join("")}</tr></thead>
        <tbody>${rows}</tbody></table>
        <div class="note">${escapeHtml(nota || "Precios vigentes sujetos a disponibilidad.")}</div>
      </div></body></html>`;
  };

  const exportar = async () => {
    const html = crearHtml();

    if (Platform.OS === "web") {
      const printWindow = window.open("", "_blank", "width=1100,height=760");
      if (!printWindow) {
        window.alert("Permite las ventanas emergentes para generar el documento.");
        return;
      }
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      window.setTimeout(() => printWindow.print(), 300);
      return;
    }

    const [Print, Sharing] = await Promise.all([
      import("expo-print"),
      import("expo-sharing"),
    ]);
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Compartir lista de precios",
      });
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

        <View style={styles.previewCard}>
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

          <TextInput
            style={styles.noteInput}
            value={nota}
            onChangeText={setNota}
            placeholder="Mensaje para el cliente (opcional)"
            placeholderTextColor="#777"
          />
        </View>

        <TouchableOpacity style={styles.exportButton} onPress={exportar}>
          <Ionicons name="share-outline" size={22} color="#fff" />
          <Text style={styles.exportText}>GENERAR Y COMPARTIR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.clearButton} onPress={limpiar}>
          <Text style={styles.clearText}>Limpiar todos los datos</Text>
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
  noteInput: { minHeight: 46, color: "#111", borderBottomWidth: 1, borderBottomColor: "#bbb", paddingVertical: 8, fontWeight: "700" },
  exportButton: { height: 52, backgroundColor: "#1D9E75", borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  exportText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  clearButton: { height: 44, alignItems: "center", justifyContent: "center" },
  clearText: { color: "#e45d5d", fontSize: 13, fontWeight: "700" },
});
