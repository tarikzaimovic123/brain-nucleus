const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class BonitetiScraper {
  constructor(username, password) {
    this.username = username;
    this.password = password;
    this.browser = null;
    this.page = null;
    this.data = [];
  }

  async init() {
    console.log('🚀 Pokretanje browser-a...');
    this.browser = await puppeteer.launch({
      headless: false, // Postavi na true za produkciju
      defaultViewport: null,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    this.page = await this.browser.newPage();
    
    // Postavi User-Agent
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Omogući JavaScript
    await this.page.setJavaScriptEnabled(true);
    
    // Postavi viewport
    await this.page.setViewport({ width: 1920, height: 1080 });
  }

  async login() {
    try {
      console.log('📝 Navigacija na login stranicu...');
      await this.page.goto('https://www.boniteti.me/user/loginpage', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Čekaj da se učita login forma
      await this.page.waitForSelector('input[name="username"], input#username, input[type="text"]', {
        timeout: 10000
      });

      console.log('🔐 Unos kredencijala...');
      
      // Pokušaj različite selektore za username polje
      const usernameSelectors = [
        'input[name="username"]',
        'input#username',
        'input[placeholder*="korisn"]',
        'input[type="text"]:first-of-type'
      ];
      
      for (const selector of usernameSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 2000 });
          await this.page.click(selector);
          await this.page.type(selector, this.username, { delay: 50 });
          console.log(`✅ Username unet sa selektorom: ${selector}`);
          break;
        } catch (e) {
          console.log(`⚠️ Selektor ${selector} nije pronađen`);
        }
      }

      // Pokušaj različite selektore za password polje
      const passwordSelectors = [
        'input[name="password"]',
        'input#password',
        'input[type="password"]',
        'input[placeholder*="lozink"]'
      ];
      
      for (const selector of passwordSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 2000 });
          await this.page.click(selector);
          await this.page.type(selector, this.password, { delay: 50 });
          console.log(`✅ Password unet sa selektorom: ${selector}`);
          break;
        } catch (e) {
          console.log(`⚠️ Selektor ${selector} nije pronađen`);
        }
      }

      // Pokušaj da nađeš login dugme
      const loginButtonSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:contains("Prijavi")',
        'button:contains("Login")',
        '.btn-primary',
        'button.btn'
      ];

      console.log('🖱️ Klik na login dugme...');
      let clicked = false;
      for (const selector of loginButtonSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 2000 });
          await this.page.click(selector);
          clicked = true;
          console.log(`✅ Kliknuto na dugme sa selektorom: ${selector}`);
          break;
        } catch (e) {
          // Pokušaj sa evaluate
          try {
            await this.page.evaluate((sel) => {
              const button = document.querySelector(sel);
              if (button) {
                button.click();
                return true;
              }
              return false;
            }, selector);
            clicked = true;
            break;
          } catch (evalError) {
            continue;
          }
        }
      }

      if (!clicked) {
        // Ako nijedan selektor nije radio, pokušaj sa Enter
        console.log('⌨️ Pritiskam Enter...');
        await this.page.keyboard.press('Enter');
      }

      // Čekaj navigaciju nakon logina
      await this.page.waitForNavigation({
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      console.log('✅ Login uspešan!');
      
      // Sačuvaj cookies
      const cookies = await this.page.cookies();
      await fs.writeFile('boniteti-cookies.json', JSON.stringify(cookies, null, 2));
      console.log('🍪 Cookies sačuvani');

      return true;
    } catch (error) {
      console.error('❌ Greška pri loginu:', error.message);
      // Napravi screenshot za debug
      await this.page.screenshot({ path: 'login-error.png' });
      return false;
    }
  }

  async navigateToAdvancedSearch() {
    try {
      console.log('🔍 Navigacija na advanced search...');
      await this.page.goto('https://www.boniteti.me/advanced-search-company', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Čekaj da se učita tabela ili grid sa podacima
      await this.page.waitForSelector('table, .grid, .data-table, [role="grid"]', {
        timeout: 15000
      });

      console.log('✅ Advanced search stranica učitana');
      return true;
    } catch (error) {
      console.error('❌ Greška pri navigaciji:', error.message);
      await this.page.screenshot({ path: 'navigation-error.png' });
      return false;
    }
  }

  async extractCompanyData() {
    try {
      console.log('📊 Ekstraktovanje podataka kompanija...');
      
      // Čekaj da se tabela učita
      await this.page.waitForSelector('table tbody tr, .data-row, .company-row', {
        timeout: 10000
      });

      // Ekstraktuj podatke
      const companies = await this.page.evaluate(() => {
        const data = [];
        
        // Pokušaj različite selektore za redove
        let rows = document.querySelectorAll('table tbody tr');
        if (rows.length === 0) {
          rows = document.querySelectorAll('.data-row, .company-row, [role="row"]');
        }

        rows.forEach(row => {
          // Pokušaj da nađeš ćelije
          const cells = row.querySelectorAll('td, .cell, [role="cell"]');
          
          if (cells.length > 0) {
            // Mapiranje kolona - prilagodi prema stvarnoj strukturi
            const company = {
              naziv: cells[0]?.textContent?.trim() || '',
              pib: cells[1]?.textContent?.trim() || '',
              crpsStatus: cells[2]?.textContent?.trim() || '',
              promet2024: cells[3]?.textContent?.trim() || '',
              profit: cells[4]?.textContent?.trim() || '',
              brojZaposlenih: cells[5]?.textContent?.trim() || ''
            };
            
            // Alternativni način - traži po tekstu
            const rowText = row.textContent;
            
            // PIB - 8 ili 9 cifara
            const pibMatch = rowText.match(/\b\d{8,9}\b/);
            if (pibMatch) company.pib = pibMatch[0];
            
            // Broj zaposlenih
            const zaposleniMatch = rowText.match(/(\d+)\s*(zaposlenih|employees)/i);
            if (zaposleniMatch) company.brojZaposlenih = zaposleniMatch[1];
            
            // Promet/Prihod - broj sa valutom
            const prometMatch = rowText.match(/(\d{1,3}(?:\.\d{3})*(?:,\d+)?)\s*(EUR|RSD|€)/);
            if (prometMatch) company.promet2024 = prometMatch[0];
            
            data.push(company);
          }
        });

        return data;
      });

      this.data = companies;
      console.log(`✅ Ekstraktovano ${companies.length} kompanija`);
      
      return companies;
    } catch (error) {
      console.error('❌ Greška pri ekstraktovanju:', error.message);
      await this.page.screenshot({ path: 'extraction-error.png' });
      return [];
    }
  }

  async saveData(format = 'both') {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      if (format === 'json' || format === 'both') {
        const jsonFile = `boniteti-data-${timestamp}.json`;
        await fs.writeFile(jsonFile, JSON.stringify(this.data, null, 2));
        console.log(`📁 JSON sačuvan: ${jsonFile}`);
      }
      
      if (format === 'csv' || format === 'both') {
        const csvFile = `boniteti-data-${timestamp}.csv`;
        const csvHeader = 'Naziv,PIB,CRPS Status,Promet 2024,Profit,Broj Zaposlenih\n';
        const csvData = this.data.map(company => 
          `"${company.naziv}","${company.pib}","${company.crpsStatus}","${company.promet2024}","${company.profit}","${company.brojZaposlenih}"`
        ).join('\n');
        
        await fs.writeFile(csvFile, csvHeader + csvData);
        console.log(`📁 CSV sačuvan: ${csvFile}`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Greška pri čuvanju:', error.message);
      return false;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔒 Browser zatvoren');
    }
  }

  async run() {
    try {
      await this.init();
      
      const loginSuccess = await this.login();
      if (!loginSuccess) {
        throw new Error('Login neuspešan');
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // Pauza nakon logina
      
      const navSuccess = await this.navigateToAdvancedSearch();
      if (!navSuccess) {
        throw new Error('Navigacija neuspešna');
      }
      
      await new Promise(resolve => setTimeout(resolve, 3000)); // Čekaj da se učita
      
      const data = await this.extractCompanyData();
      
      if (data.length > 0) {
        await this.saveData('both');
        console.log('✅ Scraping završen uspešno!');
      } else {
        console.log('⚠️ Nema podataka za čuvanje');
      }
      
    } catch (error) {
      console.error('❌ Fatalna greška:', error.message);
    } finally {
      await this.close();
    }
  }
}

// Pokreni scraper
async function main() {
  const scraper = new BonitetiScraper('SR-03150321', '6413');
  await scraper.run();
}

// Export za korišćenje kao modul
module.exports = BonitetiScraper;

// Pokreni ako je direktno pozvan
if (require.main === module) {
  main().catch(console.error);
}