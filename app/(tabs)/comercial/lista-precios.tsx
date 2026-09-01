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

type Matriz = Record<string, string>;
type PreciosVenta = {
  sinPercepcion: number;
  conPercepcion: number;
};

const PLANTAS_BASE = ["VALERO", "CALLAO", "PAMPILLA", "CONCHÁN", "PISCO"];
const PRODUCTOS_BASE = ["DB5 S50 UV", "DB5 S50", "REGULAR", "PREMIUM"];
const MAX_PLANTAS = 10;
const MAX_PRODUCTOS = 8;
const STORAGE_KEY = "lista-precios-comercial-v1";
const FACTOR_IGV = 1.18;
const TASA_PERCEPCION = 0.01;
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
const normalizarNombre = (value: string) =>
  value.trim().replace(/:+/g, " ").replace(/\s+/g, " ").toLocaleUpperCase("es-PE");

function combinarConBase(base: string[], saved: unknown) {
  if (!Array.isArray(saved)) return base;

  const items = saved
    .filter((item): item is string => typeof item === "string")
    .map(normalizarNombre)
    .filter(Boolean);
  const uniqueItems = [...new Set(items)];
  return uniqueItems.length > 0 ? uniqueItems : base;
}

function filtrarClaves<T>(
  current: Record<string, T>,
  shouldRemove: (key: string) => boolean,
) {
  return Object.fromEntries(
    Object.entries(current).filter(([key]) => !shouldRemove(key)),
  ) as Record<string, T>;
}

function calcularVenta(compra: number, utilidad: number): PreciosVenta {
  if (!compra) return { sinPercepcion: 0, conPercepcion: 0 };

  const baseSinIgv = compra / FACTOR_IGV;
  const precioSinPercepcion = (baseSinIgv + utilidad) * FACTOR_IGV;

  return {
    sinPercepcion: precioSinPercepcion,
    conPercepcion: precioSinPercepcion * (1 + TASA_PERCEPCION),
  };
}

function fechaActual() {
  return new Intl.DateTimeFormat("es-PE").format(new Date());
}

