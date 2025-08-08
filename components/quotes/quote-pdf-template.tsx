"use client"

import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer'
import type { Quote } from '@/types/quotes'

// Register fonts for better typography
Font.register({
  family: 'Inter',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff2',
      fontWeight: 400,
    },
    {
      src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hjp-Ek-_EeA.woff2',
      fontWeight: 600,
    },
    {
      src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hjp-Ek-_EeA.woff2',
      fontWeight: 700,
    },
  ],
})

// Minimal, clean styles
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    padding: 40,
    backgroundColor: '#FFFFFF',
  },
  // Header section
  header: {
    marginBottom: 40,
  },
  logo: {
    fontSize: 24,
    fontWeight: 700,
    color: '#0F172A',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 10,
    color: '#64748B',
    letterSpacing: 0.5,
  },
  // Quote title section
  quoteTitle: {
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  quoteNumber: {
    fontSize: 28,
    fontWeight: 700,
    color: '#0F172A',
    marginBottom: 8,
  },
  quoteDate: {
    fontSize: 11,
    color: '#64748B',
  },
  // Two column layout
  infoSection: {
    flexDirection: 'row',
    marginBottom: 40,
    gap: 40,
  },
  infoColumn: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  companyName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#0F172A',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 11,
    color: '#475569',
    marginBottom: 3,
  },
  // Items table
  itemsSection: {
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#0F172A',
    paddingBottom: 10,
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  colDescription: {
    flex: 3,
  },
  colQuantity: {
    flex: 1,
    textAlign: 'right',
  },
  colPrice: {
    flex: 1.2,
    textAlign: 'right',
  },
  colTotal: {
    flex: 1.3,
    textAlign: 'right',
  },
  tableHeaderText: {
    fontSize: 10,
    fontWeight: 600,
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemName: {
    fontSize: 11,
    fontWeight: 600,
    color: '#0F172A',
    marginBottom: 2,
  },
  itemCode: {
    fontSize: 9,
    color: '#64748B',
  },
  tableText: {
    fontSize: 11,
    color: '#475569',
  },
  // Totals section
  totalsSection: {
    marginTop: 20,
    marginLeft: 'auto',
    width: 250,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  totalLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  totalValue: {
    fontSize: 11,
    color: '#475569',
    fontWeight: 600,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#0F172A',
  },
  grandTotalLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: '#0F172A',
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: 700,
    color: '#0F172A',
  },
  // Notes section
  notesSection: {
    marginTop: 40,
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 4,
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 1.6,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 9,
    color: '#94A3B8',
  },
  pageNumber: {
    fontSize: 9,
    color: '#94A3B8',
  },
  // Validity badge
  validityBadge: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 3,
    borderLeftColor: '#22C55E',
  },
  validityText: {
    fontSize: 10,
    color: '#15803D',
  },
})

interface QuotePDFTemplateProps {
  quote: Quote
  companyInfo?: {
    name: string
    address?: string
    city?: string
    taxNumber?: string
    email?: string
    phone?: string
  }
}

export const QuotePDFTemplate: React.FC<QuotePDFTemplateProps> = ({ 
  quote, 
  companyInfo = {
    name: 'Vaša Kompanija',
    address: 'Adresa bb',
    city: 'Podgorica, 81000',
    taxNumber: '12345678',
    email: 'info@kompanija.me',
    phone: '+382 20 123 456'
  }
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('sr-RS', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })
  }

  const formatCurrency = (amount: number) => {
    return `€${amount.toLocaleString('sr-RS', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>{companyInfo.name}</Text>
          <Text style={styles.tagline}>PROFESIONALNE USLUGE • KVALITET • POVJERENJE</Text>
        </View>

        {/* Quote Title */}
        <View style={styles.quoteTitle}>
          <Text style={styles.quoteNumber}>Ponuda #{quote.quote_number}</Text>
          <Text style={styles.quoteDate}>
            Datum izdavanja: {formatDate(quote.quote_date)}
          </Text>
        </View>

        {/* Company Info - Two Columns */}
        <View style={styles.infoSection}>
          {/* From Column */}
          <View style={styles.infoColumn}>
            <Text style={styles.infoTitle}>Izdavalac</Text>
            <Text style={styles.companyName}>{companyInfo.name}</Text>
            <Text style={styles.infoText}>{companyInfo.address}</Text>
            <Text style={styles.infoText}>{companyInfo.city}</Text>
            <Text style={styles.infoText}>PIB: {companyInfo.taxNumber}</Text>
            <Text style={styles.infoText}>{companyInfo.email}</Text>
            <Text style={styles.infoText}>{companyInfo.phone}</Text>
          </View>

          {/* To Column */}
          <View style={styles.infoColumn}>
            <Text style={styles.infoTitle}>Klijent</Text>
            <Text style={styles.companyName}>
              {(quote.company as any)?.name || 'N/A'}
            </Text>
            {(quote.company as any)?.tax_number && (
              <Text style={styles.infoText}>
                PIB: {(quote.company as any).tax_number}
              </Text>
            )}
            {quote.contact_person && (
              <>
                <Text style={styles.infoText}>
                  {quote.contact_person.first_name} {quote.contact_person.last_name}
                </Text>
                {quote.contact_person.email && (
                  <Text style={styles.infoText}>{quote.contact_person.email}</Text>
                )}
              </>
            )}
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.itemsSection}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colDescription]}>OPIS</Text>
            <Text style={[styles.tableHeaderText, styles.colQuantity]}>KOL.</Text>
            <Text style={[styles.tableHeaderText, styles.colPrice]}>CIJENA</Text>
            <Text style={[styles.tableHeaderText, styles.colTotal]}>UKUPNO</Text>
          </View>

          {/* Table Rows */}
          {quote.quote_items?.map((item, index) => (
            <View key={item.id || index} style={styles.tableRow}>
              <View style={styles.colDescription}>
                <Text style={styles.itemName}>{item.description}</Text>
                {item.product && (
                  <Text style={styles.itemCode}>Šifra: {item.product.code}</Text>
                )}
              </View>
              <Text style={[styles.tableText, styles.colQuantity]}>
                {item.quantity.toFixed(2)}
              </Text>
              <Text style={[styles.tableText, styles.colPrice]}>
                {formatCurrency(item.unit_price)}
              </Text>
              <Text style={[styles.tableText, styles.colTotal]}>
                {formatCurrency(item.line_total)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Osnova:</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(quote.subtotal || 0)}
            </Text>
          </View>
          
          {quote.discount_amount && quote.discount_amount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                Popust ({quote.discount_percentage}%):
              </Text>
              <Text style={styles.totalValue}>
                -{formatCurrency(quote.discount_amount)}
              </Text>
            </View>
          )}
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>PDV (21%):</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(quote.vat_amount || 0)}
            </Text>
          </View>
          
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>UKUPNO:</Text>
            <Text style={styles.grandTotalValue}>
              {formatCurrency(quote.total_amount || 0)}
            </Text>
          </View>
        </View>

        {/* Validity */}
        {quote.valid_until && (
          <View style={styles.validityBadge}>
            <Text style={styles.validityText}>
              Ponuda važi do: {formatDate(quote.valid_until)}
            </Text>
          </View>
        )}

        {/* Notes */}
        {quote.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Napomene</Text>
            <Text style={styles.notesText}>{quote.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>
              Hvala vam na povjerenju i saradnji
            </Text>
            <Text style={styles.pageNumber}>
              Stranica 1 od 1
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}