#!/bin/bash

if [ -z "$1" ]; then
    echo "❌ Moraš da opišeš šta si uradio!"
    echo "Primer: ./sync-save.sh 'Dodao sam novu stranicu'"
    exit 1
fi

echo "💾 ČUVAM TVOJE IZMENE..."
echo "========================"

# Dodaj sve izmene
git add .

# Sačuvaj sa opisom
git commit -m "$1

Automatski sačuvano: $(date)
Korisnik: $USER"

if [ $? -eq 0 ]; then
    echo "✅ Izmene su sačuvane lokalno!"
    echo ""
    echo "📤 Šaljem na server..."
    git push origin main
    
    if [ $? -eq 0 ]; then
        echo "✅ SVE JE USPEŠNO SAČUVANO!"
    else
        echo "⚠️ Nije poslato na server, ali sačuvano je kod tebe."
        echo "Pokušaj ponovo kasnije sa: git push origin main"
    fi
else
    echo "ℹ️ Nema novih izmena za čuvanje."
fi