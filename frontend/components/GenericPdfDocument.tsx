import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { DocumentTemplate, FieldsBag } from "@/lib/types";
import { ATTRIBUTION, fillTemplate } from "@/lib/genericDoc";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: "Helvetica", lineHeight: 1.4 },
  title: { fontSize: 16, marginBottom: 16, textAlign: "center" },
  heading: { fontSize: 11, marginTop: 10, marginBottom: 4, fontWeight: 700 },
  paragraph: { marginBottom: 8, textAlign: "justify" },
  footer: { marginTop: 16, fontSize: 8, color: "#666666" },
});

export default function GenericPdfDocument({
  doc,
  fields,
}: {
  doc: DocumentTemplate;
  fields: FieldsBag;
}) {
  const sections = fillTemplate(doc.markdown, doc.variables, fields);

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>{doc.name}</Text>
        {sections.map((s) => (
          <View key={s.number}>
            <Text style={styles.heading}>
              {s.number}. {s.heading}
            </Text>
            {s.body ? <Text style={styles.paragraph}>{s.body}</Text> : null}
          </View>
        ))}
        <Text style={styles.footer}>{ATTRIBUTION}</Text>
      </Page>
    </Document>
  );
}
