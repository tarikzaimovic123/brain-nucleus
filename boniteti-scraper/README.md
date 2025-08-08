# Boniteti.me Scraper

Sistem za preuzimanje podataka o kompanijama sa boniteti.me portala.

## 📁 Struktura Foldera

### Glavne Skripte
- `boniteti-full-scraper.js` - Glavni scraper za sve kompanije
- `extract-activity-code.js` - Ekstraktuje šifre djelatnosti
- `boniteti-fetch-all.sh` - Bash skripta za masovno preuzimanje
- `create-final-csv.js` - Kreira finalne CSV fajlove

### Rezultati
- `boniteti-kompanije-*.csv` - CSV sa osnovnim podacima
- `boniteti-with-activity-*.csv` - CSV sa šiframa djelatnosti
- `boniteti-api-structure.json` - Struktura API response

## 🚀 Kako Koristiti

### 1. Preuzmi osnovne podatke (500 kompanija)
```bash
./boniteti-fetch.sh
node create-final-csv.js
```

### 2. Dodaj šifre djelatnosti
```bash
node extract-activity-code.js
```

### 3. Preuzmi SVE kompanije (148,739)
```bash
node boniteti-full-scraper.js
# Ili bash verzija:
./boniteti-fetch-all.sh
```

## 📊 Podaci koje Ekstraktujemo

- **PIB** (VatNumber)
- **Matični broj** (RegistryCode)
- **CRPS Status** (AprStatus)
- **Promet 2024** (Revenue)
- **Profit**
- **Broj zaposlenih** (NumberOfEmployees)
- **Ukupna aktiva** (Assets)
- **Šifra djelatnosti** (activityCode)
- **Naziv djelatnosti** (activityName)
- **Datum osnivanja** (FoundingDate)
- **Grad, Adresa, Email, Telefon, Website**

## ⚠️ Napomene

1. **Autentifikacija**: Potrebni su validni session cookies
2. **Rate Limiting**: Pauze između zahteva (0.5-1 sekunda)
3. **Vreme izvršavanja**: 
   - 500 kompanija: ~2 minuta
   - Sve kompanije: ~10 minuta
   - Sa šiframa djelatnosti: ~41 sat

## 📈 Statistike iz Preuzeta Podataka

- Ukupno kompanija u bazi: **148,739**
- Trenutno preuzeto: **500**
- Top kompanija po prometu: **ELEKTROPRIVREDA CRNE GORE AD** (€424M)