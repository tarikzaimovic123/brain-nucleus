const fs = require('fs');

// Čitaj raw podatke
const rawData = fs.readFileSync('boniteti_all_data_20250808_033902.json', 'utf8');

// Uzmi prvu stranicu
const firstPage = rawData.split('}{')[0] + '}';
const data = JSON.parse(firstPage);

console.log('=' .repeat(80));
console.log('ANALIZA API RESPONSE - BONITETI.ME');
console.log('=' .repeat(80));

// Prikaži meta podatke
console.log('\n📊 META PODACI:');
console.log('-'.repeat(40));
console.log(`TotalCount: ${data.TotalCount} kompanija`);
console.log(`Vraćeno u ovom response: ${data.Data.length} kompanija`);

// Analiziraj strukturu prvog objekta
const firstCompany = data.Data[0];

console.log('\n📋 SVI DOSTUPNI PODACI (primer prve kompanije):');
console.log('-'.repeat(40));

// Grupiši polja po kategorijama
const categories = {
    'OSNOVNI PODACI': [
        'CompanyID', 'Name', 'FullName', 'RegistryCode', 'VatNumber'
    ],
    'LOKACIJA': [
        'Country', 'CountryFlag', 'Place', 'Address', 'PostalCode'
    ],
    'STATUS': [
        'InsolvencyName', 'AprStatus', 'NbsStatus', 
        'AprStatusCaption', 'NbsStatusCaption'
    ],
    'FINANSIJSKI PODACI 2024': [
        'Revenue', 'RevenueText', 'RevenueChange', 'RevenueChangeText',
        'Profit', 'ProfitText', 'ProfitChange', 'ProfitChangeText',
        'Assets', 'AssetsText', 'AssetsChange', 'AssetsChangeText'
    ],
    'ZAPOSLENI': [
        'NumberOfEmployees', 'NumberOfEmployeesText', 
        'NumberOfEmployeesChange', 'NumberOfEmployeesChangeText'
    ],
    'TREND INDIKATORI': [
        'RevenueChangeTrendArrow', 'ProfitChangeTrendArrow',
        'NumberOfEmployeesChangeTrendArrow', 'AssetsChangeTrendArrow'
    ],
    'OSTALO': [
        'LastFinReportYear', 'LastFinReportYearText',
        'FoundingDate', 'CompanyUrl', 
        'PrimaryKey', 'PrimaryKeyCaption'
    ]
};

// Prikaži po kategorijama
Object.entries(categories).forEach(([category, fields]) => {
    console.log(`\n🔹 ${category}:`);
    fields.forEach(field => {
        const value = firstCompany[field];
        const displayValue = value !== null && value !== undefined ? value : 'null';
        console.log(`   ${field}: ${displayValue}`);
    });
});

// Proveri da li ima dodatnih polja koja nisu u kategorijama
const allCategorizedFields = Object.values(categories).flat();
const allFields = Object.keys(firstCompany);
const uncategorizedFields = allFields.filter(f => !allCategorizedFields.includes(f));

if (uncategorizedFields.length > 0) {
    console.log('\n🔸 NEKATEGORISANA POLJA:');
    uncategorizedFields.forEach(field => {
        console.log(`   ${field}: ${firstCompany[field]}`);
    });
}

// Analiziraj kompletnost podataka
console.log('\n📈 ANALIZA KOMPLETNOSTI PODATAKA (prvih 50 kompanija):');
console.log('-'.repeat(40));

const fieldCompleteness = {};
allFields.forEach(field => {
    fieldCompleteness[field] = 0;
});

data.Data.forEach(company => {
    allFields.forEach(field => {
        if (company[field] !== null && company[field] !== undefined && company[field] !== '') {
            fieldCompleteness[field]++;
        }
    });
});

// Sortiraj po kompletnosti
const sortedCompleteness = Object.entries(fieldCompleteness)
    .map(([field, count]) => ({
        field,
        count,
        percentage: ((count / data.Data.length) * 100).toFixed(1)
    }))
    .sort((a, b) => b.count - a.count);

console.log('\nPolja rangirani po popunjenosti:');
sortedCompleteness.forEach(item => {
    const bar = '█'.repeat(Math.floor(item.percentage / 5));
    console.log(`${item.field.padEnd(35)} ${bar} ${item.percentage}% (${item.count}/50)`);
});

// Primer kompletne kompanije
console.log('\n🏢 PRIMER KOMPLETNE KOMPANIJE:');
console.log('-'.repeat(40));
console.log(JSON.stringify(firstCompany, null, 2));

// Sačuvaj strukturu u fajl
const structure = {
    totalCount: data.TotalCount,
    fields: allFields,
    categorizedFields: categories,
    sampleCompany: firstCompany,
    fieldCompleteness: sortedCompleteness
};

fs.writeFileSync('boniteti-api-structure.json', JSON.stringify(structure, null, 2));
console.log('\n✅ Struktura API-ja sačuvana u: boniteti-api-structure.json');