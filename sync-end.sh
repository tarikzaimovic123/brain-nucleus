#!/bin/bash

echo "🏁 ZAVRŠAVAM RADNI DAN..."
echo "========================="

# Sačuvaj sve što nije sačuvano
git add .
git commit -m "Kraj rada za danas - $(date)
Korisnik: $USER"

# Pošalji na server
echo "📤 Šaljem poslednje izmene..."
git push origin main

# Ukloni lock fajl
if [ -f "SOMEONE-IS-WORKING.lock" ]; then
    rm SOMEONE-IS-WORKING.lock
    echo "🔓 Oslobođeno za sledećeg!"
fi

echo ""
echo "✅ SVE JE ZAVRŠENO!"
echo "==================="
echo "📴 Možeš ugasiti računar."
echo "👋 Vidimo se sutra!"