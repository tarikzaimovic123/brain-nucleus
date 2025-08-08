"use client"

import jsPDF from 'jspdf'
import type { Quote } from '@/types/quotes'

interface GeneratePDFProps {
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

export const generateQuotePDF = ({ 
  quote, 
  companyInfo = {
    name: 'Vaša Kompanija',
    address: 'Adresa bb',
    city: 'Podgorica, 81000',
    taxNumber: '12345678',
    email: 'info@kompanija.me',
    phone: '+382 20 123 456'
  }
}: GeneratePDFProps) => {
  const doc = new jsPDF()
  
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

  // Colors
  const primaryColor = '#0F172A'
  const secondaryColor = '#64748B'
  const lightGray = '#F1F5F9'
  
  let yPosition = 20

  // Set font
  doc.setFont('helvetica')

  // Header - Company Name
  doc.setFontSize(24)
  doc.setTextColor(primaryColor)
  doc.setFont('helvetica', 'bold')
  doc.text(companyInfo.name, 20, yPosition)
  yPosition += 8

  // Tagline
  doc.setFontSize(9)
  doc.setTextColor(secondaryColor)
  doc.setFont('helvetica', 'normal')
  doc.text('PROFESIONALNE USLUGE • KVALITET • POVJERENJE', 20, yPosition)
  yPosition += 15

  // Quote Number and Date
  doc.setFontSize(22)
  doc.setTextColor(primaryColor)
  doc.setFont('helvetica', 'bold')
  doc.text(`Ponuda #${quote.quote_number}`, 20, yPosition)
  yPosition += 8

  doc.setFontSize(10)
  doc.setTextColor(secondaryColor)
  doc.setFont('helvetica', 'normal')
  doc.text(`Datum izdavanja: ${formatDate(quote.quote_date)}`, 20, yPosition)
  yPosition += 5

  // Horizontal line
  doc.setDrawColor(lightGray)
  doc.setLineWidth(0.5)
  doc.line(20, yPosition, 190, yPosition)
  yPosition += 10

  // Two columns - Company Info
  const leftColumnX = 20
  const rightColumnX = 110
  const columnStartY = yPosition

  // Left Column - Izdavalac
  doc.setFontSize(9)
  doc.setTextColor(secondaryColor)
  doc.setFont('helvetica', 'bold')
  doc.text('IZDAVALAC', leftColumnX, yPosition)
  yPosition += 6

  doc.setFontSize(12)
  doc.setTextColor(primaryColor)
  doc.text(companyInfo.name, leftColumnX, yPosition)
  yPosition += 5

  doc.setFontSize(10)
  doc.setTextColor('#475569')
  doc.setFont('helvetica', 'normal')
  doc.text(companyInfo.address || '', leftColumnX, yPosition)
  yPosition += 4
  doc.text(companyInfo.city || '', leftColumnX, yPosition)
  yPosition += 4
  doc.text(`PIB: ${companyInfo.taxNumber}`, leftColumnX, yPosition)
  yPosition += 4
  doc.text(companyInfo.email || '', leftColumnX, yPosition)
  yPosition += 4
  doc.text(companyInfo.phone || '', leftColumnX, yPosition)

  // Right Column - Klijent
  yPosition = columnStartY
  doc.setFontSize(9)
  doc.setTextColor(secondaryColor)
  doc.setFont('helvetica', 'bold')
  doc.text('KLIJENT', rightColumnX, yPosition)
  yPosition += 6

  doc.setFontSize(12)
  doc.setTextColor(primaryColor)
  doc.text((quote.company as any)?.name || 'N/A', rightColumnX, yPosition)
  yPosition += 5

  doc.setFontSize(10)
  doc.setTextColor('#475569')
  doc.setFont('helvetica', 'normal')
  
  if ((quote.company as any)?.tax_number) {
    doc.text(`PIB: ${(quote.company as any).tax_number}`, rightColumnX, yPosition)
    yPosition += 4
  }
  
  if (quote.contact_person) {
    doc.text(
      `${quote.contact_person.first_name} ${quote.contact_person.last_name}`,
      rightColumnX,
      yPosition
    )
    yPosition += 4
    if (quote.contact_person.email) {
      doc.text(quote.contact_person.email, rightColumnX, yPosition)
    }
  }

  yPosition = Math.max(yPosition, columnStartY + 35) + 10

  // Items Table Header
  doc.setFillColor(primaryColor)
  doc.rect(20, yPosition, 170, 8, 'F')
  
  doc.setFontSize(9)
  doc.setTextColor('#FFFFFF')
  doc.setFont('helvetica', 'bold')
  doc.text('OPIS', 22, yPosition + 5.5)
  doc.text('KOL.', 120, yPosition + 5.5)
  doc.text('CIJENA', 140, yPosition + 5.5)
  doc.text('UKUPNO', 165, yPosition + 5.5)
  yPosition += 10

  // Items
  doc.setTextColor('#475569')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)