export default function ListaPrecios() {
  const [plantas, setPlantas] = useState<string[]>(PLANTAS_BASE);
  const [productos, setProductos] = useState<string[]>(PRODUCTOS_BASE);
  const [compras, setCompras] = useState<Matriz>({});
  const [utilidades, setUtilidades] = useState<Matriz>({});
  const [colores, setColores] = useState<Matriz>({});
  const [colorPincel, setColorPincel] = useState<string | null>(
    PALETA_COLORES[0].valor,
  );
  const [nuevaPlanta, setNuevaPlanta] = useState("");
  const [nuevoProducto, setNuevoProducto] = useState("");
  const [nota, setNota] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const previewRef = useRef<View>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (!saved) return;
        const data = JSON.parse(saved);
        setPlantas(combinarConBase(PLANTAS_BASE, data.plantas));
        setProductos(combinarConBase(PRODUCTOS_BASE, data.productos));
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
      JSON.stringify({
        plantas,
        productos,
        compras,
        utilidades,
        colores,
        nota,
      }),
    ).catch(() => undefined);
  }, [colores, compras, loaded, nota, plantas, productos, utilidades]);

  const ventas = useMemo(() => {
    const result: Record<string, PreciosVenta> = {};
    plantas.forEach((planta) => {
      productos.forEach((producto) => {
        const key = keyFor(planta, producto);
        result[key] = calcularVenta(
          numberFrom(compras[key] ?? ""),
          numberFrom(utilidades[key] ?? ""),
        );
      });
    });
    return result;
  }, [compras, plantas, productos, utilidades]);

  const plantasConPrecios = useMemo(
    () =>
      plantas.filter((planta) =>
        productos.some(
          (producto) => numberFrom(compras[keyFor(planta, producto)] ?? "") > 0,
        ),
      ),
    [compras, plantas, productos],
  );

  const updateCell = (
    setter: React.Dispatch<React.SetStateAction<Matriz>>,
    key: string,
    value: string,
  ) => setter((current) => ({ ...current, [key]: value }));

  const avisar = (title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(message);
      return;
    }
    Alert.alert(title, message);
  };

  const agregarElemento = (tipo: "planta" | "producto") => {
    const esPlanta = tipo === "planta";
    const nombre = normalizarNombre(esPlanta ? nuevaPlanta : nuevoProducto);
    const items = esPlanta ? plantas : productos;
    const limite = esPlanta ? MAX_PLANTAS : MAX_PRODUCTOS;

    if (!nombre) {
      avisar("Nombre requerido", `Escribe el nombre de ${esPlanta ? "la planta" : "el producto"}.`);
      return;
    }
    if (!esPlanta && nombre === "PLANTA") {
      avisar("Nombre no disponible", "Usa un nombre de producto diferente a PLANTA.");
      return;
    }
    if (items.includes(nombre)) {
      avisar("Nombre repetido", `${nombre} ya está en la tabla.`);
      return;
    }
    if (items.length >= limite) {
      avisar(
        "Límite alcanzado",
        `Puedes tener hasta ${limite} ${esPlanta ? "plantas" : "productos"}.`,
      );
      return;
    }

    if (esPlanta) {
      setPlantas((current) => [...current, nombre]);
      setNuevaPlanta("");
    } else {
      setProductos((current) => [...current, nombre]);
      setNuevoProducto("");
    }
  };

  const eliminarElemento = (tipo: "planta" | "producto", nombre: string) => {
    const esPlanta = tipo === "planta";
    const items = esPlanta ? plantas : productos;
    if (items.length <= 1) {
      avisar(
        "No se puede eliminar",
        `La tabla debe conservar al menos ${esPlanta ? "una planta" : "un producto"}.`,
      );
      return;
    }

    const remove = () => {
      const shouldRemove = esPlanta
        ? (key: string) => key.startsWith(`${nombre}::`)
        : (key: string) => key.endsWith(`::${nombre}`);

      if (esPlanta) {
        setPlantas((current) => current.filter((item) => item !== nombre));
      } else {
        setProductos((current) => current.filter((item) => item !== nombre));
      }
      setCompras((current) => filtrarClaves(current, shouldRemove));
      setUtilidades((current) => filtrarClaves(current, shouldRemove));
      setColores((current) => filtrarClaves(current, shouldRemove));
    };

    const message = `¿Deseas eliminar ${nombre} y todos sus valores de la tabla?`;
    if (Platform.OS === "web") {
      if (window.confirm(message)) remove();
      return;
    }
    Alert.alert("Eliminar de la tabla", message, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: remove },
    ]);
  };

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

  const outputValueColumnWidth = Math.max(150, 760 / productos.length);
  const previewWidth = Math.max(
    948,
    48 + 140 + productos.length * outputValueColumnWidth,
  );

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

          <TableStructureManager
            nuevaPlanta={nuevaPlanta}
            nuevoProducto={nuevoProducto}
            plantasDisponibles={plantas}
            productosDisponibles={productos}
            onChangePlanta={setNuevaPlanta}
            onChangeProducto={setNuevoProducto}
            onAddPlanta={() => agregarElemento("planta")}
            onAddProducto={() => agregarElemento("producto")}
            onRemovePlanta={(planta) => eliminarElemento("planta", planta)}
            onRemoveProducto={(producto) =>
              eliminarElemento("producto", producto)
            }
          />

          <PriceEditor
            title="1. PRECIOS DE COMPRA SIN PERCEPCIÓN"
            subtitle="Ingresa el precio de compra por galón, incluido el IGV y sin percepción."
            plantas={plantas}
            productos={productos}
            values={compras}
            onChange={(key, value) => updateCell(setCompras, key, value)}
          />

          <PriceEditor
            title="2. UTILIDAD"
            subtitle="Ingresa la utilidad antes del IGV para cada producto."
            plantas={plantas}
            productos={productos}
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
            <View
              ref={previewRef}
              collapsable={false}
              style={[styles.previewCard, { width: previewWidth }]}
            >
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>Lista de precios vigentes:</Text>
                <Text style={styles.previewDate}>{fechaActual()}</Text>
                <Image
                  source={LOGO_SOURCE}
                  style={styles.previewLogo}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.priceLegend}>
                <Text style={styles.priceLegendText}>
                  <Text style={styles.priceLegendCode}>SIN P.</Text> Sin percepción
                </Text>
                <View style={styles.priceLegendDivider} />
                <Text style={styles.priceLegendText}>
                  <Text style={styles.priceLegendCode}>CON P.</Text> Con percepción
                </Text>
              </View>

              <PriceTable
                plantas={plantasConPrecios}
                productos={productos}
                valueColumnWidth={outputValueColumnWidth}
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

