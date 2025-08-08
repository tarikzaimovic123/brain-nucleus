#!/bin/bash

# Test verzija - samo 3 stranice

# Konfiguracija
BASE_URL="https://www.boniteti.me"
ENDPOINT="/advanced-search-company/CompanyFilteringRead"
COOKIES="ASP.NET_SessionId=tkebso4v3hnqgpgqz2lmma4a; Boniteti.me.UserCheck=6F88B9041376C77AAEE47841A835C38C"
PAGE_SIZE=500

echo "🧪 TEST REŽIM - Preuzimanje prvih 3 stranice"
echo "============================================"

# Preuzmi prvih nekoliko stranica
for page in 1 2 3; do
    echo ""
    echo "📥 Stranica $page..."
    
    OUTPUT_FILE="test-page-${page}.json"
    
    curl -s "${BASE_URL}${ENDPOINT}?sort=Revenue-desc&page=${page}&pageSize=${PAGE_SIZE}&group=&filter=" \
        -H 'Accept: */*' \
        -H 'Accept-Language: en-US,en;q=0.9,sr-RS;q=0.8,sr;q=0.7' \
        -H "Cookie: $COOKIES" \
        -H "Referer: ${BASE_URL}/advanced-search-company" \
        -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' \
        -H 'X-Requested-With: XMLHttpRequest' \
        -o "$OUTPUT_FILE"
    
    if [ -s "$OUTPUT_FILE" ]; then
        # Proveri strukturu
        if grep -q '"Data":\[' "$OUTPUT_FILE"; then
            COUNT=$(grep -o '"CompanyID"' "$OUTPUT_FILE" | wc -l | tr -d ' ')
            echo "  ✅ Stranica $page: $COUNT kompanija"
            
            # Prikaži prvu kompaniju kao primer
            echo "  📋 Primer podataka:"
            grep -o '"Name":"[^"]*"' "$OUTPUT_FILE" | head -1
        else
            echo "  ⚠️ Stranica $page: Nema Data polja"
            echo "  Sadržaj:"
            head -c 200 "$OUTPUT_FILE"
        fi
    else
        echo "  ❌ Stranica $page: Fajl prazan"
    fi
done

echo ""
echo "✅ Test završen!"
echo "Proveri test-page-*.json fajlove"