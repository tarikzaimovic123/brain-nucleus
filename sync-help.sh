#!/bin/bash

echo "🆘 AUTOMATSKA POMOĆ"
echo "==================="

echo "🔍 Proveravam stanje..."

# Proveri Git status
STATUS=$(git status --porcelain)

if [ -z "$STATUS" ]; then
    echo "✅ Sve je čisto, nema problema!"
else
    echo "📝 Imaš nesačuvane izmene:"
    git status --short
    echo ""
    echo "💡 REŠENJE: Pokreni ./sync-save.sh 'Opis izmena'"
fi

# Proveri da li ima konflikta
CONFLICTS=$(git diff --name-only --diff-filter=U)
if [ ! -z "$CONFLICTS" ]; then
    echo "⚠️ IMAM KONFLIKTE! Ovo je malo ozbiljnije."
    echo "📱 POZOVI POMOĆ ili probaj:"
    echo ""
    echo "git checkout --theirs ."
    echo "git add ."
    echo "git commit -m 'Rešeni konflikti'"
    exit 1
fi

# Proveri lock fajl
if [ -f "SOMEONE-IS-WORKING.lock" ]; then
    echo ""
    echo "🔒 Lock fajl postoji:"
    cat SOMEONE-IS-WORKING.lock
    echo ""
    echo "Opcije:"
    echo "1. Sačekaj da ta osoba završi"
    echo "2. Ako znaš da ta osoba ne radi, obriši sa: rm SOMEONE-IS-WORKING.lock"
fi

# Proveri konekciju sa GitHub
echo ""
echo "🌐 Proveravam konekciju sa serverom..."
git ls-remote --heads origin > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Konekcija sa serverom je OK!"
else
    echo "❌ Ne mogu da se povežem sa serverom."
    echo "Proveri internet konekciju."
fi

echo ""
echo "==================="
echo "📞 Ako i dalje imaš problem:"
echo "1. Napravi screenshot ove poruke"
echo "2. Pošalji na WhatsApp/Viber"
echo "3. Ili pozovi telefonom"