function TableStructureManager({
  nuevaPlanta,
  nuevoProducto,
  plantasDisponibles,
  productosDisponibles,
  onChangePlanta,
  onChangeProducto,
  onAddPlanta,
  onAddProducto,
  onRemovePlanta,
  onRemoveProducto,
}: {
  nuevaPlanta: string;
  nuevoProducto: string;
  plantasDisponibles: string[];
  productosDisponibles: string[];
  onChangePlanta: (value: string) => void;
  onChangeProducto: (value: string) => void;
  onAddPlanta: () => void;
  onAddProducto: () => void;
  onRemovePlanta: (value: string) => void;
  onRemoveProducto: (value: string) => void;
}) {
  return (
    <View style={styles.structureCard}>
      <Text style={styles.sectionTitle}>PERSONALIZAR TABLA</Text>
      <Text style={styles.helper}>
        Agrega o elimina plantas y productos; los cambios se aplican en compra, utilidad y en la imagen final.
      </Text>
      <View style={styles.structureGrid}>
        <StructureGroup
          label="AGREGAR PLANTA"
          placeholder="Nombre de la planta"
          value={nuevaPlanta}
          items={plantasDisponibles}
          onChange={onChangePlanta}
          onAdd={onAddPlanta}
          onRemove={onRemovePlanta}
        />
        <StructureGroup
          label="AGREGAR PRODUCTO"
          placeholder="Nombre del producto"
          value={nuevoProducto}
          items={productosDisponibles}
          onChange={onChangeProducto}
          onAdd={onAddProducto}
          onRemove={onRemoveProducto}
        />
      </View>
    </View>
  );
}

