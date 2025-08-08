const fs = require('fs');
const axios = require('axios');

class BonitetiFullScraper {
  constructor() {
    this.baseURL = 'https://www.boniteti.me';
    this.cookies = 'ASP.NET_SessionId=tkebso4v3hnqgpgqz2lmma4a; Boniteti.me.UserCheck=6F88B9041376C77AAEE47841A835C38C';
    this.session = axios.create({
      baseURL: this.baseURL,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9,sr-RS;q=0.8,sr;q=0.7',
        'Cookie': this.cookies,
        'Referer': 'https://www.boniteti.me/advanced-search-company',
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: 30000
    });
    
    this.totalCompanies = 148739;
    this.pageSize = 500; // Maksimum što API vraća
  }

  // Preuzmi jednu stranicu podataka
  async fetchPage(page) {
    const url = `/advanced-search-company/CompanyFilteringRead?sort=Revenue-desc&page=${page}&pageSize=${this.pageSize}&group=&filter=`;
    
    try {
      console.log(`  📄 Preuzimam stranicu ${page}...`);
      const response = await this.session.get(url);
      
      if (response.data && response.data.Data) {
        console.log(`  ✅ Stranica ${page}: ${response.data.Data.length} kompanija`);
        return response.data;
      }
      
      console.log(`  ⚠️ Stranica ${page}: Nema podataka`);
      return null;
      
    } catch (error) {
      console.error(`  ❌ Greška na stranici ${page}: ${error.message}`);
      
      // Pokušaj ponovo nakon pauze
      console.log(`  🔄 Pokušavam ponovo za 5 sekundi...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      try {
        const response = await this.session.get(url);
        if (response.data && response.data.Data) {
          console.log(`  ✅ Stranica ${page}: ${response.data.Data.length} kompanija (drugi pokušaj)`);
          return response.data;
        }
      } catch (retryError) {
        console.error(`  ❌ Drugi pokušaj neuspešan: ${retryError.message}`);
      }
      
      return null;
    }
  }

  // Ekstraktuj šifru djelatnosti iz HTML-a
  extractActivityFromHTML(html) {
    const data = {};
    
    // Traži pattern sa šifrom i nazivom djelatnosti
    const activityPattern = />(\d{4,5})\s*-\s*([^<]+)</;
    const matches = html.matchAll(activityPattern);
    
    for (const match of matches) {
      const code = match[1];
      const name = match[2].trim();
      // Proveri da li je ovo stvarno šifra djelatnosti
      if (code.length >= 4 && code.length <= 5 && !name.includes('€') && !name.includes('%')) {
        data.activityCode = code;
        data.activityName = name;
        return data;
      }
    }
    
    return data;
  }

  // Preuzmi šifru djelatnosti za kompaniju
  async getActivityCode(company) {
    if (!company.CompanyUrl) return null;
    
    try {
      const regUrl = company.CompanyUrl.replace('quick-view', 'registration-data');
      const response = await this.session.get(regUrl);
      const activityData = this.extractActivityFromHTML(response.data);
      return activityData;
    } catch (error) {
      return null;
    }
  }

  // Glavni proces sa paginacijom
  async fetchAllCompanies(withActivityCodes = false, activityLimit = 100) {
    console.log('🚀 POČETAK PREUZIMANJA SVIH KOMPANIJA');
    console.log('='.repeat(60));
    console.log(`📊 Ukupno kompanija u bazi: ${this.totalCompanies.toLocaleString('sr-RS')}`);
    console.log(`📄 Veličina stranice: ${this.pageSize}`);
    
    const totalPages = Math.ceil(this.totalCompanies / this.pageSize);
    console.log(`📑 Ukupno stranica: ${totalPages}`);
    console.log('='.repeat(60));
    
    const allCompanies = [];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const dataDir = `boniteti-data-${timestamp}`;
    
    // Kreiraj direktorijum za podatke
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }
    
    // Preuzmi sve stranice
    for (let page = 1; page <= totalPages; page++) {
      console.log(`\n📥 Stranica ${page}/${totalPages} (${((page/totalPages)*100).toFixed(1)}%)`);
      
      const pageData = await this.fetchPage(page);
      
      if (pageData && pageData.Data) {
        allCompanies.push(...pageData.Data);
        
        // Sačuvaj svaku stranicu posebno
        const pageFile = `${dataDir}/page-${String(page).padStart(3, '0')}.json`;
        fs.writeFileSync(pageFile, JSON.stringify(pageData, null, 2));
        console.log(`  💾 Sačuvano u: ${pageFile}`);
        
        // Pauza između stranica
        if (page < totalPages) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Prikaži statistike na svakih 10 stranica
      if (page % 10 === 0 || page === totalPages) {
        console.log(`\n📊 MEĐUSTATISTIKE:`);
        console.log(`  • Preuzeto kompanija: ${allCompanies.length.toLocaleString('sr-RS')}`);
        console.log(`  • Preostalo stranica: ${totalPages - page}`);
        const estimatedTime = (totalPages - page) * 2; // ~2 sekunde po stranici
        console.log(`  • Procenjeno vreme: ${Math.ceil(estimatedTime / 60)} minuta`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ PREUZIMANJE ZAVRŠENO!');
    console.log(`📊 Ukupno preuzeto kompanija: ${allCompanies.length.toLocaleString('sr-RS')}`);
    
    // Sačuvaj sve podatke u jedan fajl
    const allDataFile = `${dataDir}/all-companies.json`;
    fs.writeFileSync(allDataFile, JSON.stringify(allCompanies, null, 2));
    console.log(`💾 Svi podaci sačuvani u: ${allDataFile}`);
    
    // Opciono: Preuzmi šifre djelatnosti za određen broj kompanija
    if (withActivityCodes) {
      console.log(`\n🔍 Preuzimanje šifri djelatnosti za prvih ${activityLimit} kompanija...`);
      
      for (let i = 0; i < Math.min(activityLimit, allCompanies.length); i++) {
        const company = allCompanies[i];
        console.log(`  ${i+1}/${activityLimit}: ${company.Name}`);
        
        const activityData = await this.getActivityCode(company);
        if (activityData) {
          allCompanies[i] = { ...company, ...activityData };
          if (activityData.activityCode) {
            console.log(`    ✅ ${activityData.activityCode} - ${activityData.activityName}`);
          }
        }
        
        // Pauza između zahteva
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Sačuvaj obogaćene podatke
      const enrichedFile = `${dataDir}/companies-with-activities.json`;
      fs.writeFileSync(enrichedFile, JSON.stringify(allCompanies.slice(0, activityLimit), null, 2));
      console.log(`💾 Obogaćeni podaci sačuvani u: ${enrichedFile}`);
    }
    
    // Kreiraj finalni CSV
    this.createFinalCSV(allCompanies, `${dataDir}/all-companies.csv`);
    
    // Prikaži finalne statistike
    this.showStatistics(allCompanies);
    
    return allCompanies;
  }

  // Kreiraj CSV sa svim podacima
  createFinalCSV(companies, filename) {
    console.log('\n📝 Kreiranje CSV fajla...');
    
    const headers = [
      'Naziv',
      'PIB',
      'Matični broj',
      'CRPS Status',
      'CBCG Status',
      'Promet 2024',
      'Promena prometa %',
      'Profit 2024',
      'Promena profita %',
      'Broj zaposlenih',
      'Promena zaposlenih %',
      'Ukupna aktiva',
      'Promena aktive %',
      'Država',
      'Grad',
      'Adresa',
      'Poštanski broj',
      'Datum osnivanja',
      'Status stečaja',
      'Poslednji finansijski izveštaj'
    ];
    
    let csv = '\ufeff' + headers.join(',') + '\n';
    
    companies.forEach(company => {
      const row = [
        company.Name || '',
        company.VatNumber || '',
        company.RegistryCode || '',
        company.AprStatus || '',
        company.NbsStatus || '',
        company.Revenue || 0,
        company.RevenueChange || 0,
        company.Profit || 0,
        company.ProfitChange || 0,
        company.NumberOfEmployees || 0,
        company.NumberOfEmployeesChange || 0,
        company.Assets || 0,
        company.AssetsChange || 0,
        company.Country || '',
        company.Place || '',
        company.Address || '',
        company.PostalCode || '',
        company.FoundingDate || '',
        company.InsolvencyName || '',
        company.LastFinReportYear || ''
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
    console.log(`✅ CSV sačuvan: ${filename}`);
    console.log(`📊 Veličina: ${(csv.length / 1024 / 1024).toFixed(2)} MB`);
  }

  // Prikaži statistike
  showStatistics(companies) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINALNE STATISTIKE');
    console.log('='.repeat(60));
    
    // Osnovne statistike
    console.log('\n📈 OSNOVNI PODACI:');
    console.log(`• Ukupno kompanija: ${companies.length.toLocaleString('sr-RS')}`);
    
    const activeCompanies = companies.filter(c => c.AprStatus === 'Aktivan').length;
    console.log(`• Aktivnih kompanija: ${activeCompanies.toLocaleString('sr-RS')} (${((activeCompanies/companies.length)*100).toFixed(1)}%)`);
    
    // Finansijske statistike
    console.log('\n💰 FINANSIJSKI PODACI (2024):');
    
    const totalRevenue = companies.reduce((sum, c) => sum + (c.Revenue || 0), 0);
    console.log(`• Ukupan promet: €${totalRevenue.toLocaleString('sr-RS')}`);
    
    const avgRevenue = totalRevenue / companies.length;
    console.log(`• Prosečan promet: €${Math.round(avgRevenue).toLocaleString('sr-RS')}`);
    
    const totalProfit = companies.reduce((sum, c) => sum + (c.Profit || 0), 0);
    console.log(`• Ukupan profit: €${totalProfit.toLocaleString('sr-RS')}`);
    
    const totalEmployees = companies.reduce((sum, c) => sum + (c.NumberOfEmployees || 0), 0);
    console.log(`• Ukupno zaposlenih: ${totalEmployees.toLocaleString('sr-RS')}`);
    
    // TOP 10 kompanija
    console.log('\n🏆 TOP 10 KOMPANIJA PO PROMETU:');
    console.log('-'.repeat(60));
    
    companies
      .sort((a, b) => (b.Revenue || 0) - (a.Revenue || 0))
      .slice(0, 10)
      .forEach((c, i) => {
        const revenue = c.Revenue ? c.Revenue.toLocaleString('sr-RS') : '0';
        console.log(`${i + 1}. ${c.Name.substring(0, 40).padEnd(40)} €${revenue}`);
      });
    
    // Po državama
    console.log('\n🌍 PO DRŽAVAMA:');
    const byCountry = {};
    companies.forEach(c => {
      const country = c.Country || 'Nepoznato';
      byCountry[country] = (byCountry[country] || 0) + 1;
    });
    
    Object.entries(byCountry)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([country, count]) => {
        const percent = ((count / companies.length) * 100).toFixed(1);
        console.log(`• ${country}: ${count.toLocaleString('sr-RS')} (${percent}%)`);
      });
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ PROCES ZAVRŠEN!');
    console.log('='.repeat(60));
  }
}

// Glavni program
async function main() {
  const scraper = new BonitetiFullScraper();
  
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║       BONITETI.ME - PREUZIMANJE SVIH KOMPANIJA        ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('\n⚙️ OPCIJE:');
  console.log('1. Preuzmi sve kompanije (brzo, bez šifri djelatnosti)');
  console.log('2. Preuzmi sve + šifre djelatnosti za prvih 100 kompanija');
  console.log('3. Test - preuzmi samo prve 3 stranice');
  
  // Za sada pokreni opciju 3 (test)
  console.log('\n▶️ Pokrećem TEST režim (3 stranice)...\n');
  
  // TEST: Preuzmi samo 3 stranice
  const testScraper = new BonitetiFullScraper();
  testScraper.totalCompanies = 1500; // Ograniči na 3 stranice
  await testScraper.fetchAllCompanies(false);
  
  console.log('\n💡 Za potpuno preuzimanje, izmeni main() funkciju');
  console.log('   i postavi: await scraper.fetchAllCompanies(false);');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = BonitetiFullScraper;