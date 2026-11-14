import "server-only";
import path from "node:path";
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { ClientReport } from "./data-report";

// Polices de la charte, livrées avec l'application (licence OFL dans assets/fonts).
const fonts = path.join(process.cwd(), "assets/fonts");
Font.register({
  family: "Figtree",
  fonts: [
    { src: path.join(fonts, "figtree-latin-400-normal.woff"), fontWeight: 400 },
    { src: path.join(fonts, "figtree-latin-600-normal.woff"), fontWeight: 600 },
  ],
});
Font.register({ family: "Sora", src: path.join(fonts, "sora-latin-600-normal.woff"), fontWeight: 600 });
Font.registerHyphenationCallback((word) => [word]);

const C = { ink: "#12202b", muted: "#556673", line: "#e2e7ec", azur: "#1663a6", azurSoft: "#eef4fb", soleilSoft: "#fdf1d3", soleilInk: "#6b4a00", valide: "#1a6b43" };

const s = StyleSheet.create({
  page: { paddingTop: 44, paddingBottom: 64, paddingHorizontal: 44, fontFamily: "Figtree", fontSize: 10.5, color: C.ink, lineHeight: 1.45 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 24 },
  brand: { flexDirection: "row", alignItems: "center", gap: 12, maxWidth: 300 },
  logo: { maxWidth: 120, maxHeight: 52, objectFit: "contain" },
  companyName: { fontFamily: "Sora", fontWeight: 600, fontSize: 14 },
  small: { fontSize: 9, color: C.muted },
  kicker: { fontSize: 8.5, fontWeight: 600, letterSpacing: 1.2, color: C.azur, textAlign: "right" },
  title: { fontFamily: "Sora", fontWeight: 600, fontSize: 22, marginTop: 30, letterSpacing: -0.4 },
  rule: { height: 2, width: 40, backgroundColor: C.azur, marginTop: 14, marginBottom: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", borderTopWidth: 1, borderTopColor: C.line },
  cell: { width: "50%", paddingVertical: 10, paddingRight: 12, borderBottomWidth: 1, borderBottomColor: C.line },
  label: { fontSize: 8.5, fontWeight: 600, letterSpacing: 0.8, color: C.muted, marginBottom: 2 },
  value: { fontWeight: 600 },
  section: { marginTop: 24 },
  h2: { fontFamily: "Sora", fontWeight: 600, fontSize: 12.5, marginBottom: 8 },
  task: { flexDirection: "row", gap: 8, marginBottom: 4 },
  check: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.valide, marginTop: 5.5 },
  photo: { width: 248, height: 186, objectFit: "cover", borderRadius: 6 },
  caption: { fontSize: 8.5, color: C.muted, marginTop: 3, marginBottom: 4 },
  box: { backgroundColor: C.soleilSoft, borderRadius: 8, padding: 14 },
  boxTitle: { fontWeight: 600, color: C.soleilInk, marginBottom: 4 },
  footer: { position: "absolute", bottom: 28, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: C.muted, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8 },
});

export function reportDate(iso: string | null) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso));
}

export type PdfImage = { data: Buffer; format: "jpg" | "png" };

/** Photos avant à gauche, après à droite : la comparaison se lit d'un coup d'œil. */
function Photos({ before, after }: { before: PdfImage[]; after: PdfImage[] }) {
  if (!before.length && !after.length) return null;
  const rows = Math.max(before.length, after.length);
  const cell = (img: PdfImage | undefined, label: string, i: number) => (
    <View style={{ width: 248 }}>
      {img ? (
        <>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image style={s.photo} src={img} />
          <Text style={s.caption}>{label} · {i + 1}</Text>
        </>
      ) : null}
    </View>
  );
  return (
    <View style={s.section}>
      <Text style={s.h2} minPresenceAhead={200}>Photos avant / après</Text>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 4 }}>
        <Text style={[s.label, { width: 248 }]}>AVANT</Text>
        <Text style={[s.label, { width: 248 }]}>APRÈS</Text>
      </View>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 10 }} wrap={false}>
          {cell(before[i], "Avant", i)}
          {cell(after[i], "Après", i)}
        </View>
      ))}
    </View>
  );
}

function ReportDocument({ r, logo, before, after }: { r: ClientReport; logo: PdfImage | null; before: PdfImage[]; after: PdfImage[] }) {
  const contact = [r.company.phone, r.company.address].filter(Boolean).join(" · ");
  return (
    <Document title={`Compte rendu — ${r.clientName}`} author={r.company.name} creator="Swipo" language="fr">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.brand}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            {logo && <Image style={s.logo} src={logo} />}
            <View>
              <Text style={s.companyName}>{r.company.name}</Text>
              {contact ? <Text style={s.small}>{contact}</Text> : null}
              {r.company.siret ? <Text style={s.small}>SIRET {r.company.siret}</Text> : null}
            </View>
          </View>
          <View>
            <Text style={s.kicker}>COMPTE RENDU D&apos;INTERVENTION</Text>
            <Text style={[s.small, { textAlign: "right", marginTop: 3 }]}>{reportDate(r.finishedAt ?? r.date)}</Text>
          </View>
        </View>

        <Text style={s.title}>{r.title}</Text>
        <View style={s.rule} />

        <View style={s.grid}>
          <View style={s.cell}><Text style={s.label}>CLIENT</Text><Text style={s.value}>{r.clientName}</Text></View>
          <View style={s.cell}><Text style={s.label}>DATE</Text><Text style={s.value}>{reportDate(r.finishedAt ?? r.date)}</Text></View>
          <View style={s.cell}><Text style={s.label}>ADRESSE</Text><Text style={s.value}>{r.address}</Text></View>
          <View style={s.cell}><Text style={s.label}>PRESTATION</Text><Text style={s.value}>{r.services.join(", ") || r.title}</Text></View>
        </View>

        {r.summary.trim() ? (
          <View style={s.section}>
            <Text style={s.h2}>Résumé de l&apos;intervention</Text>
            <Text>{r.summary.trim()}</Text>
          </View>
        ) : null}

        {r.tasks.length > 0 && (
          <View style={s.section}>
            <Text style={s.h2}>Travaux réalisés</Text>
            {r.tasks.map((t, i) => (
              <View key={i} style={s.task}><View style={s.check} /><Text>{t}</Text></View>
            ))}
          </View>
        )}

        <Photos before={before} after={after} />

        {r.reservations.trim() ? (
          <View style={s.section} wrap={false}>
            <View style={s.box}>
              <Text style={s.boxTitle}>Réserves</Text>
              <Text>{r.reservations.trim()}</Text>
            </View>
          </View>
        ) : null}

        <View style={s.footer} fixed>
          <Text>{r.company.name} · compte rendu établi avec Swipo</Text>
          <Text>{reportDate(r.finishedAt ?? r.date)}</Text>
        </View>
      </Page>
    </Document>
  );
}

export function renderReportPdf(r: ClientReport, logo: PdfImage | null, before: PdfImage[], after: PdfImage[]) {
  return renderToBuffer(<ReportDocument r={r} logo={logo} before={before} after={after} />);
}
