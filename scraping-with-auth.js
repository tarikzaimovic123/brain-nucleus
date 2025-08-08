// Web Scraping sa autorizacijom - različiti pristupi

// ============================================
// 1. FIRECRAWL SA ACTIONS (preporučeno)
// ============================================
const firecrawlWithAuth = {
  url: "https://example.com/login",
  actions: [
    // Čekaj da se stranica učita
    { type: "wait", milliseconds: 2000 },
    
    // Unesi korisničko ime
    { 
      type: "write", 
      selector: "#username", 
      text: "your-username" 
    },
    
    // Unesi lozinku
    { 
      type: "write", 
      selector: "#password", 
      text: "your-password" 
    },
    
    // Klikni na login dugme
    { 
      type: "click", 
      selector: "#login-button" 
    },
    
    // Čekaj da se učita dashboard
    { type: "wait", milliseconds: 3000 },
    
    // Navigiraj do željene stranice
    { 
      type: "click", 
      selector: "a[href='/protected-data']" 
    },
    
    // Skrejpuj podatke
    { type: "scrape" }
  ],
  formats: ["markdown", "html"]
};

// ============================================
// 2. PUPPETEER/PLAYWRIGHT pristup
// ============================================
const puppeteer = require('puppeteer');

async function scrapeWithPuppeteer(loginUrl, username, password) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Idi na login stranicu
    await page.goto(loginUrl);
    
    // Popuni login formu
    await page.type('#username', username);
    await page.type('#password', password);
    
    // Klikni login
    await page.click('#login-button');
    
    // Čekaj navigaciju
    await page.waitForNavigation();
    
    // Sačuvaj cookies
    const cookies = await page.cookies();
    
    // Idi na zaštićenu stranicu
    await page.goto('https://example.com/protected-data');
    
    // Ekstraktuj podatke
    const data = await page.evaluate(() => {
      const elements = document.querySelectorAll('.data-item');
      return Array.from(elements).map(el => ({
        title: el.querySelector('.title')?.textContent,
        value: el.querySelector('.value')?.textContent
      }));
    });
    
    return data;
    
  } finally {
    await browser.close();
  }
}

// ============================================
// 3. AXIOS/FETCH sa session management
// ============================================
const axios = require('axios');

class AuthenticatedScraper {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.session = axios.create({
      baseURL: baseUrl,
      withCredentials: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    this.token = null;
  }
  
  async login(username, password) {
    try {
      // POST login request
      const response = await this.session.post('/api/login', {
        username,
        password
      });
      
      // Sačuvaj token ili session cookie
      if (response.data.token) {
        this.token = response.data.token;
        this.session.defaults.headers.Authorization = `Bearer ${this.token}`;
      }
      
      // Cookies se automatski čuvaju sa withCredentials: true
      return response.data;
      
    } catch (error) {
      console.error('Login failed:', error.message);
      throw error;
    }
  }
  
  async scrapeProtectedData(endpoint) {
    try {
      const response = await this.session.get(endpoint);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('Session expired, need to re-login');
        // Ponovi login
      }
      throw error;
    }
  }
}

// ============================================
// 4. HANDLING različitih tipova autentifikacije
// ============================================

// OAuth 2.0
async function oauthFlow(clientId, clientSecret, authUrl) {
  // 1. Redirect to auth provider
  // 2. Get authorization code
  // 3. Exchange for access token
  // 4. Use token for API calls
}

// JWT Token
async function jwtAuth(loginUrl, credentials) {
  const response = await fetch(loginUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  
  const { token } = await response.json();
  
  // Koristi token za buduće zahteve
  return {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
}

// Basic Auth
const basicAuth = {
  auth: {
    username: 'user',
    password: 'pass'
  }
};

// Session-based auth sa CSRF token
async function sessionWithCSRF(loginUrl) {
  // 1. GET login page za CSRF token
  const loginPage = await fetch(loginUrl);
  const html = await loginPage.text();
  const csrfToken = extractCSRFToken(html);
  
  // 2. POST login sa CSRF token
  const response = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'X-CSRF-Token': csrfToken,
      'Cookie': loginPage.headers.get('set-cookie')
    },
    body: new URLSearchParams({
      username: 'user',
      password: 'pass',
      csrf_token: csrfToken
    })
  });
  
  return response;
}

// ============================================
// 5. PRIMERI KORIŠĆENJA
// ============================================

// Primer 1: Scrape LinkedIn (sa Puppeteer)
async function scrapeLinkedIn() {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  
  // Login
  await page.goto('https://www.linkedin.com/login');
  await page.type('#username', 'your-email@example.com');
  await page.type('#password', 'your-password');
  await page.click('[type="submit"]');
  await page.waitForNavigation();
  
  // Scrape profile
  await page.goto('https://www.linkedin.com/in/some-profile');
  const profileData = await page.evaluate(() => {
    return {
      name: document.querySelector('.text-heading-xlarge')?.textContent,
      title: document.querySelector('.text-body-medium')?.textContent,
      // ... ostali podaci
    };
  });
  
  await browser.close();
  return profileData;
}

// Primer 2: API sa token autentifikacijom
async function scrapeAPIWithToken() {
  const scraper = new AuthenticatedScraper('https://api.example.com');
  
  // Login i dobij token
  await scraper.login('username', 'password');
  
  // Skrejpuj zaštićene podatke
  const data = await scraper.scrapeProtectedData('/api/protected/data');
  
  return data;
}

// ============================================
// 6. NAJBOLJE PRAKSE
// ============================================
const bestPractices = {
  // Rate limiting
  rateLimit: async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
  },
  
  // Retry logic
  retryRequest: async (fn, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
      }
    }
  },
  
  // Session persistence
  saveSession: (cookies) => {
    fs.writeFileSync('session.json', JSON.stringify(cookies));
  },
  
  loadSession: () => {
    if (fs.existsSync('session.json')) {
      return JSON.parse(fs.readFileSync('session.json'));
    }
    return null;
  },
  
  // User-Agent rotation
  getRandomUserAgent: () => {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }
};

module.exports = {
  firecrawlWithAuth,
  scrapeWithPuppeteer,
  AuthenticatedScraper,
  scrapeLinkedIn,
  scrapeAPIWithToken,
  bestPractices
};