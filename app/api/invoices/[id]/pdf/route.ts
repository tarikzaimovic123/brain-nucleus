import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToStream } from '@react-pdf/renderer'
import React from 'react'
import InvoicePDF from '@/lib/pdf/invoice-pdf'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Fetch invoice with all related data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        company:companies!company_id (
          name,
          tax_number,
          vat_number,
          address,
          city,
          postal_code,
          phone,
          email
        ),
        invoice_items (
          description,
          quantity,
          unit_price,
          vat_rate,
          line_total,
          vat_amount,
          total_with_vat
        )
      `)
      .eq('id', params.id)
      .single()

    if (invoiceError || !invoice) {
      console.error('Invoice fetch error:', invoiceError)
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Fetch seller info from settings
    const { data: settings } = await supabase
      .from('invoice_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'company_name',
        'company_address',
        'company_city',
        'company_postal_code',
        'company_tax_number',
        'company_vat_number',
        'company_phone',
        'company_email',
        'bank_name',
        'bank_account',
        'bank_swift'
      ])

    // Transform settings to seller object
    const sellerInfo = settings?.reduce((acc: any, setting) => {
      const key = setting.setting_key.replace('company_', '').replace('bank_', '')
      acc[key] = setting.setting_value
      return acc
    }, {}) || {}

    const seller = {
      name: sellerInfo.name || 'Vaša Kompanija DOO',
      tax_number: sellerInfo.tax_number,
      vat_number: sellerInfo.vat_number,
      address: sellerInfo.address,
      city: sellerInfo.city,
      postal_code: sellerInfo.postal_code,
      phone: sellerInfo.phone,
      email: sellerInfo.email,
      bank_name: sellerInfo.name || 'Prva Banka Crne Gore',
      bank_account: sellerInfo.account,
      bank_swift: sellerInfo.swift
    }

    // Prepare invoice data for PDF
    const invoiceData = {
      ...invoice,
      items: invoice.invoice_items,
      seller
    }

    // Generate PDF stream
    const stream = await renderToStream(React.createElement(InvoicePDF, { invoice: invoiceData }))
    const chunks: Uint8Array[] = []
    
    // Read stream into buffer
    const reader = stream.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
    
    // Combine chunks into single buffer
    const pdfBuffer = Buffer.concat(chunks)

    // Return PDF response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="faktura-${invoice.invoice_number}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}