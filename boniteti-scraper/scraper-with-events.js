#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import pLimit from 'p-limit';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const CONFIG = {
  baseUrl: 'https://www.boniteti.me',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_KEY,
  maxConcurrent: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '10'),
  requestDelay: parseInt(process.env.REQUEST_DELAY_MS || '1000'),
  retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3'),
  retryDelay: parseInt(process.env.RETRY_DELAY_MS || '5000'),
  mode: process.env.MODE || 'production'
};

// Supabase client
const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);

// Rate limiter
const limit = pLimit(CONFIG.maxConcurrent);

// Emit event to parent process
function emitEvent(type, data) {
  console.log(`EVENT:${JSON.stringify({ type, ...data })}`);
}

// Delay utility
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch with retry logic
async function fetchWithRetry(url, attempts = CONFIG.retryAttempts) {
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (response.ok) {
        return await response.text();
      }
      
      if (response.status === 404) {
        throw new Error('Page not found');
      }
      
      if (i < attempts - 1) {
        await delay(CONFIG.retryDelay);
      }
    } catch (error) {
      if (i === attempts - 1) throw error;
      await delay(CONFIG.retryDelay);
    }
  }
}

// Parse registration data from company page
function parseRegistrationData($) {
  const data = {};
  
  const fields = {
    'name_short': ['Naziv skraćeni', 'Naziv'],
    'name_full': ['Naziv pun', 'Puni naziv'],
    'registration_number': ['Registarski broj', 'Matični broj'],
    'tax_number': ['PIB', 'Poreski broj'],
    'activity_code': ['Delatnost', 'Šifra delatnosti'],
    'activity_description': ['Opis delatnosti'],
    'legal_form': ['Pravni oblik', 'Oblik organizovanja'],
    'status': ['Status', 'CRPS Status'],
    'founded_date': ['Datum osnivanja'],
    'country': ['Država'],
    'region': ['Opština', 'Region'],
    'city': ['Mesto', 'Grad'],
    'address': ['Adresa'],
    'authorized_capital': ['Upisano povećanje kapitala', 'Upisani kapital'],
    'paid_capital': ['Uplaćeno povećanje kapitala', 'Uplaćeni kapital'],
    'total_capital': ['Ukupno smanjenje kapitala', 'Ukupni kapital'],
    'vat_number': ['PDV broj', 'PDV Obveznik']
  };
  
  Object.entries(fields).forEach(([key, labels]) => {
    for (const label of labels) {
      const value = $(`td:contains("${label}")`).next('td').text().trim() ||
                   $(`dt:contains("${label}")`).next('dd').text().trim() ||
                   $(`label:contains("${label}")`).next().text().trim();
      
      if (value && value !== '-' && value !== 'N/A') {
        data[key] = value;
        break;
      }
    }
  });
  
  // Parse dates
  if (data.founded_date) {
    const dateParts = data.founded_date.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (dateParts) {
      data.founded_date = `${dateParts[3]}-${dateParts[2]}-${dateParts[1]}`;
    }
  }
  
  // Parse numbers
  ['authorized_capital', 'paid_capital', 'total_capital'].forEach(field => {
    if (data[field]) {
      data[field] = parseFloat(data[field].replace(/[^\d.-]/g, '')) || null;
    }
  });
  
  return data;
}

// Parse financial indicators
function parseFinancialIndicators($, year) {
  const indicators = {};
  const yearColumn = $(`th:contains("${year}")`).index();
  if (yearColumn === -1) return null;
  
  const indicatorLabels = [
    'stalna_imovina', 'obrtna_imovina', 'ukupna_aktiva', 
    'kapital', 'poslovni_prihodi', 'neto_dobitak'
    // Simplified for demo
  ];
  
  indicatorLabels.forEach(indicator => {
    const row = $(`tr:contains("${indicator.replace(/_/g, ' ').toUpperCase()}")`);
    if (row.length) {
      const value = row.find('td').eq(yearColumn).text().trim();
      if (value && value !== '-') {
        indicators[indicator] = parseFloat(value.replace(/[^\d.-]/g, '')) || 0;
      }
    }
  });
  
  return Object.keys(indicators).length > 0 ? indicators : null;
}

// Parse business results
function parseBusinessResults($, year) {
  const results = {};
  const yearColumn = $(`th:contains("${year}")`).index();
  if (yearColumn === -1) return null;
  
  const resultFields = {
    'Poslovni prihodi': 'poslovni_prihod',
    'Neto rezultat': 'neto_rezultat',
    'Broj zaposlenih': 'broj_zaposlenih'
  };
  
  Object.entries(resultFields).forEach(([label, field]) => {
    const row = $(`tr td:contains("${label}")`).parent();
    if (row.length) {
      const value = row.find('td').eq(yearColumn).text().trim();
      if (value && value !== '-') {
        if (field === 'broj_zaposlenih') {
          results[field] = parseInt(value.replace(/[^\d]/g, '')) || null;
        } else {
          results[field] = parseFloat(value.replace(/[^\d.-]/g, '')) || null;
        }
      }
    }
  });
  
  return Object.keys(results).length > 0 ? results : null;
}

