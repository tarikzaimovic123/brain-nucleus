#!/usr/bin/env node

import AuthManager from './auth-manager.js';
import chalk from 'chalk';

console.log(chalk.cyan.bold('\n🔐 Testing Boniteti Authentication\n'));

const authManager = new AuthManager();

async function testAuth() {
  try {
    // Test 1: Login
    console.log(chalk.yellow('Test 1: Login with credentials...'));
    const session = await authManager.login();
    console.log(chalk.green('✅ Login successful!'));
    console.log(chalk.gray(`Session: ${session.substring(0, 100)}...`));
    
    // Test 2: Validate session
    console.log(chalk.yellow('\nTest 2: Validate session...'));
    const isValid = await authManager.validateSession();
    console.log(isValid ? chalk.green('✅ Session is valid') : chalk.red('❌ Session invalid'));
    
    // Test 3: Make API call
    console.log(chalk.yellow('\nTest 3: Fetch activities from API...'));
    const response = await authManager.makeAuthenticatedRequest(
      'https://www.boniteti.me/company/getactivitydata',
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          'Origin': 'https://www.boniteti.me',
          'Referer': 'https://www.boniteti.me/advanced-search-company'
        },
        body: 'country=Crna Gora'
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      console.log(chalk.green(`✅ API call successful! Received ${data.length} activities`));
      
      // Show sample of data
      console.log(chalk.cyan('\nSample activities:'));
      const rootCategories = data.filter(item => item.parentId === null);
      rootCategories.slice(0, 5).forEach(cat => {
        console.log(chalk.gray(`  ${cat.code.trim()} - ${cat.text}`));
      });
    } else {
      console.log(chalk.red(`❌ API call failed with status: ${response.status}`));
    }
    
    // Test 4: Test auto-renewal
    console.log(chalk.yellow('\nTest 4: Simulate expired session...'));
    authManager.currentSession = null; // Force session expiry
    
    const renewResponse = await authManager.makeAuthenticatedRequest(
      'https://www.boniteti.me/company/getactivitydata',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: 'country=Crna Gora'
      }
    );
    
    if (renewResponse.ok) {
      console.log(chalk.green('✅ Auto-renewal successful! Session automatically renewed'));
    } else {
      console.log(chalk.red('❌ Auto-renewal failed'));
    }
    
    console.log(chalk.green.bold('\n✨ All tests completed!\n'));
    
  } catch (error) {
    console.log(chalk.red.bold(`\n❌ Test failed: ${error.message}\n`));
    console.error(error);
    process.exit(1);
  }
}

testAuth();