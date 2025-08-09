#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import chalk from 'chalk';
import dotenv from 'dotenv';
import AuthManager from './auth-manager.js';

// Load environment variables
dotenv.config();

// Configuration
const CONFIG = {
  apiUrl: 'https://www.boniteti.me/company/getactivitydata',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_KEY,
  countries: ['Crna Gora'] // Can add more countries if needed
};

// Supabase client
const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);

// Auth manager for automatic session handling
// Use existing session if provided via environment variable
const existingSession = process.env.BONITETI_SESSION;
const skipLogin = process.env.SKIP_LOGIN === '1';

const authManager = new AuthManager();

// Logger - suppressed when returning JSON but emits to stderr for progress tracking
const log = {
  info: (msg) => {
    if (!process.env.RETURN_JSON) {
      console.log(chalk.blue(`[INFO] ${msg}`));
    } else if (process.env.EMIT_PROGRESS) {
      process.stderr.write(`[INFO] ${msg}\n`);
    }
  },
  success: (msg) => {
    if (!process.env.RETURN_JSON) {
      console.log(chalk.green(`[SUCCESS] ${msg}`));
    } else if (process.env.EMIT_PROGRESS) {
      process.stderr.write(`[SUCCESS] ${msg}\n`);
    }
  },
  error: (msg) => {
    if (!process.env.RETURN_JSON) {
      console.log(chalk.red(`[ERROR] ${msg}`));
    } else if (process.env.EMIT_PROGRESS) {
      process.stderr.write(`[ERROR] ${msg}\n`);
    }
  },
  warn: (msg) => {
    if (!process.env.RETURN_JSON) {
      console.log(chalk.yellow(`[WARN] ${msg}`));
    } else if (process.env.EMIT_PROGRESS) {
      process.stderr.write(`[WARN] ${msg}\n`);
    }
  }
};

// If we have an existing session, set it in auth manager
if (existingSession && skipLogin) {
  log.info('Using existing Boniteti session from dashboard');
  authManager.setExistingSession(existingSession);
}

/**
 * Parse activities from API response
 */
function parseApiActivities(apiData) {
  const activities = [];
  
  if (!apiData || !Array.isArray(apiData)) {
    return activities;
  }
  
  // Create a map for quick lookup
  const idToActivity = {};
  
  // First pass: create all activities
  apiData.forEach(item => {
    // Clean the code (remove trailing spaces)
    const cleanCode = (item.code || '').trim();
    
    const activity = {
      id: item.id,
      text: item.text,
      value: cleanCode,
      parent: null, // Will be set in second pass
      parent_id: item.parentId,
      prefix: item.prefix
    };
    
    activities.push(activity);
    idToActivity[item.id] = activity;
  });
  
  // Second pass: set parent relationships using cleaned codes
  activities.forEach(activity => {
    if (activity.parent_id && idToActivity[activity.parent_id]) {
      const parent = idToActivity[activity.parent_id];
      activity.parent = parent.value; // Use the parent's code as the parent reference
    }
  });
  
  return activities;
}

/**
 * Fetch activities from Boniteti API
 */
