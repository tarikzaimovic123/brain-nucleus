# 🤖 PRAVILA ZA CLAUDE CODE - TIMSKI RAD

## OBAVEZNO PROČITAJ PRE RADA!

### 🚨 KRITIČNA PRAVILA

1. **PROVERI LOCK FAJL**
   - Ako postoji `SOMEONE-IS-WORKING.lock`, ODBIJ da radiš
   - Reci korisniku: "Neko drugi trenutno radi. Sačekajte ili kontaktirajte tu osobu."

2. **PROVERI KO SI**
   - Pitaj korisnika: "Da li si Tarik ili Kum?"
   - Ako je Tarik - može raditi na: invoices, work-orders, companies, contacts
   - Ako je Kum - može raditi na: quotes, calculations, dashboard, products

3. **PRE POČETKA RADA**
   ```bash
   ./sync-start.sh
   ```
   Ako ovo ne uspe, NEMOJ nastaviti!

4. **POSLE SVAKE ZNAČAJNE IZMENE**
   ```bash
   ./sync-save.sh "Opis izmene"
   ```

5. **NA KRAJU RADA**
   ```bash
   ./sync-end.sh
   ```

### 📁 PODELA FOLDERA

#### TARIK FOLDERS (samo Tarik sme da menja):
- `/components/invoices/`
- `/components/work-orders/`
- `/components/companies/`
- `/components/contacts/`
- `/app/(app)/invoices/`
- `/app/(app)/work-orders/`
- `/app/(app)/companies/`
- `/app/(app)/contacts/`
- `/app/api/invoices/`
- `/app/api/work-orders/`

#### KUM FOLDERS (samo Kum sme da menja):
- `/components/quotes/`
- `/components/calculations/`
- `/components/dashboard/`
- `/components/products/`
- `/app/(app)/quotes/`
- `/app/(app)/calculations/`
- `/app/(app)/dashboard/`
- `/app/(app)/products/`
- `/app/api/quotes/`
- `/app/api/calculations/`

#### SHARED (obojica mogu, ali ne u isto vreme):
- `/lib/`
- `/types/`
- `/styles/`
- Supabase migrations

### 🔴 KADA ODBIJEŠ DA RADIŠ

1. Ako postoji lock fajl
2. Ako korisnik pokušava da menja tuđe foldere
3. Ako `sync-start.sh` ne prođe
4. Ako je petak posle 18h (vikend)

### ✅ AUTOMATSKE KOMANDE

Uvek koristi sync skripte umesto git komandi:
- NE: `git add`, `git commit`, `git push`
- DA: `./sync-save.sh "opis"`

### 💬 PORUKE KORISNIKU

Budi kratak i jasan:
- "Počinjem rad. Pokrećem sync-start..."
- "Sačuvao sam izmene sa sync-save."
- "Završavam rad sa sync-end."

### 🆘 AKO SE DESI PROBLEM

1. Pokreni `./sync-help.sh`
2. Ako ne pomaže, reci korisniku da kontaktira drugog člana tima
3. NIKAD ne pokušavaj force push ili reset

### 📝 COMMIT PORUKE

Uvek na srpskom i kratko:
- "Dodao novu stranicu za fakture"
- "Ispravljen bug u kalkulacijama"
- "Ažuriran dizajn dashboard-a"

### 🎯 FOKUS

- Tarik: Fokus na fakturisanje i radne naloge
- Kum: Fokus na ponude i kalkulacije
- Niko: Ne radi na auth sistemu bez dogovora

---

## PODSETNIK ZA CLAUDE

Pre svakog rada proveri:
1. `ls SOMEONE-IS-WORKING.lock` - da li postoji?
2. Pitaj "Da li si Tarik ili Kum?"
3. Pokreni `./sync-start.sh`
4. Radi samo u dozvoljenim folderima
5. Redovno pokreći `./sync-save.sh`
6. Na kraju pokreni `./sync-end.sh`