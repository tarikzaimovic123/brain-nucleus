const axios = require('axios');
const fs = require('fs').promises;

class BonitetiAPIScraper {
  constructor(username, password) {
    this.username = username;
    this.password = password;
    this.baseURL = 'https://www.boniteti.me';
    this.session = null;
    this.cookies = null;
  }

  async init() {
    this.session = axios.create({
      baseURL: this.baseURL,
      withCredentials: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en-US,en;q=0.9,sr-RS;q=0.8,sr;q=0.7',
        'Referer': 'https://www.boniteti.me/advanced-search-company',
        'X-Requested-With': 'XMLHttpRequest',
        'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin'
      }
    });
  }

  async loadSession() {
    try {
      const sessionData = await fs.readFile('boniteti-session.json', 'utf8');
      const session = JSON.parse(sessionData);
      
      // Ekstraktuj cookies
      this.cookies = session.cookies;
      
      // Postavi cookies u header
      this.session.defaults.headers.Cookie = this.cookies;
      
      console.log('✅ Session učitan iz fajla');
      return true;
    } catch (error) {
      console.log('❌ Nema sačuvanog session-a, potreban login');
      return false;
    }
  }

  async login() {
    try {
      console.log('🔐 Pokušavam login...');
      
      // Form data za login
      const formData = new URLSearchParams();
      formData.append('username', this.username);
      formData.append('password', this.password);
      formData.append('rememberMe', 'true');
      
      const loginResponse = await this.session.post('/user/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      if (loginResponse.status === 200 || loginResponse.status === 302) {
        console.log('✅ Login uspešan');
        
        // Sačuvaj cookies
        const setCookieHeader = loginResponse.headers['set-cookie'];
        if (setCookieHeader) {
          this.cookies = setCookieHeader.join('; ');
          this.session.defaults.headers.Cookie = this.cookies;
          
          // Sačuvaj session
          await fs.writeFile('boniteti-session.json', JSON.stringify({
            cookies: this.cookies,
            timestamp: new Date().toISOString()
          }, null, 2));
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Login greška:', error.message);
      return false;
    }
  }

  buildSearchParams(params = {}) {
    // Defaultni parametri za pretraživanje
    const defaultParams = {
      'sp[companyCountry]': 'Crna Gora',
      'sp[companyLastFinReportYear]': '2024',
      'sp[companyFinReportCurrency]': 'EUR',
      'sp[orderByParameter]': 'revenue',
      'sp[orderingType]': 'Opadajuće',
      'sp[orderingByParameter]': 'Pokazatelju',
      // Dodaj sve delatnosti
      'sp[companyActivityCode][]': [
        'A - POLjOPRIVREDA, ŠUMARSTVO I RIBARSTVO',
        'B - RUDARSTVO',
        'C - PRERAĐIVAČKA INDUSTRIJA',
        'D - SNABDEVANjE ELEKTRIČNOM ENERGIJOM, GASOM, PAROM I KLIMATIZACIJA',
        'E - SNABDEVANjE VODOM; UPRAVLjANjE OTPADNIM VODAMA, KONTROLISANjE PROCESA UKLANjANjA OTPADA I SLIČNE AKTIVNOSTI',
        'F - GRAĐEVINARSTVO',
        'G - TRGOVINA NA VELIKO I TRGOVINA NA MALO; POPRAVKA MOTORNIH VOZILA I MOTOCIKALA',
        'H - SAOBRAĆAJ I SKLADIŠTENJE',
        'I - USLUGE PRUŽANJA SMJEŠTAJA I ISHRANE',
        'J - INFORMISANJE I KOMUNIKACIJE',
        'K - FINANSIJSKE DJELATNOSTI I DJELATNOST OSIGURANJA',
        'L - POSLOVANJE NEKRETNINAMA',
        'M - STRUČNE, NAUČNE I TEHNIČKE DJELATNOSTI',
        'N - ADMINISTRATIVNE I POMOĆNE USLUŽNE DJELATNOSTI',
        'O - DRŽAVNA UPRAVA I ODBRANA; OBAVEZNO SOCIJALNO OSIGURANJE',
        'P - OBRAZOVANJE',
        'Q - ZDRAVSTVENA I SOCIJALNA ZAŠTITA',
        'R - UMJETNOST, ZABAVA I REKREACIJA',
        'S - OSTALE USLUŽNE DJELATNOSTI'
      ]
    };
    
    return { ...defaultParams, ...params };
  }

  async getTotalCount(searchParams = {}) {
    try {
      const params = this.buildSearchParams(searchParams);
      
      const response = await this.session.get('/searchcompany/getcompanytotalcount', {
        params: params
      });
      
      if (response.data) {
        console.log(`📊 Ukupan broj kompanija: ${response.data}`);
        return response.data;
      }
      
      return 0;
    } catch (error) {
      console.error('❌ Greška pri dobijanju broja rezultata:', error.message);
      return 0;
    }
  }

  async getCompanies(searchParams = {}, page = 1, pageSize = 50) {
    try {
      console.log(`📄 Preuzimam stranicu ${page}...`);
      
      const params = {
        ...this.buildSearchParams(searchParams),
        page: page,
        pageSize: pageSize
      };
      
      // Pokušaj različite endpointe
      const endpoints = [
        '/searchcompany/getcompanies',
        '/searchcompany/search',
        '/searchcompany/GetCompanyList',
        '/searchcompany/GetCompanies',
        '/advanced-search-company/GetData'
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Pokušavam endpoint: ${endpoint}`);
          
          const response = await this.session.get(endpoint, {
            params: params
          });
          
          if (response.data && (Array.isArray(response.data) || response.data.companies || response.data.data)) {
            console.log(`✅ Podatke pronađeni na: ${endpoint}`);
            
            // Ekstraktuj kompanije iz različitih formata
            let companies = response.data;
            if (response.data.companies) companies = response.data.companies;
            if (response.data.data) companies = response.data.data;
            
            return companies;
          }
        } catch (error) {
          if (error.response?.status !== 404) {
            console.log(`⚠️ Endpoint ${endpoint}: ${error.response?.status || error.message}`);
          }
          continue;
        }
      }
      
      // Ako API ne radi, pokušaj POST metodu
      console.log('🔄 Pokušavam POST metodu...');
      
      const postResponse = await this.session.post('/searchcompany/getcompanies', params);
      
      if (postResponse.data) {
        return postResponse.data;
      }
      
      return [];
    } catch (error) {
      console.error('❌ Greška pri preuzimanju kompanija:', error.message);
      return [];
    }
  }

  async scrapeAllCompanies(searchParams = {}) {
    try {
      // Dobij ukupan broj
      const totalCount = await this.getTotalCount(searchParams);
      
      if (totalCount === 0) {
        console.log('⚠️ Nema rezultata za datu pretragu');
        return [];
      }
      
      const pageSize = 50;
      const totalPages = Math.ceil(totalCount / pageSize);
      console.log(`📖 Ukupno stranica: ${totalPages}`);
      
      let allCompanies = [];
      
      // Preuzmi sve stranice
      for (let page = 1; page <= Math.min(totalPages, 10); page++) { // Ograniči na prvih 10 stranica za test
        const companies = await this.getCompanies(searchParams, page, pageSize);
        
        if (companies.length > 0) {
          allCompanies = allCompanies.concat(companies);
          console.log(`✅ Stranica ${page}/${totalPages} - preuzeto ${companies.length} kompanija`);
          
          // Pauza između zahteva
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.log(`⚠️ Stranica ${page} nema podataka`);
          break;
        }
      }
      
      return allCompanies;
    } catch (error) {
      console.error('❌ Greška pri skrejpovanju:', error.message);
      return [];
    }
  }

  parseCompanyData(companies) {
    // Parsiraj i formatiraj podatke
    return companies.map(company => ({
      naziv: company.CompanyName || company.Name || company.naziv || '',
      pib: company.TaxNumber || company.PIB || company.pib || '',
      maticniBroj: company.RegistrationNumber || company.MaticniBroj || '',
      crpsStatus: company.CRPSStatus || company.Status || '',
      promet2024: company.Revenue || company.SalesIncome || company.Promet || 0,
      profit: company.NetProfit || company.Profit || 0,
      brojZaposlenih: company.NumberOfEmployees || company.Employees || 0,
      grad: company.Place || company.City || '',
      adresa: company.Address || '',
      delatnost: company.ActivityCode || company.Activity || '',
      email: company.Email || '',
      telefon: company.Phone || '',
      webSajt: company.Website || '',
      datumOsnivanja: company.FoundingDate || '',
      kapital: company.Capital || 0,
      bonitetniSkor: company.BonitetScore || '',
      // Dodatni finansijski pokazatelji
      ukupnaAktiva: company.TotalAssets || 0,
      ukupneObaveze: company.TotalLiabilities || 0,
      pokazateljLikvidnosti: company.LiquidityRatio || 0,
      pokazateljProfitabilnosti: company.ProfitabilityRatio || 0
    }));
  }

  async saveToCSV(companies, filename = 'boniteti-companies.csv') {
    try {
      const headers = [
        'Naziv',
        'PIB',
        'Matični broj',
        'CRPS Status',
        'Promet 2024 (EUR)',
        'Profit (EUR)',
        'Broj zaposlenih',
        'Grad',
        'Adresa',
        'Delatnost',
        'Email',
        'Telefon',
        'Web sajt',
        'Datum osnivanja',
        'Kapital (EUR)',
        'Bonitetni skor'
      ].join(',');
      
      const rows = companies.map(c => [
        `"${c.naziv}"`,
        c.pib,
        c.maticniBroj,
        `"${c.crpsStatus}"`,
        c.promet2024,
        c.profit,
        c.brojZaposlenih,
        `"${c.grad}"`,
        `"${c.adresa}"`,
        `"${c.delatnost}"`,
        c.email,
        c.telefon,
        c.webSajt,
        c.datumOsnivanja,
        c.kapital,
        c.bonitetniSkor
      ].join(','));
      
      const csv = [headers, ...rows].join('\n');
      
      await fs.writeFile(filename, csv, 'utf8');
      console.log(`📁 CSV sačuvan: ${filename}`);
    } catch (error) {
      console.error('❌ Greška pri čuvanju CSV:', error.message);
    }
  }

  async run() {
    try {
      await this.init();
      
      // Pokušaj da učitaš session
      const sessionLoaded = await this.loadSession();
      
      if (!sessionLoaded) {
        // Login ako nema session-a
        const loginSuccess = await this.login();
        if (!loginSuccess) {
          throw new Error('Login neuspešan');
        }
      }
      
      console.log('🔍 Započinjem pretraživanje...');
      
      // Parametri pretrage - možeš prilagoditi
      const searchParams = {
        // 'sp[salesIncomeFrom]': '100000', // Minimalni promet
        // 'sp[numberOfEmployeesFrom]': '10', // Minimum zaposlenih
        // 'sp[companyRegion]': 'Podgorica' // Region
      };
      
      // Preuzmi kompanije
      const companies = await this.scrapeAllCompanies(searchParams);
      
      if (companies.length > 0) {
        console.log(`✅ Preuzeto ukupno ${companies.length} kompanija`);
        
        // Parsiraj podatke
        const parsedCompanies = this.parseCompanyData(companies);
        
        // Sačuvaj u JSON
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const jsonFile = `boniteti-data-${timestamp}.json`;
        await fs.writeFile(jsonFile, JSON.stringify(parsedCompanies, null, 2));
        console.log(`📁 JSON sačuvan: ${jsonFile}`);
        
        // Sačuvaj u CSV
        const csvFile = `boniteti-data-${timestamp}.csv`;
        await this.saveToCSV(parsedCompanies, csvFile);
        
        // Prikaži prvih 5 kompanija
        console.log('\n📊 Primeri preuzetih kompanija:');
        parsedCompanies.slice(0, 5).forEach((c, i) => {
          console.log(`${i + 1}. ${c.naziv}`);
          console.log(`   PIB: ${c.pib}`);
          console.log(`   Promet: €${c.promet2024}`);
          console.log(`   Zaposleni: ${c.brojZaposlenih}`);
          console.log('---');
        });
      } else {
        console.log('⚠️ Nema podataka za čuvanje');
      }
      
    } catch (error) {
      console.error('❌ Fatalna greška:', error.message);
    }
  }
}

// Pokreni
async function main() {
  const scraper = new BonitetiAPIScraper('SR-03150321', '6413');
  await scraper.run();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = BonitetiAPIScraper;