function StructureGroup({
  label,
  placeholder,
  value,
  items,
  onChange,
  onAdd,
  onRemove,
}: {
  label: string;
  placeholder: string;
  value: string;
  items: string[];
  onChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (value: string) => void;
}) {
  return (
    <View style={styles.structureGroup}>
      <Text style={styles.structureLabel}>{label}</Text>
      <View style={styles.structureInputRow}>
        <TextInput
          accessibilityLabel={placeholder}
          autoCapitalize="characters"
          maxLength={28}
          onChangeText={onChange}
          onSubmitEditing={onAdd}
          placeholder={placeholder}
          placeholderTextColor="#6e726f"
          returnKeyType="done"
          style={styles.structureInput}
          value={value}
        />
        <TouchableOpacity
          accessibilityLabel={label}
          accessibilityRole="button"
          onPress={onAdd}
          style={styles.addItemButton}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addItemText}>AGREGAR</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.activeItemsLabel}>ACTIVOS EN LA TABLA</Text>
      <View style={styles.customItemsRow}>
        {items.map((item) => (
          <View key={item} style={styles.customItemChip}>
            <Text style={styles.customItemText}>{item}</Text>
            <TouchableOpacity
              accessibilityLabel={`Eliminar ${item}`}
              accessibilityRole="button"
              onPress={() => onRemove(item)}
              style={styles.removeItemButton}
            >
              <Ionicons name="close" size={16} color="#f5b7b7" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
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

function PriceEditor({
  title,
  subtitle,
  plantas,
  productos,
  values,
  onChange,
}: {
  title: string;
  subtitle: string;
  plantas: string[];
  productos: string[];
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
            {productos.map((producto) => (
              <Text key={producto} style={[styles.tableHeader, styles.editorValueCell]}>{producto}</Text>
            ))}
          </View>
          {plantas.map((planta, index) => (
            <View key={planta} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlternate]}>
              <View style={[styles.plantName, styles.editorPlantCell]}>
                <Text style={styles.plantNameText}>{planta}</Text>
              </View>
              {productos.map((producto) => {
                const key = keyFor(planta, producto);
                return (
                  <TextInput
                    key={key}
                    accessibilityLabel={`${title}: ${planta}, ${producto}`}
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
  productos,
  valueColumnWidth,
  values,
  colors,
  onPaint,
}: {
  plantas: string[];
  productos: string[];
  valueColumnWidth: number;
  values: Record<string, PreciosVenta>;
  colors: Matriz;
  onPaint: (key: string) => void;
}) {
  return (
    <View>
      <View style={styles.outputRow}>
        <Text style={[styles.outputHeader, styles.outputPlantCell]}>PLANTA</Text>
        {productos.map((producto) => (
          <Text
            key={producto}
            style={[styles.outputHeader, { width: valueColumnWidth }]}
          >
            {producto}
          </Text>
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
            {productos.map((producto) => {
              const key = keyFor(planta, producto);
              const value = values[key];
              const hasPrice = value?.sinPercepcion > 0;

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
                    { width: valueColumnWidth },
                    colors[key] ? { backgroundColor: colors[key] } : null,
                  ]}
                >
                  {hasPrice ? (
                    <View style={styles.outputPricePair}>
                      <View style={styles.outputPriceLine}>
                        <Text style={styles.outputPriceLabel}>SIN P.</Text>
                        <Text style={styles.outputPriceNumber}>
                          {value.sinPercepcion.toFixed(4)}
                        </Text>
                      </View>
                      <View style={styles.outputPriceDivider} />
                      <View style={styles.outputPriceLine}>
                        <Text style={styles.outputPriceLabel}>CON P.</Text>
                        <Text style={styles.outputPriceNumber}>
                          {value.conPercepcion.toFixed(4)}
                        </Text>
                      </View>
                    </View>
                  ) : null}
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
  card: { backgroundColor: "#222523", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#353a37" },
  messageCard: { backgroundColor: "#222523", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#353a37" },
  structureCard: { backgroundColor: "#222523", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#353a37" },
  structureGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  structureGroup: { flex: 1, minWidth: 280, borderRadius: 12, backgroundColor: "#191b1a", borderWidth: 1, borderColor: "#343936", padding: 12, gap: 9 },
  structureLabel: { color: "#d8ddda", fontSize: 11, fontWeight: "800" },
  structureInputRow: { flexDirection: "row", gap: 8 },
  structureInput: { flex: 1, minWidth: 120, minHeight: 44, borderRadius: 8, backgroundColor: "#101110", color: "#fff", borderWidth: 1, borderColor: "#454b47", paddingHorizontal: 11, fontSize: 12 },
  addItemButton: { minHeight: 44, minWidth: 108, borderRadius: 8, backgroundColor: "#1D9E75", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 10 },
  addItemText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  customItemsRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  activeItemsLabel: {
    color: "#7f8782",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginTop: 2,
  },
  customItemChip: { minHeight: 30, maxWidth: "100%", borderRadius: 15, backgroundColor: "#303532", borderWidth: 1, borderColor: "#484f4b", flexDirection: "row", alignItems: "center", gap: 5, paddingLeft: 11, paddingRight: 5 },
  customItemText: { flexShrink: 1, color: "#fff", fontSize: 10, fontWeight: "700" },
  removeItemButton: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#4b2629", alignItems: "center", justifyContent: "center" },
  paletteCard: { backgroundColor: "#222523", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#353a37" },
  paletteRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12 },
  colorSwatch: { width: 48, height: 48, borderRadius: 12, borderWidth: 2, borderColor: "#555", alignItems: "center", justifyContent: "center" },
  colorSwatchActive: { borderColor: "#fff", borderWidth: 4 },
  eraseColorButton: { minHeight: 48, paddingHorizontal: 16, borderRadius: 10, borderWidth: 2, borderColor: "#555", backgroundColor: "#171717", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  eraseColorButtonActive: { borderColor: "#fff" },
  eraseColorText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  sectionTitle: { color: "#fff", fontSize: 15, fontWeight: "800", marginBottom: 5 },
  helper: { color: "#aaa", fontSize: 12, lineHeight: 18, marginBottom: 12 },
  tableRow: { flexDirection: "row" },
  tableScrollContent: { flexGrow: 1, minWidth: 850 },
  editorTable: { flex: 1, borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: "#4a4f4c" },
  editorPlantCell: { flex: 0.78, minWidth: 130 },
  editorValueCell: { flex: 1, minWidth: 180 },
  tableRowAlternate: { backgroundColor: "#1b1e1c" },
  tableHeader: { backgroundColor: "#090a09", color: "#fff", borderWidth: 0.5, borderColor: "#4a4f4c", paddingVertical: 12, paddingHorizontal: 9, textAlign: "center", fontSize: 11, fontWeight: "800" },
  plantName: { backgroundColor: "#343835", borderWidth: 0.5, borderColor: "#4a4f4c", paddingHorizontal: 12, paddingVertical: 14, justifyContent: "center" },
  plantNameText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  cellInput: { backgroundColor: "transparent", color: "#fff", borderWidth: 0.5, borderColor: "#4a4f4c", paddingHorizontal: 10, paddingVertical: 11, textAlign: "center", fontSize: 13 },
  previewScrollContent: { minWidth: "100%", justifyContent: "center" },
  previewCard: { width: 948, backgroundColor: "#f8f8f8", borderRadius: 10, borderWidth: 1, borderColor: "#d5d5d5", padding: 24, gap: 20 },
  previewHeader: { height: 78, flexDirection: "row", alignItems: "center" },
  previewTitle: { flex: 1, color: "#111", fontSize: 20, fontWeight: "800" },
  previewDate: { width: 180, color: "#111", fontSize: 20, textAlign: "center" },
  previewLogo: { width: 120, height: 78 },
  priceLegend: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 14, paddingRight: 4 },
  priceLegendText: { color: "#333", fontSize: 12 },
  priceLegendCode: { fontWeight: "700" },
  priceLegendDivider: { width: 1, height: 14, backgroundColor: "#c7c7c7" },
  outputPlantCell: { width: 140 },
  outputRow: { flexDirection: "row" },
  outputHeader: { backgroundColor: "#050505", color: "#fff", borderWidth: 0.5, borderColor: "#222", paddingVertical: 12, paddingHorizontal: 8, textAlign: "center", fontSize: 12, fontWeight: "800" },
  outputCell: { minHeight: 76, borderWidth: 0.5, borderColor: "#222", paddingVertical: 8, paddingHorizontal: 10, alignItems: "center", justifyContent: "center" },
  outputPlant: { backgroundColor: "#bbb7b7" },
  outputValue: { backgroundColor: "#fff" },
  outputPlantText: { color: "#111", textAlign: "center", fontSize: 14 },
  outputPricePair: { width: "100%" },
  outputPriceLine: { minHeight: 27, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  outputPriceDivider: { height: 1, backgroundColor: "#d6d6d6" },
  outputPriceLabel: { color: "#303030", fontSize: 11, fontWeight: "600" },
  outputPriceNumber: { color: "#111", fontSize: 14, fontWeight: "400", fontVariant: ["tabular-nums"] },
  noteEditor: { minHeight: 44, borderRadius: 8, backgroundColor: "#171717", color: "#fff", borderWidth: 1, borderColor: "#4a4a4a", paddingHorizontal: 12, fontWeight: "700" },
  clientNote: { minHeight: 34, color: "#111", paddingTop: 6, fontWeight: "700", fontSize: 15 },
  exportButton: { height: 52, backgroundColor: "#1D9E75", borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  exportText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  clearButton: { height: 48, backgroundColor: "#b4232c", borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  clearText: { color: "#fff", fontSize: 13, fontWeight: "800" },
});
