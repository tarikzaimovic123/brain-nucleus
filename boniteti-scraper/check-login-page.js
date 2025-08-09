#!/usr/bin/env node

import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import chalk from 'chalk';
import fs from 'fs/promises';

async function checkLoginPage() {
  try {
    const url = 'https://www.boniteti.me/user/loginpage';
    console.log(chalk.cyan(`Fetching: ${url}\n`));
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    console.log(chalk.yellow(`Status: ${response.status}`));
    
    const html = await response.text();
    await fs.writeFile('actual-login-page.html', html);
    console.log(chalk.green('Saved to actual-login-page.html\n'));
    
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    // Find all forms
    const forms = doc.querySelectorAll('form');
    console.log(chalk.cyan(`Found ${forms.length} form(s)\n`));
    
    forms.forEach((form, i) => {
      console.log(chalk.yellow(`Form ${i + 1}:`));
      console.log(`  Action: ${form.action || 'not specified'}`);
      console.log(`  Method: ${form.method || 'GET'}`);
      console.log(`  ID: ${form.id || 'none'}`);
      
      // Find all inputs
      const inputs = form.querySelectorAll('input');
      console.log(chalk.cyan(`\n  Inputs (${inputs.length}):`));
      
      inputs.forEach(input => {
        const info = [
          `name="${input.name || ''}"`,
          `type="${input.type || 'text'}"`,
          `id="${input.id || ''}"`,
          input.value ? `value="${input.value.substring(0, 30)}..."` : ''
        ].filter(Boolean).join(', ');
        
        console.log(`    ${info}`);
      });
      
      // Find buttons
      const buttons = form.querySelectorAll('button, input[type="submit"]');
      if (buttons.length > 0) {
        console.log(chalk.cyan(`\n  Buttons (${buttons.length}):`));
        buttons.forEach(btn => {
          console.log(`    ${btn.tagName}: ${btn.textContent || btn.value || 'unnamed'}`);
        });
      }
      
      console.log();
    });
    
    // Look specifically for verification tokens
    const allInputs = doc.querySelectorAll('input');
    const hiddenInputs = Array.from(allInputs).filter(input => input.type === 'hidden');
    
    if (hiddenInputs.length > 0) {
      console.log(chalk.cyan('Hidden inputs found:'));
      hiddenInputs.forEach(input => {
        console.log(`  ${input.name}: ${input.value?.substring(0, 50) || 'empty'}...`);
      });
    }
    
  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
  }
}

checkLoginPage();