# 🤝 JEDNOSTAVAN NAČIN RADA ZA TIM

## 🚨 NAJVAŽNIJE PRAVILO
**NIKAD NEMOJTE RADITI U ISTO VREME!**

## 📅 RASPORED RADA

### Ponedeljak, Sreda, Petak - TARIK RADI
### Utorak, Četvrtak, Subota - KUM RADI
### Nedelja - NIKO NE RADI (odmor)

---

## 🎯 KO RADI NA ČEMU

### TARIK RADI NA:
- Fakture (invoices)
- Radni nalozi (work-orders)
- Firme (companies)
- Kontakti (contacts)

### KUM RADI NA:
- Ponude (quotes)
- Kalkulacije (calculations)
- Dashboard
- Proizvodi (products)

---

## 📝 KAKO DA RADITE (3 JEDNOSTAVNA KORAKA)

### KORAK 1: PRE POČETKA RADA
Otvori terminal i kucaj:
```bash
./sync-start.sh
```
Ovo će automatski:
- Povući najnovije izmene
- Pokazati ti da li je sve OK
- Reći ti da možeš da počneš

### KORAK 2: TOKOM RADA
Radi normalno sa Claude Code. Kada završiš bilo šta (makar i malu izmenu), kucaj:
```bash
./sync-save.sh "Opis šta si uradio"
```
Primer:
```bash
./sync-save.sh "Dodao sam novu stranicu za korisnike"
```

### KORAK 3: KADA ZAVRŠIŠ ZA DANAS
```bash
./sync-end.sh
```
Ovo će:
- Sačuvati sve tvoje izmene
- Poslati ih na server
- Pripremiti sve za kuma/tebe sutra

---

## ⚠️ AKO SE DESI PROBLEM

Samo pozovi:
```bash
./sync-help.sh
```

Ovo će:
1. Pokazati ti šta je problem
2. Pokušati automatski da reši
3. Ako ne može, reći će ti da pozoveš pomoć

---

## 🔴 CRVENA LAMPICA - KADA NE SME DA SE RADI

Ako vidiš fajl koji se zove `SOMEONE-IS-WORKING.lock`:
- **NEMOJ RADITI!**
- Sačekaj da se fajl obriše
- To znači da drugi trenutno radi

---

## 📱 KOMUNIKACIJA

1. Pre početka rada pošalji poruku: "Počinjem da radim"
2. Kada završiš pošalji: "Završio sam za danas"
3. Ako imaš problem: "Treba mi pomoć sa [opisati problem]"

---

## 🎉 TO JE SVE!

Ne morate znati Git, ne morate razumeti branch-ove, samo:
1. `./sync-start.sh` - pre rada
2. `./sync-save.sh "opis"` - tokom rada
3. `./sync-end.sh` - posle rada

---

## 💡 ZLATNA PRAVILA

1. **NIKAD ne radiš direktno u folderu `invoices` ako nisi Tarik**
2. **NIKAD ne radiš direktno u folderu `quotes` ako nisi Kum**
3. **UVEK sačuvaj svoj rad pre nego što ugasiš računar**
4. **AKO NEŠTO NE RADI - nemoj sam pokušavati, pozovi pomoć**