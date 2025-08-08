// Alternativni pristup sa Firecrawl API-jem
// Ovo će raditi preko Claude-a koji ima pristup Firecrawl alatu

const loginAndScrapeInstructions = `
Da bi se skrejpovalo sa boniteti.me:

1. LOGIN PROCES:
   - URL: https://www.boniteti.me/user/loginpage
   - Username: SR-03150321
   - Password: 6413
   
2. NAKON LOGINA IDI NA:
   - https://www.boniteti.me/advanced-search-company
   
3. EKSTRAKTUJ SLEDEĆE KOLONE:
   - Naziv kompanije
   - PIB
   - CRPS status
   - Promet 2024
   - Profit
   - Broj zaposlenih

4. KORISTI FIRECRAWL SA ACTIONS:
`;

const firecrawlConfig = {
  url: "https://www.boniteti.me/user/loginpage",
  formats: ["markdown", "html"],
  actions: [
    // Čekaj da se stranica učita
    {
      type: "wait",
      milliseconds: 2000
    },
    
    // Unesi username
    {
      type: "write",
      selector: 'input[name="username"]',
      text: "SR-03150321"
    },
    
    // Unesi password
    {
      type: "write",
      selector: 'input[name="password"]',
      text: "6413"
    },
    
    // Klikni login dugme
    {
      type: "click",
      selector: 'button[type="submit"]'
    },
    
    // Čekaj da se učita nakon logina
    {
      type: "wait",
      milliseconds: 5000
    },
    
    // Navigiraj do advanced search
    {
      type: "executeJavascript",
      script: "window.location.href = 'https://www.boniteti.me/advanced-search-company'"
    },
    
    // Čekaj da se učita stranica sa podacima
    {
      type: "wait",
      milliseconds: 5000
    },
    
    // Skrejpuj podatke
    {
      type: "scrape"
    }
  ],
  onlyMainContent: false,
  waitFor: 5000
};

console.log("Firecrawl konfiguracija za boniteti.me:");
console.log(JSON.stringify(firecrawlConfig, null, 2));

console.log("\n📝 INSTRUKCIJE:");
console.log("1. Kopiraj gornju konfiguraciju");
console.log("2. Koristi je sa firecrawl_scrape alatom");
console.log("3. Podatke će vratiti u markdown/HTML formatu");
console.log("4. Parsiraj podatke iz tabele koja se nalazi na stranici");

module.exports = firecrawlConfig;