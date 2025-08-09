#!/usr/bin/env node

import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import chalk from 'chalk';
import fs from 'fs/promises';

async function debugLogin() {
  try {
    console.log(chalk.cyan('Fetching login page...'));
    
    const response = await fetch('https://www.boniteti.me/Login', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    console.log(chalk.yellow(`Status: ${response.status}`));
    console.log(chalk.yellow(`Headers: ${JSON.stringify(Object.fromEntries(response.headers), null, 2)}`));
    
    const html = await response.text();
    await fs.writeFile('login-page.html', html);
    console.log(chalk.green('Saved login page to login-page.html'));
    
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    // Look for various form elements
    console.log(chalk.cyan('\nLooking for form elements...'));
    
    // Find all forms
    const forms = doc.querySelectorAll('form');
    console.log(`Found ${forms.length} forms`);
    
    forms.forEach((form, i) => {
      console.log(chalk.yellow(`\nForm ${i + 1}:`));
      console.log(`  Action: ${form.action}`);
      console.log(`  Method: ${form.method}`);
      
      // Find all inputs
      const inputs = form.querySelectorAll('input');
      console.log(`  Inputs (${inputs.length}):`);
      inputs.forEach(input => {
        console.log(`    - ${input.name || input.id || 'unnamed'}: type=${input.type}, value=${input.value?.substring(0, 20) || 'empty'}`);
      });
    });
    
    // Look for any verification tokens
    const allInputs = doc.querySelectorAll('input');
    const tokenInputs = Array.from(allInputs).filter(input => 
      input.name?.toLowerCase().includes('token') || 
      input.name?.toLowerCase().includes('verification')
    );
    
    console.log(chalk.cyan('\nToken inputs found:'));
    tokenInputs.forEach(input => {
      console.log(`  ${input.name}: ${input.value?.substring(0, 50)}...`);
    });
    
    // Check if it's actually a login page or if we're redirected
    const title = doc.querySelector('title')?.textContent;
    console.log(chalk.cyan(`\nPage title: ${title}`));
    
    // Look for login-related text
    const hasLoginForm = html.includes('Username') || html.includes('Password') || html.includes('login');
    console.log(chalk.cyan(`Has login form elements: ${hasLoginForm}`));
    
  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
  }
}

debugLogin();