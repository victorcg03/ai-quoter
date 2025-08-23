import {
  pdf,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

/**
 * makePdfBuffer
 * Entrada:
 * {
 *   proposal: { items, subtotal, iva, total, notes? },
 *   client: { name }, brand?, meta?,
 *   // NUEVO opcional:
 *   annualMin?: number, annualMax?: number, annualLabel?: string
 * }
 */
export async function makePdfBuffer({
  proposal,
  client,
  brand,
  meta,
  annualMin,
  annualMax,
  annualLabel,
}: any): Promise<Uint8Array> {
  const theme = {
    color: brand?.color || "#111827",
    text: "#111827",
    muted: "#6B7280",
    border: "#E5E7EB",
    bgLight: "#F9FAFB",
  };

  const styles = StyleSheet.create({
    page: {
      padding: 32,
      fontSize: 11,
      color: theme.text,
      fontFamily: "Helvetica",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 18,
    },
    brandLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
    logo: { width: 36, height: 36, borderRadius: 6 },
    brandName: { fontSize: 16, fontWeight: 700, color: theme.color },
    title: { fontSize: 18, fontWeight: 700, marginTop: 6 },
    meta: { marginTop: 4, color: theme.muted },
    card: {
      marginTop: 14,
      border: `1pt solid ${theme.border}`,
      borderRadius: 8,
      padding: 12,
      backgroundColor: "#fff",
    },
    rowHead: {
      flexDirection: "row",
      backgroundColor: theme.bgLight,
      borderBottom: `1pt solid ${theme.border}`,
    },
    row: { flexDirection: "row", borderBottom: `1pt solid ${theme.border}` },
    colDesc: { flex: 1, padding: 8 },
    colType: { width: 90, padding: 8, textAlign: "center", color: theme.muted },
    colPrice: { width: 100, padding: 8, textAlign: "right" },
    totalsBox: {
      marginTop: 10,
      marginLeft: "auto",
      width: 260,
      border: `1pt solid ${theme.border}`,
      borderRadius: 8,
      padding: 10,
      backgroundColor: "#fff",
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginVertical: 2,
    },
    totalStrong: { fontWeight: 700 },
    notes: { marginTop: 12, fontSize: 10, color: theme.muted, lineHeight: 1.4 },
    footer: {
      position: "absolute",
      bottom: 20,
      left: 32,
      right: 32,
      fontSize: 9,
      color: theme.muted,
      flexDirection: "row",
      justifyContent: "space-between",
    },
  });

  const fmt = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
  const fmtDate = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleDateString("es-ES")
      : new Date().toLocaleDateString("es-ES");

  const items = proposal?.items || proposal?.lines || [];
  const subtotal = proposal?.subtotal ?? 0;
  const iva = proposal?.iva ?? Math.round(subtotal * 0.21);
  const total = proposal?.total ?? subtotal + iva;

  const Doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandLeft}>
            {brand?.logoUrl ? (
              <Image src={brand.logoUrl} style={styles.logo} />
            ) : (
              <View style={[styles.logo, { backgroundColor: theme.color }]} />
            )}
            <View>
              <Text style={styles.brandName}>{brand?.name || "Tu Marca"}</Text>
              {(brand?.email || brand?.phone || brand?.website) && (
                <Text style={{ color: theme.muted }}>
                  {[brand?.email, brand?.phone, brand?.website]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              )}
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.title}>Propuesta Web</Text>
            <Text style={styles.meta}>
              {client?.name || "Cliente"} · {fmtDate()}
            </Text>
            {meta?.quoteId && (
              <Text style={styles.meta}>Ref: {meta.quoteId}</Text>
            )}
            <Text style={styles.meta}>
              Validez: {fmtDate(meta?.validUntil) || "15 días"}
            </Text>
          </View>
        </View>

        {/* Tabla de partidas */}
        <View style={styles.card}>
          <View style={styles.rowHead}>
            <Text style={[styles.colDesc, { fontWeight: 700 }]}>Concepto</Text>
            <Text style={[styles.colType, { fontWeight: 700 }]}>Tipo</Text>
            <Text style={[styles.colPrice, { fontWeight: 700 }]}>Importe</Text>
          </View>
          {items.map((it: any) => (
            <View key={it.id} style={styles.row}>
              <Text style={styles.colDesc}>{it.title}</Text>
              <Text style={styles.colType}>
                {it.type === "custom" ? "Extra" : "Catálogo"}
              </Text>
              <Text style={styles.colPrice}>{fmt.format(it.amount ?? 0)}</Text>
            </View>
          ))}
        </View>

        {/* Totales */}
        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{fmt.format(subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>IVA (21%)</Text>
            <Text>{fmt.format(iva)}</Text>
          </View>
          <View style={[styles.totalRow, styles.totalStrong]}>
            <Text>Total</Text>
            <Text>{fmt.format(total)}</Text>
          </View>
        </View>

        {/* 🔥 NUEVO: Coste anual */}
        {(annualMin ?? 0) > 0 && (
          <View style={styles.card}>
            <Text style={{ fontWeight: 700, marginBottom: 6 }}>
              Coste anual estimado (no incluido en el total)
            </Text>
            <Text>
              {(annualLabel as string) || "Dominio, hosting y mantenimiento"}:{" "}
              {fmt.format(annualMin)} – {fmt.format(annualMax)} / año. El
              dominio es el nombre de la web (p. ej. tuacademia.com). Incluye
              alojamiento y mantenimiento (actualizaciones y soporte).
            </Text>
          </View>
        )}

        {/* Notas / Alcance */}
        {proposal?.notes && (
          <View style={styles.card}>
            <Text style={{ fontWeight: 700, marginBottom: 6 }}>Notas</Text>
            <Text style={styles.notes}>{proposal.notes}</Text>
          </View>
        )}

        <View style={styles.notes}>
          <Text>
            Alcance: incluye las partidas listadas. No incluye dominio/hosting
            salvo indicación. Cambios de alcance se presupuestan aparte.
          </Text>
          <Text>
            Plazos estimados y plan de pagos se confirmarán tras la aceptación.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text>
            {brand?.name || "Tu Marca"} — {brand?.website || ""}
          </Text>
          <Text
            render={({ pageNumber, totalPages }: any) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );

  const blob = await pdf(Doc).toBlob();
  const ab = await blob.arrayBuffer();
  return new Uint8Array(ab);
}
