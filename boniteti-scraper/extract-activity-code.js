const fs = require('fs');
const axios = require('axios');

class ActivityCodeExtractor {
  constructor() {
    this.baseURL = 'https://www.boniteti.me';
    this.cookies = 'ASP.NET_SessionId=tkebso4v3hnqgpgqz2lmma4a; Boniteti.me.UserCheck=6F88B9041376C77AAEE47841A835C38C';
    this.session = axios.create({
      baseURL: this.baseURL,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Cookie': this.cookies,
        'Referer': 'https://www.boniteti.me/advanced-search-company'
      },
      timeout: 30000
    });
  }

  // Ekstraktuj šifru djelatnosti iz HTML-a
  extractActivityFromHTML(html) {
    const data = {};
    
    // Metoda 1: Traži pattern "Delatnost: <a...>ŠIFRA - NAZIV</a>"
    const activityPattern1 = /Delatnost:\s*<a[^>]*>(?:<span[^>]*>)?(\d+)\s*-\s*([^<]+)/i;
    const match1 = html.match(activityPattern1);
    if (match1) {
      data.activityCode = match1[1].trim();
      data.activityName = match1[2].trim();
      return data;
    }
    
    // Metoda 2: Traži direktno šifru i naziv
    const activityPattern2 = />(\d{4,5})\s*-\s*([^<]+)</;
    const matches = html.matchAll(activityPattern2);
    for (const match of matches) {
      // Proveri da li je ovo stvarno šifra djelatnosti (obično je 4-5 cifara)
      const code = match[1];
      const name = match[2].trim();
      if (code.length >= 4 && code.length <= 5 && !name.includes('€') && !name.includes('%')) {
        data.activityCode = code;
        data.activityName = name;
        return data;
      }
    }
    
    // Metoda 3: Traži u JavaScript promenljivama
    const jsPattern = /companyBranchesDataSource.*?"Occupation":"[A-Z]?\s*(\d+)\s*-\s*([^"]+)"/;
    const jsMatch = html.match(jsPattern);
    if (jsMatch) {
      data.activityCode = jsMatch[1].trim();
      data.activityName = jsMatch[2].trim();
      return data;
    }
    
    return data;
  }

  // Ekstraktuj dodatne podatke
  extractAdditionalData(html) {
    const data = {};
    
    // Adresa
    const addressPattern = /<span[^>]*class="[^"]*address[^"]*"[^>]*>([^<]+)</i;
    const addressMatch = html.match(addressPattern);
    if (addressMatch) data.address = addressMatch[1].trim();
    
    // Grad
    const placePattern = /<span[^>]*class="[^"]*place[^"]*"[^>]*>([^<]+)</i;
    const placeMatch = html.match(placePattern);
    if (placeMatch) data.place = placeMatch[1].trim();
    
    // Email
    const emailPattern = /href="mailto:([^"]+)"/;
    const emailMatch = html.match(emailPattern);
    if (emailMatch) data.email = emailMatch[1].trim();
    
    // Telefon
    const phonePattern = /href="tel:([^"]+)"/;
    const phoneMatch = html.match(phonePattern);
    if (phoneMatch) data.phone = phoneMatch[1].trim();
    
    // Website
    const webPattern = /href="(https?:\/\/[^"]+)" target="_blank"/;
    const webMatch = html.match(webPattern);
    if (webMatch && !webMatch[1].includes('boniteti.me')) {
      data.website = webMatch[1].trim();
    }
    
    return data;
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

  // Preuzmi detalje za jednu kompaniju
  async getCompanyDetails(company) {
    const result = {
      ...company,
      activityCode: null,
      activityName: null,
      extractedData: {}
    };
    
    try {
      // Zameni quick-view sa registration-data
      const regUrl = company.CompanyUrl.replace('quick-view', 'registration-data');
      console.log(`  📄 Preuzimam: ${regUrl}`);
      
      const response = await this.session.get(regUrl);
      const activityData = this.extractActivityFromHTML(response.data);
      const additionalData = this.extractAdditionalData(response.data);
      
      result.activityCode = activityData.activityCode;
      result.activityName = activityData.activityName;
      result.extractedData = { ...activityData, ...additionalData };
      
      if (result.activityCode) {
        console.log(`  ✅ Šifra: ${result.activityCode} - ${result.activityName}`);
      } else {
        console.log(`  ⚠️ Šifra djelatnosti nije pronađena`);
      }
      
      // Pauza između zahteva
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`  ❌ Greška: ${error.message}`);
      result.error = error.message;
    }
    
    return result;
  }

  // Glavni proces
  async run(limit = 10) {
    console.log('🚀 Početak ekstrakcije šifri djelatnosti...\n');
    
    // Učitaj kompanije
    const companies = await this.loadCompanies();
    console.log(`📊 Učitano ${companies.length} kompanija`);
    console.log(`🔍 Preuzimam šifre djelatnosti za prvih ${limit} kompanija...\n`);
    
    const testCompanies = companies.slice(0, limit);
    const enrichedCompanies = [];
    
    for (let i = 0; i < testCompanies.length; i++) {
      const company = testCompanies[i];
      console.log(`${i + 1}/${limit}: ${company.Name}`);
      
      const enriched = await this.getCompanyDetails(company);
      enrichedCompanies.push(enriched);
    }
    
    // Statistike
    console.log('\n📊 STATISTIKE:');
    console.log('='.repeat(50));
    
    const withActivity = enrichedCompanies.filter(c => c.activityCode).length;
    const withoutActivity = enrichedCompanies.filter(c => !c.activityCode).length;
    
    console.log(`Kompanija sa šifrom djelatnosti: ${withActivity}/${limit}`);
    console.log(`Kompanija bez šifre djelatnosti: ${withoutActivity}/${limit}`);
    console.log(`Uspešnost: ${((withActivity/limit)*100).toFixed(1)}%`);
    
    // Prikaži jedinstvene šifre
    const uniqueActivities = {};
    enrichedCompanies.forEach(c => {
      if (c.activityCode) {
        const key = `${c.activityCode} - ${c.activityName}`;
        uniqueActivities[key] = (uniqueActivities[key] || 0) + 1;
      }
    });
    
    console.log('\n🏢 PRONAĐENE DJELATNOSTI:');
    console.log('-'.repeat(50));
    Object.entries(uniqueActivities)
      .sort((a, b) => b[1] - a[1])
      .forEach(([activity, count]) => {
        console.log(`  ${activity}: ${count} kompanija`);
      });
    
    // Sačuvaj rezultate
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const filename = `boniteti-with-activity-${timestamp}.json`;
    fs.writeFileSync(filename, JSON.stringify(enrichedCompanies, null, 2));
    console.log(`\n✅ Podaci sačuvani u: ${filename}`);
    
    // Kreiraj CSV
    this.createCSV(enrichedCompanies, `boniteti-with-activity-${timestamp}.csv`);
    
    return enrichedCompanies;
  }
  
  // Kreiraj CSV sa svim podacima
  createCSV(companies, filename) {
    const headers = [
      'Naziv',
      'PIB',
      'Matični broj',
      'Šifra djelatnosti',
      'Naziv djelatnosti',
      'CRPS Status',
      'Promet 2024',
      'Profit',
      'Broj zaposlenih',
      'Ukupna aktiva',
      'Grad',
      'Adresa',
      'Email',
      'Telefon',
      'Website',
      'Datum osnivanja'
    ];
    
    let csv = '\ufeff' + headers.join(',') + '\n';
    
    companies.forEach(company => {
      const row = [
        company.Name || '',
        company.VatNumber || '',
        company.RegistryCode || '',
        company.activityCode || '',
        company.activityName || '',
        company.AprStatus || '',
        company.Revenue || 0,
        company.Profit || 0,
        company.NumberOfEmployees || 0,
        company.Assets || 0,
        company.extractedData?.place || company.Place || '',
        company.extractedData?.address || company.Address || '',
        company.extractedData?.email || '',
        company.extractedData?.phone || '',
        company.extractedData?.website || '',
        company.FoundingDate || ''
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
    
    fs.writeFileSync(filename, csv, 'utf8');
    console.log(`📁 CSV sačuvan: ${filename}`);
  }
}

// Pokreni
async function main() {
  const extractor = new ActivityCodeExtractor();
  
  // Preuzmi šifre djelatnosti za prvih 10 kompanija
  await extractor.run(10);
  
  console.log('\n💡 Za sve kompanije, promeni limit u run() metodi');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ActivityCodeExtractor;