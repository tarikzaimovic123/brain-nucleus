#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import pLimit from 'p-limit';
import chalk from 'chalk';
import cliProgress from 'cli-progress';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  mode: process.env.MODE || 'production',
  logLevel: process.env.LOG_LEVEL || 'info'
};

// Supabase client
const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);

// Rate limiter
const limit = pLimit(CONFIG.maxConcurrent);

// Progress bar
const progressBar = new cliProgress.SingleBar({
  format: chalk.cyan('{bar}') + ' | {percentage}% | {value}/{total} Companies | ETA: {eta}s',
  barCompleteChar: '\u2588',
  barIncompleteChar: '\u2591',
  hideCursor: true
});

// Statistics
const stats = {
  total: 0,
  success: 0,
  failed: 0,
  skipped: 0,
  errors: []
};

/**
 * Logger utility
 */
const log = {
  debug: (msg) => CONFIG.logLevel === 'debug' && console.log(chalk.gray(`[DEBUG] ${msg}`)),
  info: (msg) => ['debug', 'info'].includes(CONFIG.logLevel) && console.log(chalk.blue(`[INFO] ${msg}`)),
  warn: (msg) => ['debug', 'info', 'warn'].includes(CONFIG.logLevel) && console.log(chalk.yellow(`[WARN] ${msg}`)),
  error: (msg) => console.log(chalk.red(`[ERROR] ${msg}`)),
  success: (msg) => console.log(chalk.green(`[SUCCESS] ${msg}`))
};

/**
 * Delay utility
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch with retry logic
 */
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
        log.debug(`Retry ${i + 1}/${attempts} for ${url}`);
        await delay(CONFIG.retryDelay);
      }
    } catch (error) {
      if (i === attempts - 1) throw error;
      await delay(CONFIG.retryDelay);
    }
  }
}

/**
 * Parse registration data from company page
 */
