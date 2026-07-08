import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { NDAFormData } from "@/lib/types";
import {
  ATTRIBUTION,
  SIGNATURE_FIELDS,
  TermOptionLine,
  buildStandardTermsSections,
  confidentialityTermOptionLines,
  formatDateLong,
  mndaTermOptionLines,
  signatureFieldValue,
} from "@/lib/ndaText";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: "Helvetica", lineHeight: 1.4 },
  title: { fontSize: 16, marginBottom: 16, textAlign: "center" },
  h2: { fontSize: 13, marginTop: 16, marginBottom: 8 },
  h3: { fontSize: 11, marginTop: 10, marginBottom: 4 },
  row: { flexDirection: "row", marginBottom: 4 },
  label: { width: 140 },
  value: { flex: 1 },
  termOptionLabel: { fontWeight: 700, marginBottom: 2 },
  termOptionLine: { marginBottom: 2 },
  paragraph: { marginBottom: 8, textAlign: "justify" },
  table: { marginTop: 8, marginBottom: 8 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#cccccc", paddingVertical: 4 },
  tableLabelCell: { width: 110 },
  tableCell: { flex: 1 },
  footer: { marginTop: 16, fontSize: 8, color: "#666666" },
});

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function TermOptions({ label, lines }: { label: string; lines: TermOptionLine[] }) {
  return (
    <View style={styles.row}>
      <View style={styles.label}>
        <Text style={styles.termOptionLabel}>{label}</Text>
      </View>
      <View style={styles.value}>
        {lines.map((line) => (
          <Text style={styles.termOptionLine} key={line.text}>
            {line.selected ? "☒" : "☐"} {line.text}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function NdaPdfDocument({ data }: { data: NDAFormData }) {
  const sections = buildStandardTermsSections(data);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Mutual Non-Disclosure Agreement</Text>

        <Text style={styles.h2}>Cover Page</Text>
        <Field label="Party A" value={data.partyA.companyName.trim() || "[Party A Company]"} />
        <Field label="Party B" value={data.partyB.companyName.trim() || "[Party B Company]"} />
        <Field label="Purpose" value={data.purpose.trim() || "[Purpose]"} />
        <Field label="Effective Date" value={formatDateLong(data.effectiveDate)} />
        <TermOptions label="MNDA Term" lines={mndaTermOptionLines(data)} />
        <TermOptions label="Term of Confidentiality" lines={confidentialityTermOptionLines(data)} />
        <Field label="Governing Law" value={data.governingLaw.trim() || "[Governing Law]"} />
        <Field label="Jurisdiction" value={data.jurisdiction.trim() || "[Jurisdiction]"} />
        {data.modifications ? <Field label="MNDA Modifications" value={data.modifications} /> : null}

        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabelCell} />
            <Text style={styles.tableCell}>Party A</Text>
            <Text style={styles.tableCell}>Party B</Text>
          </View>
          {SIGNATURE_FIELDS.map((row) => (
            <View style={styles.tableRow} key={row.label}>
              <Text style={styles.tableLabelCell}>{row.label}</Text>
              <Text style={styles.tableCell}>{signatureFieldValue(row, data.partyA)}</Text>
              <Text style={styles.tableCell}>{signatureFieldValue(row, data.partyB)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.h2}>Standard Terms</Text>
        {sections.map((s) => (
          <View key={s.number}>
            <Text style={styles.h3}>
              {s.number}. {s.heading}
            </Text>
            <Text style={styles.paragraph}>{s.body}</Text>
          </View>
        ))}

        <Text style={styles.footer}>{ATTRIBUTION}</Text>
      </Page>
    </Document>
  );
}
