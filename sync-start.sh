#!/bin/bash

echo "🚀 PRIPREMA ZA RAD..."
echo "===================="

# Proveri da li neko drugi radi
if [ -f "SOMEONE-IS-WORKING.lock" ]; then
    echo "❌ STOP! NEKO DRUGI TRENUTNO RADI!"
    echo "Ime: $(cat SOMEONE-IS-WORKING.lock)"
    echo "Sačekaj da završi ili ga kontaktiraj."
    exit 1
fi

# Označi da ti počinješ
echo "$USER - $(date)" > SOMEONE-IS-WORKING.lock

# Povuci najnovije izmene
echo "📥 Preuzimam najnovije izmene..."
git pull origin main --no-edit

if [ $? -ne 0 ]; then
    echo "⚠️ Ima nekih problema, ali pokušavam da rešim..."
    git stash
    git pull origin main --no-edit
    git stash pop
fi

# Instaliraj nove pakete ako treba
if [ -f "package.json" ]; then
    echo "📦 Proveravam pakete..."
    npm install
fi

echo ""
echo "✅ SVE JE SPREMNO!"
echo "===================="
echo "🎯 MOŽEŠ DA POČNEŠ DA RADIŠ!"
echo ""
echo "PODSETNIK: Kada završiš nešto, pokreni:"
echo "./sync-save.sh 'Opis šta si uradio'"