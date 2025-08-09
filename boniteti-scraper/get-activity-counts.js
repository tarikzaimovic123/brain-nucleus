#!/usr/bin/env node

import fetch from 'node-fetch';
import chalk from 'chalk';
import { createClient } from '@supabase/supabase-js';
import AuthManager from './auth-manager.js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const authManager = new AuthManager();

async function getCompanyCountForActivity(activityCode) {
  try {
    const session = await authManager.getValidSession();
    
    // Prepare the search parameters
    const params = new URLSearchParams({
      'sp[companyCountry]': 'Crna Gora',
      'sp[companyActivityCode][]': activityCode,
      'sp[companyLastFinReportYear]': '2024',
      'sp[companyFinReportCurrency]': 'EUR',
      'sp[orderByParameter]': 'revenue',
      'sp[orderingType]': 'Opadajuće',
      'sp[orderingByParameter]': 'Pokazatelju'
    });
    
    const response = await fetch('https://www.boniteti.me/searchcompany/getadvancedsearchcompanytotalcount', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Cookie': session,
        'Origin': 'https://www.boniteti.me',
        'Referer': 'https://www.boniteti.me/advanced-search-company',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: params.toString()
    });
    
    if (!response.ok) {
      console.error(`Failed to get count for ${activityCode}: ${response.status}`);
      return 0;
    }
    
    const count = await response.text();
    return parseInt(count) || 0;
    
  } catch (error) {
    console.error(`Error getting count for ${activityCode}:`, error.message);
    return 0;
  }
}

async function getAllActivityCounts() {
  console.log(chalk.cyan.bold('\n📊 Getting company counts for all activities...\n'));
  
  try {
    // Get all activities from database
    const { data: activities, error } = await supabase
      .from('activities')
      .select('*')
      .order('code');
    
    if (error) throw error;
    
    // Build tree structure
    const tree = {};
    const activityMap = {};
    
    // First pass: create map
    activities.forEach(activity => {
      activityMap[activity.activity_id] = {
        ...activity,
        children: [],
        companyCount: 0
      };
    });
    
    // Second pass: build tree
    activities.forEach(activity => {
      if (activity.parent_id === null) {
        // Root category
        tree[activity.code] = activityMap[activity.activity_id];
      } else if (activityMap[activity.parent_id]) {
        // Add to parent's children
        activityMap[activity.parent_id].children.push(activityMap[activity.activity_id]);
      }
    });
    
    // Get counts for each root category and major subcategories
    const results = [];
    const rootCategories = Object.values(tree).sort((a, b) => a.code.localeCompare(b.code));
    
    for (const category of rootCategories) {
      console.log(chalk.yellow(`\nFetching counts for ${category.code} - ${category.name}...`));
      
      // Get count for root category
      const rootCount = await getCompanyCountForActivity(`${category.code} - ${category.name}`);
      category.companyCount = rootCount;
      
      const categoryResult = {
        id: category.activity_id,
        code: category.code,
        name: category.name,
        fullText: category.full_text,
        companyCount: rootCount,
        children: []
      };
      
      // Get counts for major subcategories (2-digit codes)
      for (const subcat of category.children) {
        if (subcat.code.match(/^\d{2}$/)) {
          process.stdout.write(chalk.gray(`  ${subcat.code}...`));
          const subCount = await getCompanyCountForActivity(`${subcat.code} - ${subcat.name}`);
          subcat.companyCount = subCount;
          
          categoryResult.children.push({
            id: subcat.activity_id,
            code: subcat.code,
            name: subcat.name,
            fullText: subcat.full_text,
            companyCount: subCount,
            children: subcat.children.map(child => ({
              id: child.activity_id,
              code: child.code,
              name: child.name,
              fullText: child.full_text,
              companyCount: 0 // Don't fetch for deep levels
            }))
          });
          
          process.stdout.write(chalk.green(` ${subCount} companies\n`));
        }
      }
      
      results.push(categoryResult);
      console.log(chalk.green(`✓ ${category.code}: Total ${rootCount} companies`));
    }
    
    // Calculate total
    const totalCompanies = results.reduce((sum, cat) => sum + cat.companyCount, 0);
    
    console.log(chalk.cyan.bold(`\n📊 Summary:`));
    console.log(chalk.green(`Total companies across all categories: ${totalCompanies}`));
    
    if (process.env.RETURN_JSON) {
      console.log(JSON.stringify({
        success: true,
        categories: results,
        totalCompanies
      }));
    }
    
    return results;
    
  } catch (error) {
    console.error(chalk.red('Error:', error.message));
    if (process.env.RETURN_JSON) {
      console.log(JSON.stringify({
        success: false,
        error: error.message
      }));
    }
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  getAllActivityCounts();
}

export default getAllActivityCounts;