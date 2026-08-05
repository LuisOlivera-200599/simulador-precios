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
const PALETA_COLORES = [
  { nombre: "Amarillo", valor: "#FFD54F" },
  { nombre: "Verde", valor: "#81C784" },
  { nombre: "Azul", valor: "#64B5F6" },
  { nombre: "Naranja", valor: "#FFB74D" },
  { nombre: "Rosado", valor: "#F48FB1" },
  { nombre: "Lila", valor: "#B39DDB" },
] as const;

const keyFor = (planta: string, producto: string) => `${planta}::${producto}`;
const plantKeyFor = (planta: string) => `${planta}::PLANTA`;
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
  const [colores, setColores] = useState<Matriz>({});
  const [colorPincel, setColorPincel] = useState<string | null>(
    PALETA_COLORES[0].valor,
  );
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
        setColores(data.colores ?? {});
        setNota(data.nota ?? "");
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ modo, compras, utilidades, colores, nota }),
    ).catch(() => undefined);
  }, [colores, compras, loaded, modo, nota, utilidades]);

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

  const plantasConPrecios = useMemo(
    () =>
      PLANTAS.filter((planta) =>
        PRODUCTOS.some(
          (producto) => numberFrom(compras[keyFor(planta, producto)] ?? "") > 0,
        ),
      ),
    [compras],
  );

  const updateCell = (
    setter: React.Dispatch<React.SetStateAction<Matriz>>,
    key: string,
    value: string,
  ) => setter((current) => ({ ...current, [key]: value }));

  const pintarCelda = (key: string) => {
    setColores((current) => {
      if (colorPincel) return { ...current, [key]: colorPincel };

      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const limpiar = () => {
    const clear = () => {
      setCompras({});
      setUtilidades({});
      setColores({});
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

    if (plantasConPrecios.length === 0) {
      window.alert("Ingresa al menos un precio de compra antes de copiar la imagen.");
      return;
    }

    try {
      const { toBlob } = await import("html-to-image");
      const element = previewRef.current as unknown as HTMLElement;
      const blob = await toBlob(element, {
        backgroundColor: "#f8f8f8",
        cacheBust: true,
        pixelRatio: 1.5,
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
            <Text style={styles.helperLast}>
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

          <ColorPalette
            selectedColor={colorPincel}
            onSelectColor={setColorPincel}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            contentContainerStyle={styles.previewScrollContent}
          >
            <View ref={previewRef} collapsable={false} style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>Lista de precios vigentes:</Text>
                <Text style={styles.previewDate}>{fechaActual()}</Text>
                <Image
                  source={LOGO_SOURCE}
                  style={styles.previewLogo}
                  resizeMode="contain"
                />
              </View>

              <PriceTable
                plantas={plantasConPrecios}
                values={ventas}
                colors={colores}
                onPaint={pintarCelda}
              />

              <Text style={styles.clientNote}>
                {nota || "Precios vigentes sujetos a disponibilidad."}
              </Text>
            </View>
          </ScrollView>

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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ColorPalette({
  selectedColor,
  onSelectColor,
}: {
  selectedColor: string | null;
  onSelectColor: (color: string | null) => void;
}) {
  return (
    <View style={styles.paletteCard}>
      <Text style={styles.sectionTitle}>4. COLORES DE LA TABLA FINAL</Text>
      <Text style={styles.helper}>
        Elige un color y luego pulsa cada recuadro que quieras pintar.
      </Text>
      <View style={styles.paletteRow}>
        {PALETA_COLORES.map((color) => (
          <TouchableOpacity
            key={color.valor}
            accessibilityLabel={`Seleccionar color ${color.nombre}`}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedColor === color.valor }}
            activeOpacity={0.75}
            onPress={() => onSelectColor(color.valor)}
            style={[
              styles.colorSwatch,
              { backgroundColor: color.valor },
              selectedColor === color.valor && styles.colorSwatchActive,
            ]}
          >
            {selectedColor === color.valor && (
              <Ionicons name="checkmark" size={20} color="#111" />
            )}
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          accessibilityLabel="Borrar color de los recuadros"
          accessibilityRole="button"
          accessibilityState={{ selected: selectedColor === null }}
          activeOpacity={0.75}
          onPress={() => onSelectColor(null)}
          style={[
            styles.eraseColorButton,
            selectedColor === null && styles.eraseColorButtonActive,
          ]}
        >
          <Ionicons name="close-circle-outline" size={18} color="#fff" />
          <Text style={styles.eraseColorText}>BORRAR COLOR</Text>
        </TouchableOpacity>
      </View>
    </View>
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        contentContainerStyle={styles.tableScrollContent}
      >
        <View style={styles.editorTable}>
          <View style={styles.tableRow}>
            <Text style={[styles.tableHeader, styles.editorPlantCell]}>PLANTA</Text>
            {PRODUCTOS.map((producto) => (
              <Text key={producto} style={[styles.tableHeader, styles.editorValueCell]}>{producto}</Text>
            ))}
          </View>
          {PLANTAS.map((planta, index) => (
            <View key={planta} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlternate]}>
              <Text style={[styles.plantName, styles.editorPlantCell]}>{planta}</Text>
              {PRODUCTOS.map((producto) => {
                const key = keyFor(planta, producto);
                return (
                  <TextInput
                    key={key}
                    style={[styles.cellInput, styles.editorValueCell]}
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

function PriceTable({
  plantas,
  values,
  colors,
  onPaint,
}: {
  plantas: string[];
  values: Record<string, number>;
  colors: Matriz;
  onPaint: (key: string) => void;
}) {
  return (
    <View>
      <View style={styles.outputRow}>
        <Text style={[styles.outputHeader, styles.outputPlantCell]}>PLANTA</Text>
        {PRODUCTOS.map((producto) => (
          <Text key={producto} style={[styles.outputHeader, styles.outputValueCell]}>{producto}</Text>
        ))}
      </View>
      {plantas.map((planta) => {
        const plantKey = plantKeyFor(planta);

        return (
          <View key={planta} style={styles.outputRow}>
            <TouchableOpacity
              accessibilityLabel={`Pintar recuadro ${planta}`}
              accessibilityRole="button"
              activeOpacity={0.75}
              onPress={() => onPaint(plantKey)}
              style={[
                styles.outputCell,
                styles.outputPlant,
                styles.outputPlantCell,
                colors[plantKey] ? { backgroundColor: colors[plantKey] } : null,
              ]}
            >
              <Text style={styles.outputPlantText}>{planta}</Text>
            </TouchableOpacity>
            {PRODUCTOS.map((producto) => {
              const key = keyFor(planta, producto);
              const value = values[key];

              return (
                <TouchableOpacity
                  key={producto}
                  accessibilityLabel={`Pintar recuadro ${planta}, ${producto}`}
                  accessibilityRole="button"
                  activeOpacity={0.75}
                  onPress={() => onPaint(key)}
                  style={[
                    styles.outputCell,
                    styles.outputValue,
                    styles.outputValueCell,
                    colors[key] ? { backgroundColor: colors[key] } : null,
                  ]}
                >
                  <Text style={styles.outputValueText}>
                    {value ? value.toFixed(4) : ""}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f1110" },
  scroll: { padding: 18, paddingBottom: 110 },
  pageContent: { width: "100%", maxWidth: 1500, alignSelf: "center", gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { color: "#1D9E75", fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  headerTitle: { color: "#fff", fontSize: 24, fontWeight: "800" },
  logo: { width: 92, height: 54 },
  modeCard: { backgroundColor: "#222523", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#353a37" },
  card: { backgroundColor: "#222523", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#353a37" },
  messageCard: { backgroundColor: "#222523", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#353a37" },
  paletteCard: { backgroundColor: "#222523", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#353a37" },
  paletteRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12 },
  colorSwatch: { width: 48, height: 48, borderRadius: 12, borderWidth: 2, borderColor: "#555", alignItems: "center", justifyContent: "center" },
  colorSwatchActive: { borderColor: "#fff", borderWidth: 4 },
  eraseColorButton: { minHeight: 48, paddingHorizontal: 16, borderRadius: 10, borderWidth: 2, borderColor: "#555", backgroundColor: "#171717", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  eraseColorButtonActive: { borderColor: "#fff" },
  eraseColorText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  sectionTitle: { color: "#fff", fontSize: 15, fontWeight: "800", marginBottom: 5 },
  helper: { color: "#aaa", fontSize: 12, lineHeight: 18, marginBottom: 12 },
  helperLast: { color: "#aaa", fontSize: 12, lineHeight: 18, marginTop: 9 },
  segmented: { flexDirection: "row", backgroundColor: "#161616", borderRadius: 9, padding: 4, gap: 4 },
  modeButton: { flex: 1, paddingVertical: 11, borderRadius: 7, alignItems: "center" },
  modeButtonActive: { backgroundColor: "#1D9E75" },
  modeText: { color: "#8f8f8f", fontSize: 11, fontWeight: "800" },
  modeTextActive: { color: "#fff" },
  tableRow: { flexDirection: "row" },
  tableScrollContent: { flexGrow: 1, minWidth: 850 },
  editorTable: { flex: 1, borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: "#4a4f4c" },
  editorPlantCell: { flex: 0.78, minWidth: 130 },
  editorValueCell: { flex: 1, minWidth: 180 },
  tableRowAlternate: { backgroundColor: "#1b1e1c" },
  tableHeader: { backgroundColor: "#090a09", color: "#fff", borderWidth: 0.5, borderColor: "#4a4f4c", paddingVertical: 12, paddingHorizontal: 9, textAlign: "center", fontSize: 11, fontWeight: "800" },
  plantName: { backgroundColor: "#343835", color: "#fff", borderWidth: 0.5, borderColor: "#4a4f4c", paddingHorizontal: 12, paddingVertical: 14, fontSize: 12, fontWeight: "700" },
  cellInput: { backgroundColor: "transparent", color: "#fff", borderWidth: 0.5, borderColor: "#4a4f4c", paddingHorizontal: 10, paddingVertical: 11, textAlign: "center", fontSize: 13 },
  previewScrollContent: { minWidth: "100%", justifyContent: "center" },
  previewCard: { width: 948, backgroundColor: "#f8f8f8", borderRadius: 10, borderWidth: 1, borderColor: "#d5d5d5", padding: 24, gap: 20 },
  previewHeader: { height: 78, flexDirection: "row", alignItems: "center" },
  previewTitle: { flex: 1, color: "#111", fontSize: 20, fontWeight: "800" },
  previewDate: { width: 180, color: "#111", fontSize: 20, textAlign: "center" },
  previewLogo: { width: 120, height: 78 },
  outputPlantCell: { width: 140 },
  outputValueCell: { width: 190 },
  outputRow: { flexDirection: "row" },
  outputHeader: { backgroundColor: "#050505", color: "#fff", borderWidth: 0.5, borderColor: "#222", paddingVertical: 12, paddingHorizontal: 8, textAlign: "center", fontSize: 12, fontWeight: "800" },
  outputCell: { minHeight: 44, borderWidth: 0.5, borderColor: "#222", paddingVertical: 12, paddingHorizontal: 8, alignItems: "center", justifyContent: "center" },
  outputPlant: { backgroundColor: "#bbb7b7" },
  outputValue: { backgroundColor: "#fff" },
  outputPlantText: { color: "#111", textAlign: "center", fontSize: 14 },
  outputValueText: { color: "#111", textAlign: "center", fontSize: 15 },
  noteEditor: { minHeight: 44, borderRadius: 8, backgroundColor: "#171717", color: "#fff", borderWidth: 1, borderColor: "#4a4a4a", paddingHorizontal: 12, fontWeight: "700" },
  clientNote: { minHeight: 34, color: "#111", paddingTop: 6, fontWeight: "700", fontSize: 15 },
  exportButton: { height: 52, backgroundColor: "#1D9E75", borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  exportText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  clearButton: { height: 48, backgroundColor: "#b4232c", borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  clearText: { color: "#fff", fontSize: 13, fontWeight: "800" },
});
