#!/usr/bin/env node

import { readFileSync } from 'fs';
import chalk from 'chalk';

// Load local API response
const apiData = JSON.parse(readFileSync('boniteti-api-response.json', 'utf8'));

console.log(chalk.cyan.bold('\n📊 API Data Analysis:\n'));

// Count by prefix
const prefixCount = {};
const rootCategories = [];

apiData.forEach(item => {
  const prefix = item.prefix;
  if (!prefixCount[prefix]) {
    prefixCount[prefix] = 0;
  }
  prefixCount[prefix]++;
  
  // Find root categories (parentId = null)
  if (item.parentId === null) {
    rootCategories.push({
      id: item.id,
      code: item.code.trim(),
      text: item.text,
      prefix: item.prefix
    });
  }
});

console.log(chalk.green('Root Categories:'));
rootCategories.sort((a, b) => a.code.localeCompare(b.code));
rootCategories.forEach(cat => {
  console.log(`  ${cat.code} - ${cat.text}`);
});

console.log(chalk.yellow('\nActivities per category:'));
Object.keys(prefixCount).sort().forEach(prefix => {
  console.log(`  ${prefix}: ${prefixCount[prefix]} activities`);
});

console.log(chalk.blue(`\nTotal activities: ${apiData.length}`));
console.log(chalk.blue(`Total root categories: ${rootCategories.length}`));

// Check hierarchy
console.log(chalk.magenta('\nSample hierarchy for A:'));
const aSamples = apiData.filter(item => item.prefix === 'A').slice(0, 10);
aSamples.forEach(item => {
  const level = item.code.trim().length;
  const indent = '  '.repeat(level - 1);
  console.log(`${indent}${item.code.trim()} - ${item.text.substring(0, 50)}...`);
});