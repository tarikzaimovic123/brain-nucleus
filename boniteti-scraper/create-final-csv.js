const fs = require('fs');

// Čitaj raw podatke
const rawData = fs.readFileSync('boniteti_all_data_20250808_033902.json', 'utf8');

// Podeli na pojedinačne JSON objekte
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
            allCompanies = allCompanies.concat(data.Data);
        }
    } catch (e) {
        console.log(`Greška pri parsiranju stranice ${index + 1}`);
    }
});

console.log(`✅ Ukupno kompanija: ${allCompanies.length}`);

// Kreiraj CSV sa traženim kolonama
const createCSV = (companies) => {
    // Header sa kolonama koje si tražio
    const headers = [
        'Naziv kompanije',
        'PIB',
        'Matični broj',
        'CRPS Status',
        'Promet 2024',
        'Profit',
        'Broj zaposlenih',
        'Grad',
        'Adresa',
        'Datum osnivanja',
        'Ukupna aktiva'
    ];
    
    let csv = headers.join(',') + '\n';
    
    companies.forEach(company => {
        const row = [
            company.Name || '',
            company.VatNumber || '',
            company.RegistryCode || '',
            company.AprStatus || '',
            company.Revenue || 0,
            company.Profit || 0,
            company.NumberOfEmployees || 0,
            company.Place || '',
            company.Address || '',
            company.FoundingDate || '',
            company.Assets || 0
        ];
        
        // Formatuj red za CSV
        const csvRow = row.map(value => {
            if (typeof value === 'string') {
                value = value.replace(/"/g, '""');
                if (value.includes(',') || value.includes('\n') || value.includes('"')) {
                    return `"${value}"`;
                }
            }
            return value;
        });
        
        csv += csvRow.join(',') + '\n';
    });
    
    return csv;
};

// Sačuvaj CSV
const csvContent = createCSV(allCompanies);
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
const csvFileName = `boniteti-kompanije-${timestamp}.csv`;

fs.writeFileSync(csvFileName, '\ufeff' + csvContent, 'utf8'); // BOM za Excel UTF-8
console.log(`\n📁 CSV sačuvan: ${csvFileName}`);

// Prikaži TOP 10 kompanija
console.log('\n🏆 TOP 10 KOMPANIJA PO PROMETU (2024):');
console.log('=' .repeat(60));

allCompanies
    .sort((a, b) => (b.Revenue || 0) - (a.Revenue || 0))
    .slice(0, 10)
    .forEach((c, i) => {
        const revenue = c.Revenue ? c.Revenue.toLocaleString('sr-RS') : '0';
        const employees = c.NumberOfEmployees || 0;
        const profit = c.Profit ? c.Profit.toLocaleString('sr-RS') : '0';
        
        console.log(`\n${i + 1}. ${c.Name}`);
        console.log(`   PIB: ${c.VatNumber || 'N/A'}`);
        console.log(`   Promet: €${revenue}`);
        console.log(`   Profit: €${profit}`);
        console.log(`   Zaposleni: ${employees}`);
        console.log(`   Status: ${c.AprStatus}`);
    });

// Statistike
console.log('\n\n📊 STATISTIKE:');
console.log('=' .repeat(60));

const activeCompanies = allCompanies.filter(c => c.AprStatus === 'Aktivan').length;
const totalRevenue = allCompanies.reduce((sum, c) => sum + (c.Revenue || 0), 0);
const totalEmployees = allCompanies.reduce((sum, c) => sum + (c.NumberOfEmployees || 0), 0);
const avgRevenue = totalRevenue / allCompanies.length;
const avgEmployees = totalEmployees / allCompanies.length;

console.log(`Ukupno kompanija: ${allCompanies.length}`);
console.log(`Aktivnih kompanija: ${activeCompanies}`);
console.log(`Ukupan promet: €${totalRevenue.toLocaleString('sr-RS')}`);
console.log(`Prosečan promet: €${Math.round(avgRevenue).toLocaleString('sr-RS')}`);
console.log(`Ukupno zaposlenih: ${totalEmployees.toLocaleString('sr-RS')}`);
console.log(`Prosečan broj zaposlenih: ${Math.round(avgEmployees)}`);

// Grupiši po statusu
const byStatus = {};
allCompanies.forEach(c => {
    const status = c.AprStatus || 'Nepoznato';
    byStatus[status] = (byStatus[status] || 0) + 1;
});

console.log('\nPo statusu:');
Object.entries(byStatus)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
        const percent = ((count / allCompanies.length) * 100).toFixed(1);
        console.log(`  ${status}: ${count} (${percent}%)`);
    });

console.log('\n✅ Završeno!');