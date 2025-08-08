const { default: MDBReader } = require('mdb-reader');
const fs = require('fs');

function analyzeDatabase(dbPath, dbName) {
  const buffer = fs.readFileSync(dbPath);
  const reader = new MDBReader(buffer);
  const tables = reader.getTableNames();
  
  const structure = {
    name: dbName,
    tableCount: tables.length,
    tables: {}
  };
  
  tables.forEach(tableName => {
    try {
      const table = reader.getTable(tableName);
      const columns = table.getColumnNames();
      const data = table.getData();
      
      structure.tables[tableName] = {
        columns: columns,
        rowCount: data.length,
        sampleData: data.slice(0, 2),
        relationships: []
      };
      
      // Detect relationships based on column names
      columns.forEach(col => {
        if (col.startsWith('ID_') || col.endsWith('_ID') || col === 'FIRMA_ID') {
          const relatedTable = col.replace('ID_', '').replace('_ID', '');
          structure.tables[tableName].relationships.push({
            column: col,
            possibleTable: relatedTable
          });
        }
      });
    } catch(e) {
      structure.tables[tableName] = { error: e.message };
    }
  });
  
  return structure;
}

// Analyze BazaBrain
const bazaBrain = analyzeDatabase(
  '/Users/tarikzaimovic/brain-nucleus/old-aplicaiton/backup-db/poslednji-bekap/BazaBrain.mdb',
  'BazaBrain.mdb'
);

// Analyze HARMON
const harmon = analyzeDatabase(
  '/Users/tarikzaimovic/brain-nucleus/old-aplicaiton/backup-db/HARMON.mdb',
  'HARMON.mdb'
);

// Save to JSON files
fs.writeFileSync('bazabrain-structure.json', JSON.stringify(bazaBrain, null, 2));
fs.writeFileSync('harmon-structure.json', JSON.stringify(harmon, null, 2));

// Generate detailed report
console.log('='.repeat(80));
console.log('DETALJNI IZVEŠTAJ STRUKTURE BAZA');
console.log('='.repeat(80));

console.log('\n📊 BAZABRAIN.MDB');
console.log('-'.repeat(40));

// Group tables by category
const categories = {
  'ARTIKLI I PROIZVODI': ['ARTIKLI', 'ARTIKLI_PAPIR', 'VR_ARTIKLA', 'VR_ART_PROIZ', 'VR_PROIZVODA'],
  'FIRME I KONTAKTI': ['FIRME', 'FIRME_KONTAKT'],
  'FAKTURE': ['FAKTURE', 'FAKTURE_STAVKE', 'FAKTURE_NALOG', 'FAKTURE_OTPREM', 'ST_FAKTURE', 'VR_FAKTURE'],
  'RADNI NALOZI': ['NALOG', 'NALOG_STAVKE', 'NALOG_ARTIKLI', 'NALOG_DIGITALNA', 'NALOG_OFFSET', 
                   'NALOG_KLIK', 'NALOG_VELIKI_FORMATI', 'NALOG_OBRADA_CTP', 'NALOG_WEB', 
                   'NALOG_OSALO', 'ST_NALOGA'],
  'DOKUMENTI': ['DOKUMENTI', 'DOKUM_STAVKE', 'ST_DOKUMENTA', 'VR_DOKUMENTA'],
  'UPLATE': ['UPLATE', 'UPLATE_RACUN', 'VR_UPLATE', 'ZIRO_RACUN', 'VR_ZIRO_RACUNA'],
  'RADNICI': ['RADNIK', 'ODLASCI', 'ODLASCI_RADNIK', 'ODLASCI_NERADNI', 'ODSUSTVA', 
              'VR_ODSUSTVA', 'RADNIK_PREKOVREMENI', 'VR_RADNIKA', 'VR_RADNO_MJESTO'],
  'OPERATERI': ['ID_OPERATER', 'ID_OPERATER_PRISTUP'],
  'ŠTAMPARSKE OPCIJE': ['VR_COLOR', 'ID_COLOR', 'VR_BOJA', 'VR_NAZIV_BOJE', 'VR_FORMAT', 
                        'VR_FROMAT_PLOCA', 'VR_MASINA', 'MASINA', 'VR_NACIN_STAMPE', 
                        'VR_LINIJATURA', 'VR_OFFSET_PROIZVODA'],
  'PONUDE': ['PONUDA', 'PONUDA_STAVKE', 'ST_PONUDE'],
  'KONFIGURACIJA': ['ID_PREDUZECE', 'ID_RADNJE', 'ID_RADNJE_GRUPE', 'VR_KALKULACIJE', 
                    'ID_CONFIG_FISKAL', 'GRUPA_RACUN', 'PDV_VRSTA', 'VR_PDV']
};

Object.entries(categories).forEach(([category, tables]) => {
  console.log(`\n📁 ${category}:`);
  tables.forEach(tableName => {
    if (bazaBrain.tables[tableName]) {
      const table = bazaBrain.tables[tableName];
      console.log(`   • ${tableName} (${table.rowCount} rows)`);
      if (table.relationships && table.relationships.length > 0) {
        console.log(`     → Relacije: ${table.relationships.map(r => r.column).join(', ')}`);
      }
    }
  });
});

console.log('\n\n📊 HARMON.MDB');
console.log('-'.repeat(40));
Object.entries(harmon.tables).forEach(([tableName, table]) => {
  console.log(`• ${tableName} (${table.rowCount} rows)`);
  console.log(`  Kolone: ${table.columns.join(', ')}`);
});

console.log('\n\n🔗 KLJUČNE MEĐUZAVISNOSTI:');
console.log('-'.repeat(40));

// Analyze key relationships
const keyRelations = [
  { from: 'FAKTURE', to: 'FIRME', via: 'FIRMA_ID', desc: 'Svaka faktura pripada firmi' },
  { from: 'FAKTURE_STAVKE', to: 'FAKTURE', via: 'ID_FAKTURA', desc: 'Stavke pripadaju fakturi' },
  { from: 'FAKTURE_NALOG', to: 'NALOG', via: 'ID_NALOGA', desc: 'Veza faktura-nalog' },
  { from: 'NALOG', to: 'FIRME', via: 'FIRMA_ID', desc: 'Nalog za klijenta' },
  { from: 'NALOG_STAVKE', to: 'NALOG', via: 'ID_NALOGA', desc: 'Stavke naloga' },
  { from: 'NALOG_ARTIKLI', to: 'ARTIKLI', via: 'SF_ARTIKLA', desc: 'Artikli na nalogu' },
  { from: 'DOKUMENTI', to: 'FIRME', via: 'FIRMA_ID', desc: 'Dokumenti firme' },
  { from: 'ODLASCI', to: 'RADNIK', via: 'ID_RADNIK', desc: 'Evidencija rada' }
];

keyRelations.forEach(rel => {
  console.log(`• ${rel.from} → ${rel.to} (${rel.via}): ${rel.desc}`);
});