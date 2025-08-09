#!/usr/bin/env node

import fetch from 'node-fetch';
import chalk from 'chalk';
import { JSDOM } from 'jsdom';
import tough from 'tough-cookie';
import dotenv from 'dotenv';

dotenv.config();

class AuthManager {
  constructor() {
    this.cookieJar = new tough.CookieJar();
    this.credentials = {
      username: process.env.BONITETI_USERNAME || 'SR-03150321',
      password: process.env.BONITETI_PASSWORD || '6413'
    };
    this.loginUrl = 'https://www.boniteti.me/user/loginpage';
    this.apiUrl = 'https://www.boniteti.me/company/getactivitydata';
    this.currentSession = null;
    this.sessionExpiry = null;
    this.existingSessionToken = null;
  }
  
  // Method to set existing session from dashboard
  setExistingSession(sessionToken) {
    this.existingSessionToken = sessionToken;
    this.log('info', 'Using existing session token from dashboard');
    
    // Parse cookies and add to jar
    if (sessionToken) {
      const cookies = sessionToken.split('; ');
      cookies.forEach(cookieStr => {
        try {
          const [name, value] = cookieStr.split('=');
          const cookie = new tough.Cookie({
            key: name,
            value: value || '',
            domain: 'www.boniteti.me',
            path: '/',
            httpOnly: true,
            secure: true
          });
          this.cookieJar.setCookieSync(cookie, 'https://www.boniteti.me');
        } catch (err) {
          // Ignore cookie parse errors
        }
      });
      this.currentSession = sessionToken;
    }
  }

  log(level, message) {
    const timestamp = new Date().toISOString();
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      error: chalk.red,
      warn: chalk.yellow
    };
    console.log(colors[level](`[${timestamp}] [${level.toUpperCase()}] ${message}`));
  }

  async login() {
    // Skip login if we already have an existing session
    if (this.existingSessionToken) {
      this.log('info', 'Skipping login - using existing session from dashboard');
      return true;
    }
    
    try {
      this.log('info', 'Starting login process...');
      
      // Step 1: Get initial cookies from login page
      const loginPageResponse = await fetch(this.loginUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      if (!loginPageResponse.ok) {
        throw new Error(`Failed to fetch login page: ${loginPageResponse.status}`);
      }

      // Extract cookies from response
      const setCookieHeaders = loginPageResponse.headers.raw()['set-cookie'];
      if (setCookieHeaders) {
        setCookieHeaders.forEach(cookieStr => {
          const cookie = tough.Cookie.parse(cookieStr);
          if (cookie) {
            this.cookieJar.setCookieSync(cookie, this.loginUrl);
          }
        });
      }

      // Step 2: Submit login via AJAX endpoint
      const cookieString = await this.cookieJar.getCookieString(this.loginUrl);
      
      const loginData = new URLSearchParams();
      loginData.append('userName', this.credentials.username);
      loginData.append('password', this.credentials.password);
      loginData.append('rememberMe', 'false');

      const loginResponse = await fetch('https://www.boniteti.me/user/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Cookie': cookieString,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'X-Requested-With': 'XMLHttpRequest',
          'Origin': 'https://www.boniteti.me',
          'Referer': 'https://www.boniteti.me/user/loginpage'
        },
        body: loginData.toString()
      });

      const responseText = await loginResponse.text();
      
      // Check if login was successful (expects "OK" response)
      if (responseText !== 'OK') {
        throw new Error(`Login failed: ${responseText}`);
      }

      // Extract session cookies
      const loginCookies = loginResponse.headers.raw()['set-cookie'];
      if (loginCookies) {
        loginCookies.forEach(cookieStr => {
          const cookie = tough.Cookie.parse(cookieStr);
          if (cookie) {
            this.cookieJar.setCookieSync(cookie, 'https://www.boniteti.me');
          }
        });
      }

      // Get final cookie string for API calls
      this.currentSession = await this.cookieJar.getCookieString(this.apiUrl);
      this.sessionExpiry = Date.now() + (60 * 60 * 1000); // Session valid for 1 hour
      
      this.log('success', `Login successful! Session obtained for user: ${this.credentials.username}`);
      this.log('info', `Session cookies: ${this.currentSession.substring(0, 50)}...`);
      
      return this.currentSession;
    } catch (error) {
      this.log('error', `Login failed: ${error.message}`);
      throw error;
    }
  }

  async validateSession() {
    // Check if we have a session and it's not expired
    if (!this.currentSession || Date.now() >= this.sessionExpiry) {
      this.log('warn', 'Session expired or not found, need to login');
      return false;
    }

    try {
      // Test the session with a simple API call
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Cookie': this.currentSession,
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: 'country=Crna Gora'
      });

      if (response.status === 401 || response.status === 403) {
        this.log('warn', 'Session invalid (401/403), need to re-login');
        return false;
      }

      if (response.ok) {
        this.log('info', 'Session is valid');
        return true;
      }

      return false;
    } catch (error) {
      this.log('error', `Session validation failed: ${error.message}`);
      return false;
    }
  }

  async getValidSession() {
    // Check if current session is valid
    const isValid = await this.validateSession();
    
    if (isValid) {
      return this.currentSession;
    }

    // Need to login to get new session
    this.log('info', 'Getting new session...');
    return await this.login();
  }

  async makeAuthenticatedRequest(url, options = {}) {
    let retries = 2;
    
    while (retries > 0) {
      try {
        const session = await this.getValidSession();
        
        // Add session cookies to request
        const headers = {
          ...options.headers,
          'Cookie': session
        };

        const response = await fetch(url, {
          ...options,
          headers
        });

        // If unauthorized, invalidate session and retry
        if (response.status === 401 || response.status === 403) {
          this.log('warn', 'Request returned 401/403, invalidating session');
          this.currentSession = null;
          retries--;
          continue;
        }

        return response;
      } catch (error) {
        this.log('error', `Request failed: ${error.message}`);
        retries--;
        if (retries === 0) throw error;
      }
    }

    throw new Error('Failed to make authenticated request after retries');
  }
}

// Export for use in other modules
export default AuthManager;

// Test the auth manager if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const authManager = new AuthManager();
  
  console.log(chalk.cyan.bold('\n🔐 Testing Boniteti Authentication Manager\n'));
  
  authManager.login()
    .then(async (session) => {
      console.log(chalk.green.bold('\n✅ Login successful!\n'));
      
      // Test API call with the session
      console.log(chalk.cyan('Testing API call with new session...'));
      
      const response = await authManager.makeAuthenticatedRequest(
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
      
      if (response.ok) {
        const data = await response.json();
        console.log(chalk.green(`✅ API call successful! Received ${data.length} activities`));
      } else {
        console.log(chalk.red(`❌ API call failed: ${response.status}`));
      }
    })
    .catch(error => {
      console.log(chalk.red.bold(`\n❌ Authentication failed: ${error.message}\n`));
      process.exit(1);
    });
}