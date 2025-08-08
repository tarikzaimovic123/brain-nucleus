#!/bin/bash

# Konfiguracija
BASE_URL="https://www.boniteti.me"
ENDPOINT="/advanced-search-company/CompanyFilteringRead"
COOKIES="ASP.NET_SessionId=tkebso4v3hnqgpgqz2lmma4a; Boniteti.me.UserCheck=6F88B9041376C77AAEE47841A835C38C"
PAGE_SIZE=500
TOTAL_COMPANIES=148739

# Kreiraj direktorijum za podatke
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATA_DIR="boniteti-full-data-${TIMESTAMP}"
mkdir -p "$DATA_DIR"

echo "╔════════════════════════════════════════════════════════╗"
echo "║       BONITETI.ME - PREUZIMANJE SVIH KOMPANIJA        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Ukupno kompanija: $TOTAL_COMPANIES"
echo "📄 Veličina stranice: $PAGE_SIZE"

# Izračunaj broj stranica
TOTAL_PAGES=$((($TOTAL_COMPANIES + $PAGE_SIZE - 1) / $PAGE_SIZE))
echo "📑 Ukupno stranica: $TOTAL_PAGES"
echo "============================================================"
echo ""

# Glavni fajl za sve podatke
ALL_DATA_FILE="${DATA_DIR}/all-companies-raw.json"

# Funkcija za preuzimanje jedne stranice
fetch_page() {
    local page=$1
    local output_file="${DATA_DIR}/page-$(printf "%03d" $page).json"
    
    echo "📥 Stranica $page/$TOTAL_PAGES ($(echo "scale=1; $page * 100 / $TOTAL_PAGES" | bc)%)"
    
    curl -s "${BASE_URL}${ENDPOINT}?sort=Revenue-desc&page=${page}&pageSize=${PAGE_SIZE}&group=&filter=" \
        -H 'Accept: */*' \
        -H 'Accept-Language: en-US,en;q=0.9,sr-RS;q=0.8,sr;q=0.7' \
        -H "Cookie: $COOKIES" \
        -H "Referer: ${BASE_URL}/advanced-search-company" \
        -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' \
        -H 'X-Requested-With: XMLHttpRequest' \
        -o "$output_file"
    
    # Proveri da li je preuzeto uspešno
    if [ -s "$output_file" ]; then
        # Proveri da li fajl sadrži podatke
        if grep -q '"Data":\[' "$output_file"; then
            COUNT=$(grep -o '"CompanyID"' "$output_file" | wc -l | tr -d ' ')
            echo "  ✅ Preuzeto: $COUNT kompanija"
            
            # Dodaj u glavni fajl
            cat "$output_file" >> "$ALL_DATA_FILE"
            
            return 0
        else
            echo "  ⚠️ Stranica nema podataka"
            return 1
        fi
    else
        echo "  ❌ Greška pri preuzimanju"
        return 1
    fi
}

# Preuzmi sve stranice
echo "🚀 Početak preuzimanja..."
echo ""

for page in $(seq 1 $TOTAL_PAGES); do
    fetch_page $page
    
    # Prikaži statistike na svakih 10 stranica
    if [ $((page % 10)) -eq 0 ] || [ $page -eq $TOTAL_PAGES ]; then
        echo ""
        echo "📊 MEĐUSTATISTIKE:"
        DOWNLOADED=$(grep -o '"CompanyID"' "$ALL_DATA_FILE" 2>/dev/null | wc -l | tr -d ' ')
        echo "  • Preuzeto kompanija: $DOWNLOADED"
        echo "  • Preostalo stranica: $(($TOTAL_PAGES - $page))"
        ESTIMATED_TIME=$(( ($TOTAL_PAGES - $page) * 2 ))
        echo "  • Procenjeno vreme: $(($ESTIMATED_TIME / 60)) minuta"
        echo ""
    fi
    
    # Pauza između zahteva (osim za poslednju stranicu)
    if [ $page -lt $TOTAL_PAGES ]; then
        sleep 1
    fi
done

echo ""
echo "============================================================"
echo "✅ PREUZIMANJE ZAVRŠENO!"

# Finalne statistike
TOTAL_DOWNLOADED=$(grep -o '"CompanyID"' "$ALL_DATA_FILE" 2>/dev/null | wc -l | tr -d ' ')
echo "📊 Ukupno preuzeto kompanija: $TOTAL_DOWNLOADED"
echo "💾 Podaci sačuvani u: $DATA_DIR"
echo ""

# Prikaži veličinu fajlova
echo "📁 Veličina podataka:"
du -sh "$DATA_DIR"/*.json | head -5

echo ""
echo "💡 Za parsiranje podataka, pokreni:"
echo "   node parse-all-companies.js $DATA_DIR/all-companies-raw.json"
echo ""
echo "============================================================"