function parseRegistrationData($) {
  const data = {};
  
  // Extract from registration section
  const registrationSection = $('.company-registration-section, [class*="registr"]').first();
  
  // Try different selectors for different page layouts
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
  
  // Extract each field
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

/**
 * Parse financial indicators from company page
 */
function parseFinancialIndicators($, year) {
  const indicators = {};
  
  // Find the financial indicators table for the specific year
  const yearColumn = $(`th:contains("${year}")`).index();
  if (yearColumn === -1) return null;
  
  // List of all financial indicators to extract
  const indicatorLabels = [
    'stalna_imovina', 'neuplaceni_upisani_kapital', 'goodwill', 'nematerijalna_ulaganja',
    'nekretnine_postrojenja_oprema', 'investicione_nekretnine', 'dugorocni_finansijski_plasmani',
    'dugorocna_potrazivanja', 'obrtna_imovina', 'zalihe', 'potrazivanja_po_osnovu_prodaje',
    'potrazivanja_iz_specificnih_poslova', 'druga_potrazivanja', 'finansijska_sredstva',
    'kratkorocni_finansijski_plasmani', 'gotovinski_ekvivalenti', 'porez_na_dodatu_vrijednost',
    'aktivna_vremenska_razgranicenja', 'poslovna_imovina', 'ukupna_aktiva', 'vanbilansna_aktiva',
    'kapital', 'osnovni_kapital', 'neuplaceni_upisani_kapital_pasiva', 'upisani_neuplaceni_kapital',
    'rezerve', 'revalorizacione_rezerve', 'nerealizovani_dobici', 'nerealizovani_gubici',
    'nerasporedjena_dobit', 'gubitak', 'otkupljene_sopstvene_akcije', 'dugorocna_rezervisanja',
    'dugorocne_obaveze', 'dugorocni_krediti', 'obaveze_iz_poslovanja', 'kratkorocne_obaveze',
    'kratkorocne_finansijske_obaveze', 'primljeni_avansi', 'obaveze_iz_poslovanja_kratkorocne',
    'ostale_kratkorocne_obaveze', 'obaveze_po_osnovu_pdv', 'obaveze_za_porez_dobit',
    'pasivna_vremenska_razgranicenja', 'ukupna_pasiva', 'vanbilansna_pasiva',
    'poslovni_prihodi', 'prihodi_od_prodaje', 'prihodi_od_prodaje_proizvoda', 'prihodi_od_premija',
    'drugi_poslovni_prihodi', 'poslovni_rashodi', 'nabavna_vrijednost_robe', 'prihodi_od_aktiviranja',
    'povecanje_zaliha', 'smanjenje_zaliha', 'troskovi_materijala', 'troskovi_goriva',
    'troskovi_zarada', 'troskovi_proizvodnih_usluga', 'troskovi_amortizacije',
    'troskovi_dugorocnih_rezervisanja', 'nematerijalni_troskovi', 'poslovni_dobitak',
    'poslovni_gubitak', 'finansijski_prihodi', 'finansijski_rashodi', 'dobitak_iz_finansiranja',
    'gubitak_iz_finansiranja', 'prihodi_od_uskladjivanja', 'rashodi_od_uskladjivanja',
    'ostali_prihodi', 'ostali_rashodi', 'dobitak_prije_oporezivanja', 'gubitak_prije_oporezivanja',
    'porez_na_dobitak', 'neto_dobitak', 'neto_gubitak'
  ];
  
  // Extract values for each indicator
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

/**
 * Parse business results from company page
 */
function parseBusinessResults($, year) {
  const results = {};
  
  // Find the business results table for the specific year
  const yearColumn = $(`th:contains("${year}")`).index();
  if (yearColumn === -1) return null;
  
  // Map of display labels to database fields
  const resultFields = {
    'Poslovni prihodi': 'poslovni_prihod',
    'Stopa povrata na kapital (roe)': 'stopa_povrata_na_kapital_roe',
    'Stopa povrata aktive (roa)': 'stopa_povrata_aktive_roa',
    'Prosečno vreme naplate potraživanja': 'prosecno_vreme_naplate_potrazivanja',
    'Prosečno vreme plaćanja dobavljačima': 'prosecno_vreme_placanja_obaveza',
    'Neto rezultat': 'neto_rezultat',
    'Poslovni prihod po zaposlenom': 'poslovni_prihod_po_zaposlenom',
    'Potraživanja': 'potrazivanja',
    'Gotovinski ekvivalenti i gotovina': 'gotovinski_ekvivalenti_gotovina',
    'Ukupna aktiva': 'ukupna_aktiva',
    'Obaveze iz poslovanja': 'obaveze_iz_poslovanja',
    'Broj zaposlenih': 'broj_zaposlenih'
  };
  
  // Extract values
  Object.entries(resultFields).forEach(([label, field]) => {
    const row = $(`tr td:contains("${label}")`).parent();
    if (row.length) {
      const value = row.find('td').eq(yearColumn).text().trim();
      if (value && value !== '-') {
        // Handle different value types
        if (field.includes('prosecno_vreme')) {
          results[field] = parseInt(value) || null;
        } else if (field === 'broj_zaposlenih') {
          results[field] = parseInt(value.replace(/[^\d]/g, '')) || null;
        } else if (field.includes('stopa_povrata')) {
          results[field] = parseFloat(value.replace('%', '').replace(',', '.')) || null;
        } else {
          results[field] = parseFloat(value.replace(/[^\d.-]/g, '')) || null;
        }
      }
    }
  });
  
  return Object.keys(results).length > 0 ? results : null;
}

/**
 * Scrape a single company
 */
async function scrapeCompany(companyUrl, companyId = null) {
  try {
    log.debug(`Scraping: ${companyUrl}`);
    
    // Fetch the page
    const html = await fetchWithRetry(companyUrl);
    const $ = cheerio.load(html);
    
    // Parse registration data
    const registrationData = parseRegistrationData($);
    
    if (!registrationData.registration_number || !registrationData.tax_number) {
      throw new Error('Missing critical registration data');
    }
    
    // Check if already synced recently (within 24 hours)
    if (CONFIG.mode === 'production') {
      const { data: syncCheck } = await supabase.rpc('check_if_synced', {
        p_company_id: companyId,
        p_sync_type: 'registration',
        p_hours_threshold: 24
      });
      
      if (syncCheck) {
        log.debug(`Company ${registrationData.name_short} already synced recently`);
        stats.skipped++;
        return { status: 'skipped', companyId };
      }
    }
    
    // Upsert company to database
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
    
    // Extract available years
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
    
    // Process financial data for each year
    for (const year of years) {
      // Financial indicators
      const indicators = parseFinancialIndicators($, year);
      if (indicators) {
        await supabase.rpc('upsert_financial_indicators', {
          p_company_id: companyUuid,
          p_year: year,
          p_indicators: indicators
        });
      }
      
      // Business results
      const results = parseBusinessResults($, year);
      if (results) {
        await supabase.rpc('upsert_business_results', {
          p_company_id: companyUuid,
          p_year: year,
          p_results: results
        });
      }
    }
    
    stats.success++;
    return { status: 'success', companyId: companyUuid, name: registrationData.name_short };
    
  } catch (error) {
    stats.failed++;
    stats.errors.push({ url: companyUrl, error: error.message });
    log.error(`Failed to scrape ${companyUrl}: ${error.message}`);
    return { status: 'error', error: error.message };
  }
}

/**
 * Get list of companies to scrape
 */
async function getCompanyList(limit = null, startId = 65000) {
  try {
    // Generate company IDs starting from startId going backwards
    const companyIds = [];
    const totalNeeded = limit || 1000;
    
    for (let i = 0; i < totalNeeded; i++) {
      companyIds.push(startId - i);
    }
    
    log.info(`Generated ${companyIds.length} company IDs from ${startId} to ${startId - totalNeeded + 1}`);
    
    const companies = companyIds.map(id => ({
      id,
      url: `${CONFIG.baseUrl}/kompanija/${id}`
    }));
    
    return companies;
    
  } catch (error) {
    log.error(`Failed to get company list: ${error.message}`);
    return [];
  }
}

/**
 * Main scraper function
 */
async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('companies', {
      alias: 'c',
      type: 'number',
      description: 'Number of companies to scrape'
    })
    .option('all', {
      alias: 'a',
      type: 'boolean',
      description: 'Scrape all companies'
    })
    .option('test', {
      alias: 't',
      type: 'boolean',
      description: 'Run in test mode'
    })
    .option('concurrent', {
      type: 'number',
      description: 'Number of concurrent requests',
      default: CONFIG.maxConcurrent
    })
    .option('start', {
      alias: 's',
      type: 'number',
      description: 'Starting company ID (will scrape backwards from this ID)',
      default: 65000
    })
    .help()
    .argv;
  
  // Set mode
  if (argv.test) {
    CONFIG.mode = 'test';
    CONFIG.logLevel = 'debug';
  }
  
  // Update concurrent limit
  if (argv.concurrent) {
    CONFIG.maxConcurrent = argv.concurrent;
  }
  
  console.log(chalk.cyan.bold('\n🚀 Boniteti.me Scraper Started\n'));
  log.info(`Mode: ${CONFIG.mode}`);
  log.info(`Max concurrent: ${CONFIG.maxConcurrent}`);
  log.info(`Starting from ID: ${argv.start}`);
  
  // Get company list
  const companies = await getCompanyList(argv.all ? null : (argv.companies || 10), argv.start);
  stats.total = companies.length;
  
  log.info(`Found ${stats.total} companies to scrape\n`);
  
  // Initialize progress bar
  progressBar.start(stats.total, 0);
  
  // Process companies with rate limiting
  const results = await Promise.all(
    companies.map((company, index) =>
      limit(async () => {
        // Add delay between requests
        if (index > 0) {
          await delay(CONFIG.requestDelay);
        }
        
        const result = await scrapeCompany(company.url, company.id);
        progressBar.increment();
        
        return result;
      })
    )
  );
  
  // Stop progress bar
  progressBar.stop();
  
  // Print statistics
  console.log(chalk.cyan.bold('\n📊 Scraping Statistics:\n'));
  console.log(chalk.green(`✅ Success: ${stats.success}`));
  console.log(chalk.yellow(`⏭️  Skipped: ${stats.skipped}`));
  console.log(chalk.red(`❌ Failed: ${stats.failed}`));
  console.log(chalk.blue(`📦 Total: ${stats.total}`));
  
  // Print errors if any
  if (stats.errors.length > 0) {
    console.log(chalk.red.bold('\n⚠️  Errors:'));
    stats.errors.slice(0, 10).forEach(err => {
      console.log(chalk.red(`  - ${err.url}: ${err.error}`));
    });
    
    if (stats.errors.length > 10) {
      console.log(chalk.red(`  ... and ${stats.errors.length - 10} more errors`));
    }
  }
  
  // Save error log if in production
  if (CONFIG.mode === 'production' && stats.errors.length > 0) {
    const errorLogPath = path.join(__dirname, `errors-${Date.now()}.json`);
    await fs.writeFile(errorLogPath, JSON.stringify(stats.errors, null, 2));
    log.info(`Error log saved to: ${errorLogPath}`);
  }
  
  console.log(chalk.green.bold('\n✨ Scraping completed!\n'));
  
  process.exit(stats.failed > 0 ? 1 : 0);
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('Unhandled rejection:'), error);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n⚠️  Scraping interrupted by user'));
  progressBar.stop();
  process.exit(130);
});

// Run the scraper
main().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});