// Scrape a single company with event emission
async function scrapeCompany(companyUrl, companyId = null, index, total) {
  try {
    emitEvent('progress', {
      processed: index,
      total: total,
      currentCompany: companyUrl
    });
    
    const html = await fetchWithRetry(companyUrl);
    const $ = cheerio.load(html);
    
    const registrationData = parseRegistrationData($);
    
    if (!registrationData.registration_number || !registrationData.tax_number) {
      throw new Error('Missing critical registration data');
    }
    
    // Check if already synced
    if (CONFIG.mode === 'production') {
      const { data: syncCheck } = await supabase.rpc('check_if_synced', {
        p_company_id: companyId,
        p_sync_type: 'registration',
        p_hours_threshold: 24
      });
      
      if (syncCheck) {
        emitEvent('skipped', {
          company: registrationData.name_short || companyUrl
        });
        return { status: 'skipped' };
      }
    }
    
    // Upsert company
    const { data: company } = await supabase.rpc('upsert_company', {
      p_registration_number: registrationData.registration_number,
      p_tax_number: registrationData.tax_number,
      p_name_short: registrationData.name_short,
      p_name_full: registrationData.name_full,
      p_activity_code: registrationData.activity_code,
      p_activity_description: registrationData.activity_description,
      p_legal_form: registrationData.legal_form,
      p_status: registrationData.status,
      p_founded_date: registrationData.founded_date,
      p_country: registrationData.country,
      p_region: registrationData.region,
      p_city: registrationData.city,
      p_address: registrationData.address,
      p_authorized_capital: registrationData.authorized_capital,
      p_paid_capital: registrationData.paid_capital,
      p_total_capital: registrationData.total_capital
    });
    
    const companyUuid = company || companyId;
    
    // Extract years and process financial data
    const years = [];
    $('th').each((i, el) => {
      const text = $(el).text();
      if (/20\d{2}/.test(text)) {
        const year = parseInt(text);
        if (year >= 2020 && year <= 2024) {
          years.push(year);
        }
      }
    });
    
    for (const year of years) {
      const indicators = parseFinancialIndicators($, year);
      if (indicators) {
        await supabase.rpc('upsert_financial_indicators', {
          p_company_id: companyUuid,
          p_year: year,
          p_indicators: indicators
        });
      }
      
      const results = parseBusinessResults($, year);
      if (results) {
        await supabase.rpc('upsert_business_results', {
          p_company_id: companyUuid,
          p_year: year,
          p_results: results
        });
      }
    }
    
    emitEvent('success', {
      company: registrationData.name_short,
      data: {
        registration: registrationData,
        years: years.length
      }
    });
    
    return { status: 'success', name: registrationData.name_short };
    
  } catch (error) {
    emitEvent('failed', {
      company: companyUrl,
      error: error.message
    });
    return { status: 'error', error: error.message };
  }
}

// Get company list
async function getCompanyList(limit = null, startId = 65000) {
  // Generate company IDs starting from startId going backwards
  const companyIds = [];
  const totalNeeded = limit || 1000;
  
  for (let i = 0; i < totalNeeded; i++) {
    companyIds.push(startId - i);
  }
  
  const companies = companyIds.map(id => ({
    id,
    url: `${CONFIG.baseUrl}/kompanija/${id}`
  }));
  
  return companies;
}

// Main function
async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('companies', {
      alias: 'c',
      type: 'number',
      description: 'Number of companies to scrape',
      default: 10
    })
    .option('concurrent', {
      type: 'number',
      description: 'Number of concurrent requests',
      default: CONFIG.maxConcurrent
    })
    .option('test', {
      alias: 't',
      type: 'boolean',
      description: 'Run in test mode'
    })
    .help()
    .argv;
  
  if (argv.test) {
    CONFIG.mode = 'test';
  }
  
  if (argv.concurrent) {
    CONFIG.maxConcurrent = argv.concurrent;
  }
  
  const companies = await getCompanyList(argv.companies);
  
  emitEvent('status', {
    data: {
      totalCompanies: companies.length,
      mode: CONFIG.mode,
      concurrent: CONFIG.maxConcurrent
    }
  });
  
  let processedCount = 0;
  
  // Process companies with rate limiting
  await Promise.all(
    companies.map((company, index) =>
      limit(async () => {
        if (index > 0) {
          await delay(CONFIG.requestDelay);
        }
        
        processedCount++;
        const result = await scrapeCompany(
          company.url, 
          company.id, 
          processedCount, 
          companies.length
        );
        
        return result;
      })
    )
  );
  
  emitEvent('status', {
    data: {
      isRunning: false,
      completed: true
    }
  });
}

// Error handling
process.on('unhandledRejection', (error) => {
  emitEvent('failed', {
    company: 'system',
    error: error.message
  });
  process.exit(1);
});

process.on('SIGTERM', () => {
  emitEvent('status', {
    data: {
      isRunning: false,
      stopped: true
    }
  });
  process.exit(0);
});

// Run
main().catch(error => {
  emitEvent('failed', {
    company: 'system',
    error: error.message
  });
  process.exit(1);
});