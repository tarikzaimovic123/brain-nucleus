#!/usr/bin/env node

import fetch from 'node-fetch';
import chalk from 'chalk';

const possibleUrls = [
  'https://www.boniteti.me/',
  'https://www.boniteti.me/login',
  'https://www.boniteti.me/Login', 
  'https://www.boniteti.me/account/login',
  'https://www.boniteti.me/Account/Login',
  'https://www.boniteti.me/auth/login',
  'https://www.boniteti.me/signin',
  'https://www.boniteti.me/user/login'
];

async function findLoginPage() {
  console.log(chalk.cyan.bold('🔍 Searching for login page...\n'));
  
  for (const url of possibleUrls) {
    try {
      console.log(chalk.yellow(`Testing: ${url}`));
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        redirect: 'manual' // Don't follow redirects
      });
      
      console.log(`  Status: ${response.status}`);
      
      if (response.status === 301 || response.status === 302) {
        const location = response.headers.get('location');
        console.log(chalk.blue(`  Redirects to: ${location}`));
      }
      
      if (response.status === 200) {
        const text = await response.text();
        const hasLoginForm = 
          text.includes('Username') || 
          text.includes('username') ||
          text.includes('Password') || 
          text.includes('password') ||
          text.includes('login') ||
          text.includes('Login') ||
          text.includes('Sign in');
        
        if (hasLoginForm) {
          console.log(chalk.green(`  ✅ Found login elements!`));
          
          // Check for form action
          const formMatch = text.match(/<form[^>]*action="([^"]*)"[^>]*>/i);
          if (formMatch) {
            console.log(chalk.green(`  Form action: ${formMatch[1]}`));
          }
        } else {
          console.log(chalk.gray(`  No login elements found`));
        }
      }
      
      console.log();
    } catch (error) {
      console.log(chalk.red(`  Error: ${error.message}\n`));
    }
  }
  
  // Also check the main page for login links
  console.log(chalk.cyan('\nChecking main page for login links...'));
  
  try {
    const response = await fetch('https://www.boniteti.me/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    if (response.ok) {
      const text = await response.text();
      
      // Look for login links
      const loginLinks = text.match(/href="([^"]*login[^"]*)"/gi);
      if (loginLinks) {
        console.log(chalk.green('Found login links:'));
        loginLinks.forEach(link => {
          const url = link.match(/href="([^"]*)"/i)[1];
          console.log(`  ${url}`);
        });
      }
      
      // Look for sign in links
      const signinLinks = text.match(/href="([^"]*sign[^"]*)"/gi);
      if (signinLinks) {
        console.log(chalk.green('Found sign-in links:'));
        signinLinks.forEach(link => {
          const url = link.match(/href="([^"]*)"/i)[1];
          console.log(`  ${url}`);
        });
      }
    }
  } catch (error) {
    console.log(chalk.red(`Error checking main page: ${error.message}`));
  }
}

findLoginPage();