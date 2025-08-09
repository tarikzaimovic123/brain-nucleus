import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font, Image, PDFDownloadLink } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { sr } from 'date-fns/locale'

// Register fonts for better Serbian support
Font.register({
  family: 'Roboto',
  fonts: [
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf',
      fontWeight: 400,
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf',
      fontWeight: 700,
    },
  ],
})

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Roboto',
    fontSize: 11,
    padding: 40,
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 20,
  },
  logoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  companyInfo: {
    marginBottom: 15,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 5,
    color: '#1a1a1a',
  },
  companyDetails: {
    fontSize: 10,
    color: '#666666',
    lineHeight: 1.4,
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 5,
    color: '#2563eb',
  },
  invoiceNumber: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 3,
    color: '#1a1a1a',
  },
  invoiceDate: {
    fontSize: 10,
    color: '#666666',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 10,
    color: '#1a1a1a',
    borderBottom: '1px solid #e5e5e5',
    paddingBottom: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  col: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 3,
  },
  value: {
    fontSize: 11,
    color: '#1a1a1a',
    fontWeight: 400,
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 10,
    borderBottom: '2px solid #2563eb',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 10,
    borderBottom: '1px solid #e5e5e5',
  },
  tableCol: {
    flex: 1,
  },
  tableColWide: {
    flex: 3,
  },
  tableColNarrow: {
    flex: 0.8,
    textAlign: 'right',
  },
  tableHeaderText: {
    fontSize: 10,
    fontWeight: 700,
    color: '#374151',
  },
  tableCellText: {
    fontSize: 10,
    color: '#1a1a1a',
  },
  totalsSection: {
    marginTop: 30,
    paddingTop: 20,
    borderTop: '2px solid #e5e5e5',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  totalsLabel: {
    width: 150,
    fontSize: 11,
    color: '#666666',
    textAlign: 'right',
    marginRight: 20,
  },
  totalsValue: {
    width: 100,
    fontSize: 11,
    color: '#1a1a1a',
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTop: '2px solid #2563eb',
  },
  totalLabel: {
    width: 150,
    fontSize: 14,
    fontWeight: 700,
    color: '#1a1a1a',
    textAlign: 'right',
    marginRight: 20,
  },
  totalValue: {
    width: 100,
    fontSize: 14,
    fontWeight: 700,
    color: '#2563eb',
    textAlign: 'right',
  },
  notes: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#f9fafb',
    borderRadius: 5,
  },
  notesTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 5,
    color: '#1a1a1a',
  },
  notesText: {
    fontSize: 10,
    color: '#666666',
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    paddingTop: 20,
    borderTop: '1px solid #e5e5e5',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  footerText: {
    fontSize: 9,
    color: '#999999',
  },
  bankInfo: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#eff6ff',
    borderRadius: 5,
  },
  bankTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 10,
    color: '#1e40af',
  },
  bankDetails: {
    fontSize: 10,
    color: '#1e40af',
    lineHeight: 1.5,
  },
  fiscalBadge: {
    marginTop: 10,
    padding: '5 10',
    backgroundColor: '#10b981',
    borderRadius: 3,
    alignSelf: 'flex-start',
  },
  fiscalBadgeText: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: 700,
  },
  qrCode: {
    width: 100,
    height: 100,
    marginTop: 20,
  },
})

interface InvoiceData {
  invoice_number: string
  fiscal_number?: string
  invoice_date: string
  due_date?: string
  status: string
  payment_status: string
  payment_method?: string
  subtotal: number
  vat_amount: number
  total_amount: number
  paid_amount?: number
  discount_percentage?: number
  discount_amount?: number
  notes?: string
  fiscal_verified?: boolean
  company?: {
    name: string
    tax_number?: string
    vat_number?: string
    address?: string
    city?: string
    postal_code?: string
    phone?: string
    email?: string
  }
  items?: Array<{
    description: string
    quantity: number
    unit_price: number
    vat_rate: number
    line_total: number
    vat_amount: number
    total_with_vat: number
  }>
  seller?: {
    name: string
    tax_number?: string
    vat_number?: string
    address?: string
    city?: string
    postal_code?: string
    phone?: string
    email?: string
    bank_name?: string
    bank_account?: string
    bank_swift?: string
  }
}

