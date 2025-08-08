const axios = require('axios');
const fs = require('fs').promises;

class BonitetiAPI {
  constructor(username, password) {
    this.username = username;
    this.password = password;
    this.baseURL = 'https://www.boniteti.me';
    this.session = axios.create({
      baseURL: this.baseURL,
      withCredentials: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'sr-RS,sr;q=0.9,en;q=0.8',
        'Content-Type': 'application/json',
        'Origin': 'https://www.boniteti.me',
        'Referer': 'https://www.boniteti.me/user/loginpage'
      }
    });
    this.cookies = null;
    this.authToken = null;
  }

  async login() {
    try {
      console.log('🔐 Pokušavam login preko API-ja...');
      
      // Prvo, dobavi login stranicu da dobiješ session cookie i CSRF token
      const loginPageResponse = await this.session.get('/user/loginpage');
      
      // Ekstraktuj cookies
      const setCookieHeader = loginPageResponse.headers['set-cookie'];
      if (setCookieHeader) {
        this.cookies = setCookieHeader.join('; ');
        this.session.defaults.headers.Cookie = this.cookies;
      }
      
      // Pokušaj različite login endpoint-e
      const loginEndpoints = [
        '/user/login',
        '/api/login',
        '/account/login',
        '/auth/login',
        '/User/Login'
      ];
      
      for (const endpoint of loginEndpoints) {
        try {
          console.log(`📝 Pokušavam endpoint: ${endpoint}`);
          
          const loginResponse = await this.session.post(endpoint, {
            username: this.username,
            password: this.password,
            rememberMe: true
          });
          
          if (loginResponse.status === 200 || loginResponse.status === 302) {
            console.log(`✅ Login uspešan na: ${endpoint}`);
            
            // Ažuriraj cookies
            const newCookies = loginResponse.headers['set-cookie'];
            if (newCookies) {
              this.cookies = newCookies.join('; ');
              this.session.defaults.headers.Cookie = this.cookies;
            }
            
            // Sačuvaj session
            await this.saveSession();
            return true;
          }
        } catch (error) {
          if (error.response?.status === 405) {
            console.log(`⚠️ Method not allowed za ${endpoint}`);
          } else if (error.response?.status === 404) {
            console.log(`⚠️ Endpoint ne postoji: ${endpoint}`);
          }
          continue;
        }
      }
      
      // Ako nijedan API endpoint nije radio, pokušaj form-based login
      console.log('📝 Pokušavam form-based login...');
      
      const formData = new URLSearchParams();
      formData.append('username', this.username);
      formData.append('password', this.password);
      formData.append('rememberMe', 'true');
      
      const formLoginResponse = await this.session.post('/user/loginpage', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      if (formLoginResponse.status === 200 || formLoginResponse.status === 302) {
        console.log('✅ Form login uspešan');
        
        const newCookies = formLoginResponse.headers['set-cookie'];
        if (newCookies) {
          this.cookies = newCookies.join('; ');
          this.session.defaults.headers.Cookie = this.cookies;
        }
        
        await this.saveSession();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Login greška:', error.message);
      if (error.response) {
        console.log('Response status:', error.response.status);
        console.log('Response headers:', error.response.headers);
      }
      return false;
    }
  }
  
  async saveSession() {
    const sessionData = {
      cookies: this.cookies,
      authToken: this.authToken,
      timestamp: new Date().toISOString()
    };
    await fs.writeFile('boniteti-session.json', JSON.stringify(sessionData, null, 2));
    console.log('💾 Session sačuvan');
  }
  
  async loadSession() {
    try {
      const sessionData = await fs.readFile('boniteti-session.json', 'utf8');
      const session = JSON.parse(sessionData);
      
      // Proveri da li je session star više od 24h
      const sessionAge = Date.now() - new Date(session.timestamp).getTime();
      if (sessionAge > 24 * 60 * 60 * 1000) {
        console.log('⚠️ Session je star, potreban novi login');
        return false;
      }
      
      this.cookies = session.cookies;
      this.authToken = session.authToken;
      this.session.defaults.headers.Cookie = this.cookies;
      
      console.log('✅ Session učitan');
      return true;
    } catch (error) {
      console.log('📝 Nema sačuvanog session-a');
      return false;
    }
  }
  
  async getCompanyData() {
    try {
      console.log('📊 Preuzimam podatke kompanija...');
      
      // Pokušaj da učitaš advanced search stranicu
      const response = await this.session.get('/advanced-search-company');
      
      if (response.status === 200) {
        // Ako je HTML, trebalo bi parsirati
        const html = response.data;
        
        // Sačuvaj HTML za debug
        await fs.writeFile('boniteti-page.html', html);
        console.log('📁 HTML stranica sačuvana u boniteti-page.html');
        
        // Pokušaj da nađeš API endpoint za podatke
        const apiEndpoints = [
          '/api/companies/search',
          '/api/advanced-search',
          '/company/search',
          '/Company/GetCompanies',
          '/api/company/list'
        ];
        
        for (const endpoint of apiEndpoints) {
          try {
            console.log(`🔍 Pokušavam API: ${endpoint}`);
            const apiResponse = await this.session.get(endpoint);
            
            if (apiResponse.status === 200 && apiResponse.data) {
              console.log(`✅ Podaci pronađeni na: ${endpoint}`);
              return apiResponse.data;
            }
          } catch (error) {
            continue;
          }
        }
        
        // Ako nema API-ja, parsiraj HTML
        console.log('📝 Parsiram HTML...');
        return this.parseHTMLData(html);
      }
      
      return null;
    } catch (error) {
      console.error('❌ Greška pri preuzimanju podataka:', error.message);
      if (error.response?.status === 401) {
        console.log('⚠️ Neautorizovan pristup, potreban login');
      }
      return null;
    }
  }
  
  parseHTMLData(html) {
    // Osnovni HTML parser bez external biblioteka
    const companies = [];
    
    // Traži tabelu sa podacima
    const tableMatch = html.match(/<table[^>]*>[\s\S]*?<\/table>/gi);
    if (!tableMatch) {
      console.log('⚠️ Tabela nije pronađena u HTML-u');
      return companies;
    }
    
    // Ekstraktuj redove
    const rowMatches = tableMatch[0].match(/<tr[^>]*>[\s\S]*?<\/tr>/gi);
    if (rowMatches) {
      rowMatches.forEach((row, index) => {
        if (index === 0) return; // Skip header
        
        const cellMatches = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
        if (cellMatches && cellMatches.length >= 5) {
          companies.push({
            naziv: this.cleanHTML(cellMatches[0]),
            pib: this.cleanHTML(cellMatches[1]),
            crpsStatus: this.cleanHTML(cellMatches[2]),
            promet2024: this.cleanHTML(cellMatches[3]),
            profit: this.cleanHTML(cellMatches[4]),
            brojZaposlenih: cellMatches[5] ? this.cleanHTML(cellMatches[5]) : ''
          });
        }
      });
    }
    
    return companies;
  }
  
  cleanHTML(text) {
    return text.replace(/<[^>]*>/g, '').trim();
  }
  
  async run() {
    try {
      // Pokušaj da učitaš postojeći session
      const sessionLoaded = await this.loadSession();
      
      if (!sessionLoaded) {
        // Ako nema session-a, logiraj se
        const loginSuccess = await this.login();
        if (!loginSuccess) {
          throw new Error('Login neuspešan');
        }
      }
      
      // Preuzmi podatke
      const data = await this.getCompanyData();
      
      if (data) {
        // Sačuvaj podatke
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `boniteti-data-${timestamp}.json`;
        await fs.writeFile(filename, JSON.stringify(data, null, 2));
        console.log(`✅ Podaci sačuvani u: ${filename}`);
      } else {
        console.log('⚠️ Nema podataka za čuvanje');
      }
      
    } catch (error) {
      console.error('❌ Fatalna greška:', error.message);
    }
  }
}

// Instaliraj axios ako nije instaliran
async function checkDependencies() {
  try {
    require('axios');
  } catch (error) {
    console.log('📦 Instaliram axios...');
    const { execSync } = require('child_process');
    execSync('npm install axios', { stdio: 'inherit' });
  }
}

async function main() {
  await checkDependencies();
  const scraper = new BonitetiAPI('SR-03150321', '6413');
  await scraper.run();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = BonitetiAPI;