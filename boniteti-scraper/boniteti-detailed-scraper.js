const fs = require('fs');
const axios = require('axios');

class BonitetiDetailedScraper {
  constructor(sessionCookies) {
    this.baseURL = 'https://www.boniteti.me';
    this.cookies = sessionCookies || 'ASP.NET_SessionId=tkebso4v3hnqgpgqz2lmma4a; Boniteti.me.UserCheck=6F88B9041376C77AAEE47841A835C38C';
    this.session = axios.create({
      baseURL: this.baseURL,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,sr-RS;q=0.8,sr;q=0.7',
        'Cookie': this.cookies,
        'Referer': 'https://www.boniteti.me/advanced-search-company'
      },
      timeout: 30000
    });
  }

  // Učitaj postojeće kompanije
  async loadCompanies() {
    const rawData = fs.readFileSync('boniteti_all_data_20250808_033902.json', 'utf8');
    const jsonStrings = rawData.split('}{').map((str, i, arr) => {
      if (i === 0) return str + '}';
      if (i === arr.length - 1) return '{' + str;
      return '{' + str + '}';
    });

    let allCompanies = [];
    jsonStrings.forEach(jsonStr => {
      try {
        const data = JSON.parse(jsonStr);
        if (data.Data && Array.isArray(data.Data)) {
          allCompanies = allCompanies.concat(data.Data);
        }
      } catch (e) {}
    });

    return allCompanies;
  }

  // Ekstraktuj podatke iz HTML-a
  extractDataFromHTML(html, type) {
    const data = {};
    
    if (type === 'registration') {
      // Izvuci registracione podatke
      
      // Šifra delatnosti
      const activityMatch = html.match(/Šifra\s+djelatnosti[:\s]*<[^>]*>([^<]+)</i);
      if (activityMatch) data.activityCode = activityMatch[1].trim();
      
      // Naziv delatnosti
      const activityNameMatch = html.match(/Naziv\s+djelatnosti[:\s]*<[^>]*>([^<]+)</i);
      if (activityNameMatch) data.activityName = activityNameMatch[1].trim();
      
      // Pravna forma
      const legalFormMatch = html.match(/Pravna\s+forma[:\s]*<[^>]*>([^<]+)</i);
      if (legalFormMatch) data.legalForm = legalFormMatch[1].trim();
      
      // Veličina preduzeća
      const sizeMatch = html.match(/Veličina\s+preduzeća[:\s]*<[^>]*>([^<]+)</i);
      if (sizeMatch) data.companySize = sizeMatch[1].trim();
      
      // Adresa
      const addressMatch = html.match(/Adresa[:\s]*<[^>]*>([^<]+)</i);
      if (addressMatch) data.address = addressMatch[1].trim();
      
      // Grad
      const cityMatch = html.match(/Grad[:\s]*<[^>]*>([^<]+)</i);
      if (cityMatch) data.city = cityMatch[1].trim();
      
      // Email
      const emailMatch = html.match(/Email[:\s]*<[^>]*>([^<]+)</i);
      if (emailMatch) data.email = emailMatch[1].trim();
      
      // Telefon
      const phoneMatch = html.match(/Telefon[:\s]*<[^>]*>([^<]+)</i);
      if (phoneMatch) data.phone = phoneMatch[1].trim();
      
      // Website
      const webMatch = html.match(/Web\s+sajt[:\s]*<[^>]*>([^<]+)</i);
      if (webMatch) data.website = webMatch[1].trim();
      
      // Osnivači
      const foundersMatch = html.match(/Osnivači[:\s]*<[^>]*>([^<]+)</i);
      if (foundersMatch) data.founders = foundersMatch[1].trim();
      
      // Osnovni kapital
      const capitalMatch = html.match(/Osnovni\s+kapital[:\s]*<[^>]*>([^<]+)</i);
      if (capitalMatch) data.registeredCapital = capitalMatch[1].trim();
    }
    
    if (type === 'business-results') {
      // Izvuci poslovne rezultate
      
      // Pokušaj da izvučeš JSON podatke ako postoje
      const jsonMatch = html.match(/var\s+chartData\s*=\s*(\{[^}]+\})/);
      if (jsonMatch) {
        try {
          const chartData = JSON.parse(jsonMatch[1]);
          data.businessResults = chartData;
        } catch (e) {}
      }
      
      // Alternativno, traži tabele sa podacima
      const revenueMatch = html.match(/Prihodi?[:\s]*<[^>]*>([0-9,.\s]+)/i);
      if (revenueMatch) data.totalRevenue = revenueMatch[1].replace(/[^\d]/g, '');
      
      const expensesMatch = html.match(/Rashodi?[:\s]*<[^>]*>([0-9,.\s]+)/i);
      if (expensesMatch) data.totalExpenses = expensesMatch[1].replace(/[^\d]/g, '');
      
      const ebitdaMatch = html.match(/EBITDA[:\s]*<[^>]*>([0-9,.\s-]+)/i);
      if (ebitdaMatch) data.ebitda = ebitdaMatch[1].replace(/[^\d-]/g, '');
    }
    
    return data;
  }

  // Preuzmi detalje za jednu kompaniju
  async getCompanyDetails(company) {
    const result = {
      ...company,
      detailedData: {},
      errors: []
    };
    
    try {
      // 1. Registration data
      const regUrl = company.CompanyUrl.replace('quick-view', 'registration-data');
      console.log(`  📄 Preuzimam registracione podatke: ${regUrl}`);
      
      try {
        const regResponse = await this.session.get(regUrl);
        const regData = this.extractDataFromHTML(regResponse.data, 'registration');
        result.detailedData = { ...result.detailedData, ...regData };
      } catch (e) {
        result.errors.push(`Registration data error: ${e.message}`);
      }
      
      // 2. Business results
      const bizUrl = company.CompanyUrl.replace('quick-view', 'business-results');
      console.log(`  📊 Preuzimam poslovne rezultate: ${bizUrl}`);
      
      try {
        const bizResponse = await this.session.get(bizUrl);
        const bizData = this.extractDataFromHTML(bizResponse.data, 'business-results');
        result.detailedData = { ...result.detailedData, ...bizData };
      } catch (e) {
        result.errors.push(`Business results error: ${e.message}`);
      }
      
      // Pauza između zahteva
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`  ❌ Greška za ${company.Name}: ${error.message}`);
      result.errors.push(error.message);
    }
    
    return result;
  }

  // Glavni proces
  async run(limit = 5) {
    console.log('🚀 Početak detaljnog skrejpovanja...');
    
    // Učitaj kompanije
    const companies = await this.loadCompanies();
    console.log(`📊 Učitano ${companies.length} kompanija`);
    
    // Uzmi samo prvih N kompanija za test
    const testCompanies = companies.slice(0, limit);
    console.log(`🔍 Preuzimam detalje za prvih ${limit} kompanija...`);
    
    const detailedCompanies = [];
    
    for (let i = 0; i < testCompanies.length; i++) {
      const company = testCompanies[i];
      console.log(`\n${i + 1}/${limit}: ${company.Name}`);
      
      const detailed = await this.getCompanyDetails(company);
      detailedCompanies.push(detailed);
      
      // Prikaži pronađene podatke
      if (detailed.detailedData.activityCode) {
        console.log(`  ✅ Šifra delatnosti: ${detailed.detailedData.activityCode}`);
      }
      if (detailed.detailedData.activityName) {
        console.log(`  ✅ Naziv delatnosti: ${detailed.detailedData.activityName}`);
      }
      if (detailed.detailedData.address) {
        console.log(`  ✅ Adresa: ${detailed.detailedData.address}`);
      }
      if (detailed.detailedData.city) {
        console.log(`  ✅ Grad: ${detailed.detailedData.city}`);
      }
    }
    
    // Sačuvaj rezultate
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const filename = `boniteti-detailed-${timestamp}.json`;
    fs.writeFileSync(filename, JSON.stringify(detailedCompanies, null, 2));
    console.log(`\n✅ Detaljni podaci sačuvani u: ${filename}`);
    
    // Kreiraj CSV sa svim podacima
    this.createDetailedCSV(detailedCompanies, `boniteti-detailed-${timestamp}.csv`);
    
    return detailedCompanies;
  }
  
  // Kreiraj CSV sa detaljnim podacima
  createDetailedCSV(companies, filename) {
    const headers = [
      'Naziv',
      'PIB',
      'Matični broj',
      'Šifra delatnosti',
      'Naziv delatnosti',
      'Pravna forma',
      'Veličina',
      'Adresa',
      'Grad',
      'Email',
      'Telefon',
      'Website',
      'CRPS Status',
      'Promet 2024',
      'Profit',
      'Broj zaposlenih',
      'Ukupna aktiva',
      'Datum osnivanja',
      'Osnovni kapital'
    ];
    
    let csv = headers.join(',') + '\n';
    
    companies.forEach(company => {
      const row = [
        company.Name || '',
        company.VatNumber || '',
        company.RegistryCode || '',
        company.detailedData?.activityCode || '',
        company.detailedData?.activityName || '',
        company.detailedData?.legalForm || '',
        company.detailedData?.companySize || '',
        company.detailedData?.address || '',
        company.detailedData?.city || '',
        company.detailedData?.email || '',
        company.detailedData?.phone || '',
        company.detailedData?.website || '',
        company.AprStatus || '',
        company.Revenue || 0,
        company.Profit || 0,
        company.NumberOfEmployees || 0,
        company.Assets || 0,
        company.FoundingDate || '',
        company.detailedData?.registeredCapital || ''
      ];
      
      const csvRow = row.map(value => {
        if (typeof value === 'string') {
          value = value.replace(/"/g, '""');
          if (value.includes(',') || value.includes('\n')) {
            return `"${value}"`;
          }
        }
        return value;
      });
      
      csv += csvRow.join(',') + '\n';
    });
    
    fs.writeFileSync(filename, '\ufeff' + csv, 'utf8');
    console.log(`📁 CSV sa detaljnim podacima sačuvan: ${filename}`);
  }
}

// Pokreni
async function main() {
  const scraper = new BonitetiDetailedScraper();
  
  // Preuzmi detalje za prvih 5 kompanija kao test
  await scraper.run(5);
  
  console.log('\n💡 Za sve kompanije, promeni limit u run() metodi');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = BonitetiDetailedScraper;