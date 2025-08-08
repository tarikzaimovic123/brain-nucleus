# 🧠 Projektni zadatak: Fullstack Starter Template za biznis aplikaciju

## 🎯 Cilj
Napraviti **fullstack starter arhitekturu** u **Next.js-u** (najnoviji App Router) sa fokusom na:

- Brzinu razvoja (rapid prototyping)
- Modularnost i skalabilnost
- Kvalitetan DX (Developer Experience)

---

## 🛠️ Tehnologije

| Sloj             | Tehnologija                                    |
|------------------|------------------------------------------------|
| Frontend/Backend | **Next.js (App Router, TypeScript, Server Actions, RSC)** |
| Baza             | **Supabase (PostgreSQL)**                      |
| Autentifikacija  | **Supabase Auth**                              |
| Storage          | **Supabase Storage**                           |
| UI               | **Tailwind CSS** + **shadcn/ui**               |
| Validacija       | **Zod**                                        |
| State menadžment | Server components + `useState` / `useEffect`   |
| API komunikacija | **Server Actions** + Supabase SDK              |
| Deploy           | **Vercel** (primarno), opcionalno **Docker**   |

---

## 📁 Arhitektura foldera (primjer)
/app
/dashboard
/auth
/settings
/components
/ui
/shared
/lib
supabase.ts
utils.ts
auth.ts
/services
userService.ts
dbService.ts
/types
user.ts
common.ts
/validators
userValidator.ts
/middleware.ts
.env


---

## ✅ Obavezne funkcionalnosti

1. **Registracija / Login korisnika**
   - Supabase Auth
   - Login/Signup forme sa validacijom (Zod)
   - Zaštita ruta (middleware)

2. **Dashboard za logovane korisnike**
   - Prikaz korisničkih podataka iz baze
   - Logout opcija
   - Korišćenje Server Components i Server Actions

3. **CRUD primjer: Tasks**
   - Tabela `tasks`
   - Prikaz liste taskova
   - Dodavanje taska putem forme

4. **UI komponentne**
   - Tailwind + shadcn/ui
   - Komponente: `Button`, `Input`, `Modal`, `Alert`, `Table`

5. **Deploy-ready konfiguracija**
   - `.env.example` za varijable
   - README.md sa uputstvima za pokretanje
   - Podešen Supabase klijent (`lib/supabase.ts`)

---

## 🧱 Infrastruktura

- Supabase klijent u `lib/supabase.ts`
- `.env` i `.env.example` fajlovi sa Supabase ključevima
- `vercel.json` ako bude potrebno
- Dev skripte u `package.json`:
  - `dev`, `build`, `lint`, `format`

---

## 📚 Dodatni zahtjevi

- React Server Components gdje god je moguće
- Sve forme koriste **Server Actions**
- Tipizacija kroz `types/` folder
- Middleware zaštita ruta (primjer)
- Modularan i komentarisani kod
- README.md sa uputstvima za razvoj i deploy

---

## 🎯 Cilj finalnog rješenja

Kompletna starter arhitektura spremna za:

- Rapidno razvijanje B2B/B2C aplikacija
- Lako proširenje na nove funkcionalnosti
- Spajanje sa mobilnim appovima ako zatreba

---

## 🚀 Kasnije proširenje

Ako starter zadovolji, možeš tražiti:

- Upravljanje projektima/taskovima po korisniku
- Email verifikaciju i reset lozinke
- Internationalizaciju (i18n)
- Logovanje grešaka i metrika
- Notifikacije i sistem obavještenja

---

## 📝 Napomena

Ako postoji izbor između jednostavnijeg i kompleksnijeg rješenja – birati **ono što omogućava brži razvoj bez kompromisa na kvalitet**.

