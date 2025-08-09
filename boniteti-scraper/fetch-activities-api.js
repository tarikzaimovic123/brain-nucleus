#!/usr/bin/env node

import fetch from 'node-fetch';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

// Configuration
const CONFIG = {
  apiUrl: 'https://www.boniteti.me/company/getactivitydata',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_KEY,
  // Session cookies from browser
  cookies: '_ga=GA1.2.1718927108.1754616016; _gid=GA1.2.1197884477.1754616016; Boniteti.me.Test=; ASP.NET_SessionId=tkebso4v3hnqgpgqz2lmma4a; Boniteti.me.UserCheck=6F88B9041376C77AAEE47841A835C38C; __zlcmid=1T2np6ChUR83tiZ; _ga_7CREWL27TX=GS2.2.s1754616016$o1$g1$t1754616966$j41$l0$h0'
};

// Supabase client
const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);

// Logger
const log = {
  info: (msg) => console.log(chalk.blue(`[INFO] ${msg}`)),
  success: (msg) => console.log(chalk.green(`[SUCCESS] ${msg}`)),
  error: (msg) => console.log(chalk.red(`[ERROR] ${msg}`)),
  warn: (msg) => console.log(chalk.yellow(`[WARN] ${msg}`))
};

/**
 * Fetch activities from Boniteti API
 */
async function fetchActivitiesFromAPI(country = 'Crna Gora') {
  try {
    log.info(`Fetching activities for ${country} from API...`);
    
    const response = await fetch(CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en-US,en;q=0.9,sr-RS;q=0.8,sr;q=0.7',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Cookie': CONFIG.cookies,
        'Origin': 'https://www.boniteti.me',
        'Referer': 'https://www.boniteti.me/advanced-search-company',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: `country=${encodeURIComponent(country)}`
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    log.success(`Received response from API`);
    
    return data;
  } catch (error) {
    log.error(`Failed to fetch activities: ${error.message}`);
    return null;
  }
}

/**
 * Parse activity tree structure
 */
function parseActivityTree(data, parentId = null, parentCode = null) {
  const activities = [];
  
  if (!data || !Array.isArray(data)) {
    return activities;
  }
  
  data.forEach(item => {
    const activity = {
      id: item.id || item.Id,
      text: item.text || item.Text || item.name || item.Name,
      value: item.value || item.Value || item.code || item.Code,
      parent: parentCode,
      parent_id: parentId
    };
    
    // Extract code and name from text if needed
    if (activity.text) {
      const match = activity.text.match(/^([A-Z0-9]+)\s*-\s*(.+)$/);
      if (match) {
        activity.code = match[1].trim();
        activity.name = match[2].trim();
      } else {
        activity.code = activity.value || '';
        activity.name = activity.text;
      }
    }
    
    activities.push(activity);
    
    // Process children recursively
    if (item.items || item.Items || item.children || item.Children) {
      const children = parseActivityTree(
        item.items || item.Items || item.children || item.Children,
        activity.id,
        activity.code
      );
      activities.push(...children);
    }
  });
  
  return activities;
}

/**
 * Main function
 */
async function main() {
  console.log(chalk.cyan.bold('\n🚀 Boniteti Activities API Fetcher\n'));
  
  // Fetch from API
  const apiData = await fetchActivitiesFromAPI('Crna Gora');
  
  if (!apiData) {
    log.error('Failed to fetch data from API');
    process.exit(1);
  }
  
  // Save raw API response for debugging
  try {
    const fs = await import('fs/promises');
    await fs.writeFile('boniteti-api-response.json', JSON.stringify(apiData, null, 2));
    log.info('Saved API response to boniteti-api-response.json');
  } catch (error) {
    log.error(`Failed to save API response: ${error.message}`);
  }
  
  // Parse activities
  const activities = parseActivityTree(apiData);
  
  console.log(chalk.cyan.bold(`\n📊 Found ${activities.length} activities:\n`));
  
  // Display tree structure
  const rootActivities = activities.filter(a => !a.parent);
  
  rootActivities.forEach(root => {
    console.log(chalk.green.bold(`${root.code} - ${root.name}`));
    
    // Find level 1 children (01, 02, 03, etc.)
    const level1 = activities.filter(a => a.parent === root.code);
    level1.forEach(l1 => {
      console.log(chalk.yellow(`  ${l1.code} - ${l1.name}`));
      
      // Find level 2 children (011, 012, etc.)
      const level2 = activities.filter(a => a.parent === l1.code);
      level2.forEach(l2 => {
        console.log(chalk.blue(`    ${l2.code} - ${l2.name}`));
        
        // Find level 3 children (0111, 0112, etc.)
        const level3 = activities.filter(a => a.parent === l2.code);
        level3.forEach(l3 => {
          console.log(chalk.gray(`      ${l3.code} - ${l3.name}`));
        });
      });
    });
  });
  
  // Count by level
  const stats = {
    root: rootActivities.length,
    level1: activities.filter(a => a.code && a.code.match(/^[0-9]{2}$/)).length,
    level2: activities.filter(a => a.code && a.code.match(/^[0-9]{3}$/)).length,
    level3: activities.filter(a => a.code && a.code.match(/^[0-9]{4}$/)).length
  };
  
  console.log(chalk.cyan.bold('\n📈 Statistics:'));
  console.log(`  Root categories (A-Z): ${stats.root}`);
  console.log(`  Level 1 (XX): ${stats.level1}`);
  console.log(`  Level 2 (XXX): ${stats.level2}`);
  console.log(`  Level 3 (XXXX): ${stats.level3}`);
  console.log(`  Total: ${activities.length}`);
  
  // Return for further processing
  return activities;
}

// Run
main().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});