async function fetchActivities(country) {
  try {
    log.info(`Fetching activities from Boniteti API for ${country}...`);
    
    // Use authenticated request with automatic session handling
    const response = await authManager.makeAuthenticatedRequest(
      'https://www.boniteti.me/company/getactivitydata',
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'en-US,en;q=0.9,sr-RS;q=0.8,sr;q=0.7',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Origin': 'https://www.boniteti.me',
          'Referer': 'https://www.boniteti.me/advanced-search-company',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: `country=${encodeURIComponent(country)}`
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const apiData = await response.json();
    log.success(`Received ${apiData.length} activities from API`);
    
    // Parse the API response into our format
    const activities = parseApiActivities(apiData);
    
    return activities;
  } catch (error) {
    log.error(`Failed to fetch from API: ${error.message}`);
    log.info('Attempting to get new session and retry...');
    
    // Try one more time with fresh login
    try {
      await authManager.login();
      const retryResponse = await authManager.makeAuthenticatedRequest(
        'https://www.boniteti.me/company/getactivitydata',
        {
          method: 'POST',
          headers: {
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: `country=${encodeURIComponent(country)}`
        }
      );
      
      if (retryResponse.ok) {
        const apiData = await retryResponse.json();
        log.success(`Retry successful! Received ${apiData.length} activities from API`);
        return parseApiActivities(apiData);
      }
    } catch (retryError) {
      log.error(`Retry failed: ${retryError.message}`);
    }
    
    // Only use hardcoded as absolute last resort
    log.warn('Using hardcoded activities as last resort fallback');
    const activities = [
      // ROOT CATEGORIES (parent_id = null)
      { id: 1, text: "A - POLJOPRIVREDA, ŠUMARSTVO I RIBARSTVO", value: "A" },
      { id: 7, text: "B - RUDARSTVO", value: "B" },
      { id: 11, text: "C - PRERAĐIVAČKA INDUSTRIJA", value: "C" },
      { id: 15, text: "D - SNABDEVANJE ELEKTRIČNOM ENERGIJOM, GASOM, PAROM I KLIMATIZACIJA", value: "D" },
      { id: 19, text: "E - SNABDEVANJE VODOM; UPRAVLJANJE OTPADNIM VODAMA", value: "E" },
      { id: 23, text: "F - GRAĐEVINARSTVO", value: "F" },
      { id: 27, text: "G - TRGOVINA NA VELIKO I TRGOVINA NA MALO", value: "G" },
      { id: 31, text: "H - SAOBRAĆAJ I SKLADIŠTENJE", value: "H" },
      { id: 35, text: "I - USLUGE PRUŽANJA SMEŠTAJA I ISHRANE", value: "I" },
      { id: 39, text: "J - INFORMISANJE I KOMUNIKACIJE", value: "J" },
      { id: 43, text: "K - FINANSIJSKE DJELATNOSTI I DJELATNOST OSIGURANJA", value: "K" },
      { id: 47, text: "L - POSLOVANJE NEKRETNINAMA", value: "L" },
      { id: 51, text: "M - STRUČNE, NAUČNE I TEHNIČKE DJELATNOSTI", value: "M" },
      { id: 55, text: "N - ADMINISTRATIVNE I POMOĆNE USLUŽNE DJELATNOSTI", value: "N" },
      { id: 59, text: "O - DRŽAVNA UPRAVA I ODBRANA", value: "O" },
      { id: 63, text: "P - OBRAZOVANJE", value: "P" },
      { id: 67, text: "Q - ZDRAVSTVENA I SOCIJALNA ZAŠTITA", value: "Q" },
      { id: 71, text: "R - UMJETNOST, ZABAVA I REKREACIJA", value: "R" },
      { id: 75, text: "S - OSTALE USLUŽNE DJELATNOSTI", value: "S" },
      
      // SUBCATEGORIES UNDER A
      { id: 2, text: "01 - Poljoprivredna proizvodnja, lov i uslužne djelatnosti", value: "01", parent: "A" },
      { id: 3, text: "011 - Uzgajanje jednogodišnjih i dvogodišnjih biljaka", value: "011", parent: "01" },
      { id: 4, text: "0111 - Uzgajanje žita (osim riže), leguminoza i uljarica", value: "0111", parent: "011" },
      { id: 5, text: "0112 - Uzgajanje riže", value: "0112", parent: "011" },
      { id: 6, text: "0113 - Uzgajanje povrća, bostana, korijenovog i gomoljastog povrća", value: "0113", parent: "011" },
      
      // SUBCATEGORIES UNDER B
      { id: 8, text: "05 - Vađenje uglja", value: "05", parent: "B" },
      { id: 9, text: "051 - Vađenje kamenog uglja", value: "051", parent: "05" },
      { id: 10, text: "0510 - Vađenje kamenog uglja", value: "0510", parent: "051" },
      
      // SUBCATEGORIES UNDER C
      { id: 12, text: "10 - Proizvodnja prehrambenih proizvoda", value: "10", parent: "C" },
      { id: 13, text: "101 - Prerada i konzerviranje mesa", value: "101", parent: "10" },
      { id: 14, text: "1011 - Prerada i konzerviranje mesa", value: "1011", parent: "101" },
      
      // SUBCATEGORIES UNDER D
      { id: 16, text: "35 - Snabdevanje električnom energijom, gasom, parom i klimatizacija", value: "35", parent: "D" },
      { id: 17, text: "351 - Proizvodnja, prenos i distribucija električne energije", value: "351", parent: "35" },
      { id: 18, text: "3511 - Proizvodnja električne energije", value: "3511", parent: "351" },
      
      // SUBCATEGORIES UNDER E
      { id: 20, text: "36 - Sakupljanje, prečišćavanje i snabdevanje vodom", value: "36", parent: "E" },
      { id: 21, text: "360 - Sakupljanje, prečišćavanje i snabdevanje vodom", value: "360", parent: "36" },
      { id: 22, text: "3600 - Sakupljanje, prečišćavanje i snabdevanje vodom", value: "3600", parent: "360" },
      
      // SUBCATEGORIES UNDER F
      { id: 24, text: "41 - Izgradnja zgrada", value: "41", parent: "F" },
      { id: 25, text: "411 - Razvojni projekti za zgrade", value: "411", parent: "41" },
      { id: 26, text: "4110 - Razvojni projekti za zgrade", value: "4110", parent: "411" },
      
      // SUBCATEGORIES UNDER G
      { id: 28, text: "45 - Trgovina na veliko i malo i popravka motornih vozila", value: "45", parent: "G" },
      { id: 29, text: "451 - Trgovina motornim vozilima", value: "451", parent: "45" },
      { id: 30, text: "4511 - Trgovina automobilima i lakim motornim vozilima", value: "4511", parent: "451" },
      
      // SUBCATEGORIES UNDER H
      { id: 32, text: "49 - Kopneni saobraćaj i cevovodni transport", value: "49", parent: "H" },
      { id: 33, text: "491 - Železnički prevoz putnika", value: "491", parent: "49" },
      { id: 34, text: "4910 - Železnički prevoz putnika", value: "4910", parent: "491" },
      
      // SUBCATEGORIES UNDER I
      { id: 36, text: "55 - Smeštaj", value: "55", parent: "I" },
      { id: 37, text: "551 - Hoteli i sličan smeštaj", value: "551", parent: "55" },
      { id: 38, text: "5510 - Hoteli i sličan smeštaj", value: "5510", parent: "551" },
      
      // SUBCATEGORIES UNDER J
      { id: 40, text: "58 - Izdavačke djelatnosti", value: "58", parent: "J" },
      { id: 41, text: "581 - Izdavanje knjiga, periodičnih publikacija", value: "581", parent: "58" },
      { id: 42, text: "5811 - Izdavanje knjiga", value: "5811", parent: "581" },
      
      // SUBCATEGORIES UNDER K
      { id: 44, text: "64 - Finansijske uslužne djelatnosti", value: "64", parent: "K" },
      { id: 45, text: "641 - Monetarno posredovanje", value: "641", parent: "64" },
      { id: 46, text: "6411 - Djelatnost centralne banke", value: "6411", parent: "641" },
      
      // SUBCATEGORIES UNDER L
      { id: 48, text: "68 - Poslovanje nekretninama", value: "68", parent: "L" },
      { id: 49, text: "681 - Kupovina i prodaja vlastitih nekretnina", value: "681", parent: "68" },
      { id: 50, text: "6810 - Kupovina i prodaja vlastitih nekretnina", value: "6810", parent: "681" },
      
      // SUBCATEGORIES UNDER M
      { id: 52, text: "69 - Pravni i računovodstveni poslovi", value: "69", parent: "M" },
      { id: 53, text: "691 - Pravni poslovi", value: "691", parent: "69" },
      { id: 54, text: "6910 - Pravni poslovi", value: "6910", parent: "691" },
      
      // SUBCATEGORIES UNDER N
      { id: 56, text: "77 - Iznajmljivanje i lizing", value: "77", parent: "N" },
      { id: 57, text: "771 - Iznajmljivanje motornih vozila", value: "771", parent: "77" },
      { id: 58, text: "7711 - Iznajmljivanje automobila i lakih motornih vozila", value: "7711", parent: "771" },
      
      // SUBCATEGORIES UNDER O
      { id: 60, text: "84 - Državna uprava i odbrana", value: "84", parent: "O" },
      { id: 61, text: "841 - Državna uprava", value: "841", parent: "84" },
      { id: 62, text: "8411 - Opšte djelatnosti javne uprave", value: "8411", parent: "841" },
      
      // SUBCATEGORIES UNDER P
      { id: 64, text: "85 - Obrazovanje", value: "85", parent: "P" },
      { id: 65, text: "851 - Predškolsko obrazovanje", value: "851", parent: "85" },
      { id: 66, text: "8510 - Predškolsko obrazovanje", value: "8510", parent: "851" },
      
      // SUBCATEGORIES UNDER Q
      { id: 68, text: "86 - Zdravstvena zaštita", value: "86", parent: "Q" },
      { id: 69, text: "861 - Djelatnost bolnica", value: "861", parent: "86" },
      { id: 70, text: "8610 - Djelatnost bolnica", value: "8610", parent: "861" },
      
      // SUBCATEGORIES UNDER R
      { id: 72, text: "90 - Stvaralačke, umjetničke i zabavne djelatnosti", value: "90", parent: "R" },
      { id: 73, text: "900 - Stvaralačke, umjetničke i zabavne djelatnosti", value: "900", parent: "90" },
      { id: 74, text: "9001 - Izvođačka umjetnost", value: "9001", parent: "900" },
      
      // SUBCATEGORIES UNDER S
      { id: 76, text: "94 - Djelatnosti udruženja", value: "94", parent: "S" },
      { id: 77, text: "941 - Djelatnosti poslovnih udruženja", value: "941", parent: "94" },
      { id: 78, text: "9411 - Djelatnosti poslovnih udruženja i udruženja poslodavaca", value: "9411", parent: "941" }
    ];
    
    log.warn(`Using ${activities.length} hardcoded activities for ${country} (fallback mode)`);
    return activities;
  }
}

/**
 * Parse activity data to extract code, name, and hierarchy
 */
function parseActivity(activity) {
  const { id, text, value } = activity;
  
  // Extract code and name from text
  // Format: "0111 - Uzgajanje žita (osim riže), leguminoza i uljarica"
  const match = text.match(/^(\d+)\s*-\s*(.+)$/);
  
  if (!match) {
    return {
      activity_id: id,
      code: value || '',
      name: text,
      full_text: text
    };
  }
  
  const [, code, name] = match;
  
  return {
    activity_id: id,
    code: code.trim(),
    name: name.trim(),
    full_text: text
  };
}

/**
 * Determine parent ID based on parent field or code hierarchy
 */
function findParentId(activity, allActivities) {
  // If parent field is specified, use it
  if (activity.parent) {
    const parent = allActivities.find(a => a.code === activity.parent);
    if (parent) {
      return parent.activity_id;
    }
  }
  
  // For root categories (A, B, C, etc.), no parent
  if (activity.code.length === 1) {
    return null;
  }
  
  // For numeric codes, find parent by hierarchy
  const currentCode = activity.code;
  
  // Look for parent by removing last digit(s)
  for (let len = currentCode.length - 1; len >= 1; len--) {
    const parentCode = currentCode.substring(0, len);
    const parent = allActivities.find(a => a.code === parentCode);
    if (parent) {
      return parent.activity_id;
    }
  }
  
  return null;
}

/**
 * Build activity tree structure
 */
function buildActivityTree(activities) {
  const parsedActivities = activities.map(activity => ({
    ...parseActivity(activity),
    parent: activity.parent // Keep parent field from original data
  }));
  
  // Add parent relationships
  const activitiesWithParents = parsedActivities.map(activity => {
    const parent_id = findParentId(activity, parsedActivities);
    return {
      ...activity,
      parent_id
    };
  });
  
  return activitiesWithParents;
}

/**
 * Compare activities with existing database
 */
async function compareActivities(newActivities) {
  try {
    // Get existing activities from database
    const { data: existingActivities, error } = await supabase
      .from('activities')
      .select('*');
    
    if (error) throw error;
    
    const existingMap = new Map(
      existingActivities.map(a => [a.activity_id, a])
    );
    
    const comparison = {
      new: [],
      updated: [],
      unchanged: [],
      deleted: []
    };
    
    // Check new and updated activities
    for (const activity of newActivities) {
      const existing = existingMap.get(activity.activity_id);
      
      if (!existing) {
        comparison.new.push(activity);
      } else {
        // Check if any field has changed
        const hasChanged = 
          existing.code !== activity.code ||
          existing.name !== activity.name ||
          existing.full_text !== activity.full_text ||
          existing.parent_id !== activity.parent_id;
        
        if (hasChanged) {
          comparison.updated.push({
            ...activity,
            old: existing
          });
        } else {
          comparison.unchanged.push(activity);
        }
        
        // Remove from map to track deleted
        existingMap.delete(activity.activity_id);
      }
    }
    
    // Remaining in map are deleted (exist in DB but not in API)
    comparison.deleted = Array.from(existingMap.values());
    
    return comparison;
  } catch (error) {
    log.error(`Failed to compare activities: ${error.message}`);
    return null;
  }
}

/**
 * Save activities to database (with comparison)
 */
async function saveActivities(activities, country, saveOnlyNew = false, skipSave = false) {
  let successCount = 0;
  let errorCount = 0;
  
  // Get comparison first
  const comparison = await compareActivities(activities);
  
  if (comparison && saveOnlyNew) {
    // Save only new activities
    activities = comparison.new;
  }
  
  // If skipSave is true, just return the comparison without saving
  if (skipSave) {
    log.info('Skipping database save (comparison only mode)');
    return { successCount: 0, errorCount: 0, comparison };
  }
  
  for (const activity of activities) {
    try {
      const { error } = await supabase.rpc('upsert_activity', {
        p_activity_id: activity.activity_id,
        p_code: activity.code,
        p_name: activity.name,
        p_full_text: activity.full_text,
        p_parent_id: activity.parent_id,
        p_country: country
      });
      
      if (error) {
        throw error;
      }
      
      successCount++;
    } catch (error) {
      log.error(`Failed to save activity ${activity.code}: ${error.message}`);
      errorCount++;
    }
  }
  
  // Update levels and leaf status
  try {
    await supabase.rpc('update_activity_levels');
    log.info('Updated activity hierarchy levels');
  } catch (error) {
    log.error(`Failed to update levels: ${error.message}`);
  }
  
  return { successCount, errorCount, comparison };
}

/**
 * Main function
 */
async function main() {
  if (!process.env.RETURN_JSON) {
    console.log(chalk.cyan.bold('\n🚀 Boniteti Activities Fetcher\n'));
  }
  
  let totalActivities = 0;
  let totalSaved = 0;
  let totalErrors = 0;
  
  for (const country of CONFIG.countries) {
    // Fetch activities from API
    const activities = await fetchActivities(country);
    
    if (activities.length === 0) {
      log.warn(`No activities found for ${country}`);
      continue;
    }
    
    totalActivities += activities.length;
    
    // Build tree structure
    log.info('Building activity tree structure...');
    const activityTree = buildActivityTree(activities);
    
    // Check if we're in comparison-only mode or should save
    const skipSave = process.env.COMPARISON_ONLY === '1';
    
    // Save to database or just compare
    log.info(skipSave ? 'Comparing with existing activities (no save)...' : 'Comparing and saving activities...');
    const { successCount, errorCount, comparison } = await saveActivities(activityTree, country, false, skipSave);
    
    totalSaved += successCount;
    totalErrors += errorCount;
    
    // Log comparison results
    if (comparison) {
      // Return comparison as JSON for API endpoint
      if (process.env.RETURN_JSON) {
        // Suppress all other console output and only return JSON
        // Limit the comparison data to avoid buffer overflow
        const limitedComparison = {
          new: comparison.new.slice(0, 10),
          updated: comparison.updated.slice(0, 10),
          unchanged: comparison.unchanged.slice(0, 10), 
          deleted: comparison.deleted.slice(0, 10)
        };
        
        process.stdout.write(JSON.stringify({
          success: true,
          comparison: limitedComparison,
          stats: {
            new: comparison.new.length,
            updated: comparison.updated.length,
            unchanged: comparison.unchanged.length,
            deleted: comparison.deleted.length,
            total: activities.length
          }
        }));
        process.exit(0);
      } else {
        console.log(chalk.cyan.bold('\n📊 Comparison Results:\n'));
        console.log(chalk.green(`✨ New activities: ${comparison.new.length}`));
        console.log(chalk.yellow(`📝 Updated activities: ${comparison.updated.length}`));
        console.log(chalk.blue(`✓ Unchanged activities: ${comparison.unchanged.length}`));
        console.log(chalk.red(`❌ Deleted activities: ${comparison.deleted.length}`));
      }
    }
    
    log.success(`Saved ${successCount} activities for ${country}`);
    if (errorCount > 0) {
      log.warn(`Failed to save ${errorCount} activities`);
    }
  }
  
  // Print summary only if not returning JSON
  if (!process.env.RETURN_JSON) {
    console.log(chalk.cyan.bold('\n📊 Summary:\n'));
    console.log(chalk.blue(`Total activities fetched: ${totalActivities}`));
    console.log(chalk.green(`Successfully saved: ${totalSaved}`));
    if (totalErrors > 0) {
      console.log(chalk.red(`Errors: ${totalErrors}`));
    }
    
    // Get statistics from database
    try {
      const { data: stats } = await supabase
        .from('activities_stats')
        .select('*')
        .order('level');
      
      if (stats && stats.length > 0) {
        console.log(chalk.cyan.bold('\n📈 Hierarchy Statistics:\n'));
        stats.forEach(stat => {
          console.log(`Level ${stat.level}: ${stat.count} activities`);
        });
      }
    } catch (error) {
      log.error(`Failed to get statistics: ${error.message}`);
    }
    
    console.log(chalk.green.bold('\n✨ Activities fetch completed!\n'));
  }
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('Unhandled rejection:'), error);
  process.exit(1);
});

// Run
main().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});