export const InvoicePDF: React.FC<{ invoice: InvoiceData }> = ({ invoice }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoSection}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{invoice.seller?.name || 'Vaša Kompanija DOO'}</Text>
            <Text style={styles.companyDetails}>
              {invoice.seller?.address || 'Adresa bb'}\n
              {invoice.seller?.postal_code || '81000'} {invoice.seller?.city || 'Podgorica'}\n
              PIB: {invoice.seller?.tax_number || '12345678'}\n
              PDV: {invoice.seller?.vat_number || 'ME12345678'}\n
              Tel: {invoice.seller?.phone || '+382 20 123 456'}\n
              Email: {invoice.seller?.email || 'info@kompanija.me'}
            </Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>FAKTURA</Text>
            <Text style={styles.invoiceNumber}>#{invoice.invoice_number}</Text>
            {invoice.fiscal_number && (
              <Text style={styles.invoiceDate}>Fiskalni broj: {invoice.fiscal_number}</Text>
            )}
            <Text style={styles.invoiceDate}>
              Datum: {format(new Date(invoice.invoice_date), 'dd.MM.yyyy', { locale: sr })}
            </Text>
            {invoice.due_date && (
              <Text style={styles.invoiceDate}>
                Dospeće: {format(new Date(invoice.due_date), 'dd.MM.yyyy', { locale: sr })}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Customer Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Podaci o kupcu</Text>
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Naziv</Text>
            <Text style={styles.value}>{invoice.company?.name || 'Nepoznat kupac'}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>PIB</Text>
            <Text style={styles.value}>{invoice.company?.tax_number || 'N/A'}</Text>
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Adresa</Text>
            <Text style={styles.value}>
              {invoice.company?.address || 'N/A'}
              {invoice.company?.city && `, ${invoice.company.postal_code} ${invoice.company.city}`}
            </Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Kontakt</Text>
            <Text style={styles.value}>
              {invoice.company?.phone || 'N/A'}
              {invoice.company?.email && `\n${invoice.company.email}`}
            </Text>
          </View>
        </View>
      </View>

      {/* Items Table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.tableColWide]}>Opis</Text>
          <Text style={[styles.tableHeaderText, styles.tableColNarrow]}>Količina</Text>
          <Text style={[styles.tableHeaderText, styles.tableCol]}>Cena</Text>
          <Text style={[styles.tableHeaderText, styles.tableCol]}>PDV %</Text>
          <Text style={[styles.tableHeaderText, styles.tableCol]}>Ukupno</Text>
        </View>
        {invoice.items?.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={[styles.tableCellText, styles.tableColWide]}>{item.description}</Text>
            <Text style={[styles.tableCellText, styles.tableColNarrow]}>{item.quantity}</Text>
            <Text style={[styles.tableCellText, styles.tableCol]}>€{item.unit_price.toFixed(2)}</Text>
            <Text style={[styles.tableCellText, styles.tableCol]}>{item.vat_rate}%</Text>
            <Text style={[styles.tableCellText, styles.tableCol]}>€{item.total_with_vat.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      {/* Totals */}
      <View style={styles.totalsSection}>
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>Osnova (bez PDV):</Text>
          <Text style={styles.totalsValue}>€{invoice.subtotal.toFixed(2)}</Text>
        </View>
        {invoice.discount_amount && invoice.discount_amount > 0 && (
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Popust ({invoice.discount_percentage}%):</Text>
            <Text style={[styles.totalsValue, { color: '#10b981' }]}>-€{invoice.discount_amount.toFixed(2)}</Text>
          </View>
        )}
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>PDV (21%):</Text>
          <Text style={styles.totalsValue}>€{invoice.vat_amount.toFixed(2)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>UKUPNO ZA NAPLATU:</Text>
          <Text style={styles.totalValue}>€{invoice.total_amount.toFixed(2)}</Text>
        </View>
      </View>

      {/* Bank Info */}
      <View style={styles.bankInfo}>
        <Text style={styles.bankTitle}>Podaci za plaćanje</Text>
        <Text style={styles.bankDetails}>
          Banka: {invoice.seller?.bank_name || 'Prva Banka Crne Gore'}\n
          IBAN: {invoice.seller?.bank_account || 'ME25 1234 5678 9012 3456 78'}\n
          SWIFT: {invoice.seller?.bank_swift || 'CKBCME22'}\n
          Način plaćanja: {invoice.payment_method === 'transfer' ? 'Bančni transfer' : 
                         invoice.payment_method === 'cash' ? 'Gotovina' : 
                         invoice.payment_method === 'card' ? 'Kartica' : 'Ček'}
        </Text>
      </View>

      {/* Fiscal Badge */}
      {invoice.fiscal_verified && (
        <View style={styles.fiscalBadge}>
          <Text style={styles.fiscalBadgeText}>FISKALIZOVANO</Text>
        </View>
      )}

      {/* Notes */}
      {invoice.notes && (
        <View style={styles.notes}>
          <Text style={styles.notesTitle}>Napomene</Text>
          <Text style={styles.notesText}>{invoice.notes}</Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>
            Faktura kreirana: {format(new Date(), 'dd.MM.yyyy HH:mm', { locale: sr })}
          </Text>
          <Text style={styles.footerText}>
            Strana 1 od 1
          </Text>
        </View>
        <Text style={styles.footerText}>
          Ovaj dokument je elektronski generisan i punovažan je bez pečata i potpisa.
        </Text>
      </View>
    </Page>
  </Document>
)

export default InvoicePDF