  let subtotal = 0
  quote.quote_items?.forEach((item) => {
    // Item description
    doc.setFont('helvetica', 'bold')
    doc.text(item.description, 22, yPosition + 4)
    
    // Item details
    doc.setFont('helvetica', 'normal')
    doc.text(item.quantity.toFixed(2), 120, yPosition + 4)
    doc.text(formatCurrency(item.unit_price), 140, yPosition + 4)
    doc.text(formatCurrency(item.line_total), 165, yPosition + 4)
    
    // Product code if exists
    if (item.product) {
      doc.setFontSize(8)
      doc.setTextColor(secondaryColor)
      doc.text(`Šifra: ${item.product.code}`, 22, yPosition + 8)
      yPosition += 4
    }
    
    subtotal += item.line_total
    yPosition += 8
    
    // Horizontal line between items
    doc.setDrawColor(lightGray)
    doc.setLineWidth(0.2)
    doc.line(20, yPosition, 190, yPosition)
    yPosition += 2
  })

  yPosition += 5

  // Totals
  const totalsX = 140
  
  // Subtotal
  doc.setFontSize(10)
  doc.setTextColor(secondaryColor)
  doc.text('Osnova:', totalsX, yPosition)
  doc.setTextColor('#475569')
  doc.text(formatCurrency(quote.subtotal || 0), 165, yPosition)
  yPosition += 5

  // Discount if exists
  if (quote.discount_amount && quote.discount_amount > 0) {
    doc.setTextColor(secondaryColor)
    doc.text(`Popust (${quote.discount_percentage}%):`, totalsX, yPosition)
    doc.setTextColor('#22C55E')
    doc.text(`-${formatCurrency(quote.discount_amount)}`, 165, yPosition)
    yPosition += 5
  }

  // VAT
  doc.setTextColor(secondaryColor)
  doc.text('PDV (21%):', totalsX, yPosition)
  doc.setTextColor('#475569')
  doc.text(formatCurrency(quote.vat_amount || 0), 165, yPosition)
  yPosition += 7

  // Grand Total
  doc.setLineWidth(0.5)
  doc.setDrawColor(primaryColor)
  doc.line(totalsX - 5, yPosition - 2, 190, yPosition - 2)
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(primaryColor)
  doc.text('UKUPNO:', totalsX, yPosition + 5)
  doc.setFontSize(14)
  doc.text(formatCurrency(quote.total_amount || 0), 165, yPosition + 5)
  yPosition += 15

  // Validity
  if (quote.valid_until) {
    doc.setFillColor('#F0FDF4')
    doc.setDrawColor('#22C55E')
    doc.setLineWidth(2)
    doc.rect(20, yPosition, 170, 10, 'FD')
    
    doc.setFontSize(10)
    doc.setTextColor('#15803D')
    doc.setFont('helvetica', 'normal')
    doc.text(`Ponuda važi do: ${formatDate(quote.valid_until)}`, 25, yPosition + 7)
    yPosition += 15
  }

  // Notes
  if (quote.notes && yPosition < 250) {
    doc.setFillColor('#F8FAFC')
    doc.rect(20, yPosition, 170, 25, 'F')
    
    doc.setFontSize(9)
    doc.setTextColor(secondaryColor)
    doc.setFont('helvetica', 'bold')
    doc.text('NAPOMENE', 25, yPosition + 7)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor('#475569')
    const lines = doc.splitTextToSize(quote.notes, 160)
    doc.text(lines, 25, yPosition + 13)
  }

  // Footer
  doc.setFontSize(9)
  doc.setTextColor(secondaryColor)
  doc.setFont('helvetica', 'italic')
  doc.text('Hvala vam na povjerenju i saradnji', 20, 280)
  doc.text('Stranica 1 od 1', 165, 280)

  // Save the PDF
  doc.save(`Ponuda-${quote.quote_number}.pdf`)
}