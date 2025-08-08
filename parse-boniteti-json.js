const fs = require('fs');

// Čitaj raw podatke
const rawData = fs.readFileSync('boniteti_all_data_20250808_033902.json', 'utf8');

// Podeli na pojedinačne JSON objekte (svaka stranica je zaseban JSON)
const jsonStrings = rawData.split('}{').map((str, i, arr) => {
    if (i === 0) return str + '}';
    if (i === arr.length - 1) return '{' + str;
    return '{' + str + '}';
});

let allCompanies = [];

// Parsiraj svaki JSON
jsonStrings.forEach((jsonStr, index) => {
    try {
        const data = JSON.parse(jsonStr);
        
        if (data.Data && Array.isArray(data.Data)) {
            console.log(`Stranica ${index + 1}: ${data.Data.length} kompanija`);
            allCompanies = allCompanies.concat(data.Data);
        }
    } catch (e) {
        console.log(`Greška pri parsiranju stranice ${index + 1}`);
    }
});

console.log(`\n✅ Ukupno kompanija: ${allCompanies.length}`);

// Prikaži prvu kompaniju da vidimo strukturu
if (allCompanies.length > 0) {
    console.log('\n📊 Struktura podataka (prva kompanija):');
    console.log(JSON.stringify(allCompanies[0], null, 2));
}

// Kreiraj CSV
const createCSV = (companies) => {
    // Ekstraktuj sve ključeve za header
    const headers = [
        'CompanyName',
        'TaxNumber',
        'RegistrationNumber', 
        'ActivityCode',
        'ActivityName',
        'Place',
        'Municipality',
        'Region',
        'Address',
        'Phone',
        'Email',
        'Website',
        'FoundingDate',
        'NumberOfEmployees',
        'SalesIncome',
        'NetProfit',
        'TotalAssets',
        'Capital',
        'LegalForm',
        'Status',
        'BonitetScore'
    ];
    
    // CSV header
    let csv = headers.join(',') + '\n';
    
    // Dodaj podatke
    companies.forEach(company => {
        const row = headers.map(header => {
            let value = company[header] || '';
            // Escape quotes i zagradi u quotes ako sadrži zarez
            if (typeof value === 'string') {
                value = value.replace(/"/g, '""');
                if (value.includes(',') || value.includes('\n') || value.includes('"')) {
                    value = `"${value}"`;
                }
            }
            return value;
        });
        csv += row.join(',') + '\n';
    });
    
    return csv;
};

// Sačuvaj kao CSV
const csvContent = createCSV(allCompanies);
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const csvFileName = `boniteti-companies-${timestamp}.csv`;

fs.writeFileSync(csvFileName, csvContent, 'utf8');
console.log(`\n📁 CSV sačuvan: ${csvFileName}`);

// Sačuvaj i očišćen JSON
const jsonFileName = `boniteti-companies-clean-${timestamp}.json`;
fs.writeFileSync(jsonFileName, JSON.stringify(allCompanies, null, 2));
console.log(`📁 JSON sačuvan: ${jsonFileName}`);

// Statistike
console.log('\n📈 STATISTIKE:');
console.log('================');

// Grupiši po regionu
const byRegion = {};
allCompanies.forEach(c => {
    const region = c.Region || 'Nepoznato';
    byRegion[region] = (byRegion[region] || 0) + 1;
});

console.log('\nPo regionu:');
Object.entries(byRegion)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([region, count]) => {
        console.log(`  ${region}: ${count}`);
    });

// Grupiši po delatnosti
const byActivity = {};
allCompanies.forEach(c => {
    const activity = c.ActivityName || 'Nepoznato';
    const shortActivity = activity.split('-')[0].trim();
    byActivity[shortActivity] = (byActivity[shortActivity] || 0) + 1;
});

console.log('\nPo delatnosti:');
Object.entries(byActivity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([activity, count]) => {
        console.log(`  ${activity}: ${count}`);
    });

// Top 10 po prometu
const withRevenue = allCompanies
    .filter(c => c.SalesIncome && c.SalesIncome > 0)
    .sort((a, b) => (b.SalesIncome || 0) - (a.SalesIncome || 0))
    .slice(0, 10);

console.log('\nTop 10 po prometu (EUR):');
withRevenue.forEach((c, i) => {
    const revenue = c.SalesIncome ? c.SalesIncome.toLocaleString('sr-RS') : '0';
    console.log(`  ${i + 1}. ${c.CompanyName}: €${revenue}`);
});

// Top 10 po broju zaposlenih
const withEmployees = allCompanies
    .filter(c => c.NumberOfEmployees && c.NumberOfEmployees > 0)
    .sort((a, b) => (b.NumberOfEmployees || 0) - (a.NumberOfEmployees || 0))
    .slice(0, 10);

console.log('\nTop 10 po broju zaposlenih:');
withEmployees.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.CompanyName}: ${c.NumberOfEmployees} zaposlenih`);
});