#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import chalk from 'chalk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const CONFIG = {
  url: 'https://www.boniteti.me/advanced-search-company',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_KEY,
  // Session cookies from your browser
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
 * Fetch HTML page with cookies
 */
async function fetchPage() {
  try {
    log.info('Fetching page from Boniteti.me...');
    
    const response = await fetch(CONFIG.url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,sr-RS;q=0.8,sr;q=0.7',
        'Cookie': CONFIG.cookies,
        'Referer': 'https://www.boniteti.me/'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    log.success('Successfully fetched page');
    return html;
  } catch (error) {
    log.error(`Failed to fetch page: ${error.message}`);
    return null;
  }
}

/**
 * Parse activities from HTML using Cheerio
 */
function parseActivities(html) {
  const $ = cheerio.load(html);
  const activities = [];
  let idCounter = 1;
  
  log.info('Parsing activities from HTML...');
  
  // Find the tree structure at the specified XPath
  // Convert XPath to CSS selector: body > div:nth-child(4) > div:nth-child(2) > div > div > div > div:nth-child(3) > div:nth-child(2) > div > div > div > div:nth-child(2) > div > div > div > div > ul
  // Or simpler: find the ul element that contains activity data
  
  // First, let's try to find all li elements with activity data
  // Usually they have data attributes or specific classes
  const processNode = (element, parentCode = null) => {
    const $elem = $(element);
    const text = $elem.children('div').first().text().trim() || $elem.text().trim();
    
    if (!text) return;
    
    // Parse the activity text
    // Format can be: "A - POLJOPRIVREDA, ŠUMARSTVO I RIBARSTVO" or "01 - Poljoprivredna proizvodnja..."
    const match = text.match(/^([A-Z0-9]+)\s*-\s*(.+)$/);
    
    if (match) {
      const [, code, name] = match;
      
      const activity = {
        id: idCounter++,
        code: code.trim(),
        name: name.trim(),
        text: text,
        value: code.trim(),
        parent: parentCode
      };
      
      activities.push(activity);
      
      // Process children
      const $children = $elem.children('ul').first();
      if ($children.length > 0) {
        $children.children('li').each((i, child) => {
          processNode(child, code.trim());
        });
      }
    }
  };
  
  // Try different selectors to find the tree
  const selectors = [
    'ul.k-group.k-treeview-lines li',  // Kendo TreeView
    'div[role="tree"] li',             // ARIA tree
    'ul.tree li',                       // Generic tree
    'ul#activityTree li',               // ID-based
    '[data-role="treeview"] li',       // Data attribute
    'div.activities-tree li',          // Class-based
    // The specific path you mentioned
    'div:nth-of-type(4) > div:nth-of-type(2) ul li'
  ];
  
  for (const selector of selectors) {
    const $items = $(selector);
    if ($items.length > 0) {
      log.info(`Found ${$items.length} items using selector: ${selector}`);
      
      // Process only root level items
      $items.each((i, elem) => {
        // Check if this is a root item (no parent li)
        if ($(elem).parent().parent().is('body') || 
            !$(elem).parent().parent().is('li')) {
          processNode(elem);
        }
      });
      
      if (activities.length > 0) {
        break;
      }
    }
  }
  
  // If we still haven't found activities, try to find by text content
  if (activities.length === 0) {
    log.warn('Could not find activities with standard selectors, searching by content...');
    
    // Look for elements containing "POLJOPRIVREDA" or other known categories
    $('*:contains("POLJOPRIVREDA")').each((i, elem) => {
      const $elem = $(elem);
      const text = $elem.text().trim();
      
      if (text.match(/^[A-Z]\s*-\s*/)) {
        log.info(`Found potential activity: ${text.substring(0, 50)}...`);
      }
    });
  }
  
  log.success(`Parsed ${activities.length} activities from HTML`);
  return activities;
}

/**
 * Save HTML to file for debugging
 */
async function saveHtmlForDebug(html) {
  try {
    const fs = await import('fs/promises');
    await fs.writeFile('boniteti-page.html', html);
    log.info('Saved HTML to boniteti-page.html for debugging');
  } catch (error) {
    log.error(`Failed to save HTML: ${error.message}`);
  }
}

/**
 * Main function
 */
async function main() {
  console.log(chalk.cyan.bold('\n🚀 Boniteti Activities Fetcher (Cheerio)\n'));
  
  // Fetch the page
  const html = await fetchPage();
  
  if (!html) {
    log.error('Failed to fetch page, exiting...');
    process.exit(1);
  }
  
  // Save HTML for debugging
  await saveHtmlForDebug(html);
  
  // Parse activities
  const activities = parseActivities(html);
  
  if (activities.length === 0) {
    log.warn('No activities found. Please check boniteti-page.html for debugging.');
    log.info('You may need to update the cookies or selectors.');
  } else {
    console.log(chalk.cyan.bold('\n📊 Found Activities:\n'));
    
    // Group by parent
    const rootActivities = activities.filter(a => !a.parent);
    
    rootActivities.forEach(root => {
      console.log(chalk.green.bold(`\n${root.code} - ${root.name}`));
      
      // Find children
      const children = activities.filter(a => a.parent === root.code);
      children.forEach(child => {
        console.log(chalk.yellow(`  ${child.code} - ${child.name}`));
        
        // Find sub-children
        const subChildren = activities.filter(a => a.parent === child.code);
        subChildren.forEach(subChild => {
          console.log(chalk.blue(`    ${subChild.code} - ${subChild.name}`));
          
          // Find sub-sub-children
          const subSubChildren = activities.filter(a => a.parent === subChild.code);
          subSubChildren.forEach(subSubChild => {
            console.log(chalk.gray(`      ${subSubChild.code} - ${subSubChild.name}`));
          });
        });
      });
    });
    
    console.log(chalk.cyan.bold(`\n📈 Total activities: ${activities.length}\n`));
  }
}

// Run
main().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});