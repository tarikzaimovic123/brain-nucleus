-- Kreiranje schema za Boniteti podatke
CREATE SCHEMA IF NOT EXISTS boniteti;

-- 1. OSNOVNA TABELA KOMPANIJA
-- Čuva osnovne/registracione podatke koji se retko menjaju
CREATE TABLE boniteti.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Jedinstveni identifikatori
    registration_number VARCHAR(20) UNIQUE NOT NULL, -- Registarski broj (40000330)
    tax_number VARCHAR(20) UNIQUE NOT NULL,         -- PIB (02002230)
    
    -- Osnovni podaci
    name_short VARCHAR(255) NOT NULL,               -- Naziv skraćeni
    name_full TEXT NOT NULL,                        -- Naziv pun
    
    -- Delatnost
    activity_code VARCHAR(50),                      -- Šifra delatnosti (3511)
    activity_description TEXT,                      -- Opis delatnosti
    
    -- Pravni oblik i status
    legal_form VARCHAR(100),                        -- Pravni oblik (Akcionarsko društvo)
    status VARCHAR(50),                              -- Status (Aktivan)
    crps_status VARCHAR(50),                        -- CRPS Status
    
    -- Datumi
    founded_date DATE,                              -- Datum osnivanja
    registration_date DATE,                         -- Datum brisanja
    
    -- Lokacija
    country VARCHAR(100),                           -- Država
    region VARCHAR(100),                            -- Opština  
    city VARCHAR(100),                              -- Mesto
    address TEXT,                                   -- Adresa
    
    -- Kapital
    authorized_capital DECIMAL(20,2),               -- Upisano povećanje kapitala
    paid_capital DECIMAL(20,2),                     -- Uplaćeno povećanje kapitala
    total_capital DECIMAL(20,2),                    -- Ukupno smanјenјe kapitala
    
    -- Vlasništvo
    ownership_type VARCHAR(50),                     -- PDV Obveznik/broj
    vat_number VARCHAR(50),                         -- PDV broj
    
    -- Veličina
    company_size VARCHAR(20),                       -- Veličina (Veliko, Malo, Srednje)
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_scraped_at TIMESTAMP,
    
    -- Indexi
    INDEX idx_registration_number (registration_number),
    INDEX idx_tax_number (tax_number),
    INDEX idx_name (name_short),
    INDEX idx_activity_code (activity_code),
    INDEX idx_city (city),
    INDEX idx_status (status)
);

-- 2. TABELA ZA FINANSIJSKE POKAZATELJE
-- Čuva sve finansijske pokazatelje po godinama
CREATE TABLE boniteti.financial_indicators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES boniteti.companies(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    
    -- BILANS STANJA - AKTIVA
    stalna_imovina DECIMAL(20,2),                   -- Stalna imovina
    neuplaceni_upisani_kapital DECIMAL(20,2),       -- Neuplaćeni upisani kapital
    goodwill DECIMAL(20,2),                         -- Goodwill
    nematerijalna_ulaganja DECIMAL(20,2),           -- Nematerijalna ulaganja
    nekretnine_postrojenja_oprema DECIMAL(20,2),    -- Nekretnine, postrojenja i oprema
    investicione_nekretnine DECIMAL(20,2),          -- Investicione nekretnine
    dugorocni_finansijski_plasmani DECIMAL(20,2),   -- Dugoročni finansijski plasmani
    dugorocna_potrazivanja DECIMAL(20,2),           -- Dugoročna potraživanja
    
    obrtna_imovina DECIMAL(20,2),                   -- Obrtna imovina
    zalihe DECIMAL(20,2),                           -- Zalihe
    potrazivanja_po_osnovu_prodaje DECIMAL(20,2),   -- Potraživanja po osnovu prodaje
    potrazivanja_iz_specificnih_poslova DECIMAL(20,2), -- Potraživanja iz specifičnih poslova
    druga_potrazivanja DECIMAL(20,2),               -- Druga potraživanja
    finansijska_sredstva DECIMAL(20,2),             -- Finansijska sredstva koja se vrednuju po fer vrijednosti
    kratkorocni_finansijski_plasmani DECIMAL(20,2), -- Kratkoročni finansijski plasmani
    gotovinski_ekvivalenti DECIMAL(20,2),           -- Gotovinski ekvivalenti i gotovina
    porez_na_dodatu_vrijednost DECIMAL(20,2),       -- Porez na dodatu vrijednost
    aktivna_vremenska_razgranicenja DECIMAL(20,2),  -- Aktivna vremenska razgraničenja
    
    poslovna_imovina DECIMAL(20,2),                 -- Poslovna imovina
    ukupna_aktiva DECIMAL(20,2),                    -- UKUPNA AKTIVA
    vanbilansna_aktiva DECIMAL(20,2),               -- Vanbilansna aktiva
    
    -- BILANS STANJA - PASIVA
    kapital DECIMAL(20,2),                          -- Kapital
    osnovni_kapital DECIMAL(20,2),                  -- Osnovni kapital
    neuplaceni_upisani_kapital_pasiva DECIMAL(20,2), -- Neuplaćeni upisani kapital
    upisani_neuplaceni_kapital DECIMAL(20,2),       -- Upisani a neuplaćeni kapital
    rezerve DECIMAL(20,2),                          -- Rezerve
    revalorizacione_rezerve DECIMAL(20,2),          -- Revalorizacione rezerve
    nerealizovani_dobici DECIMAL(20,2),             -- Nerealizovani dobici po osnovu HOV
    nerealizovani_gubici DECIMAL(20,2),             -- Nerealizovani gubici po osnovu HOV
    nerasporedjena_dobit DECIMAL(20,2),             -- Nerasporedjenja dobit
    gubitak DECIMAL(20,2),                          -- Gubitak
    otkupljene_sopstvene_akcije DECIMAL(20,2),      -- Otkupljene sopstvene akcije
    
    dugorocna_rezervisanja DECIMAL(20,2),           -- Dugoročna rezervisanja i obaveze
    dugorocne_obaveze DECIMAL(20,2),                -- Dugoročne obaveze
    dugorocni_krediti DECIMAL(20,2),                -- Dugoročni krediti
    obaveze_iz_poslovanja DECIMAL(20,2),            -- Obaveze iz poslovanja
    
    kratkorocne_obaveze DECIMAL(20,2),              -- Kratkoročne obaveze
    kratkorocne_finansijske_obaveze DECIMAL(20,2),  -- Kratkoročne finansijske obaveze
    primljeni_avansi DECIMAL(20,2),                 -- Primljeni avansi
    obaveze_iz_poslovanja_kratkorocne DECIMAL(20,2), -- Obaveze iz poslovanja
    ostale_kratkorocne_obaveze DECIMAL(20,2),       -- Ostale kratkoročne obaveze
    obaveze_po_osnovu_pdv DECIMAL(20,2),            -- Obaveze po osnovu PDV
    obaveze_za_porez_dobit DECIMAL(20,2),           -- Obaveze za porez iz dobitka
    pasivna_vremenska_razgranicenja DECIMAL(20,2),  -- Pasivna vremenska razgraničenja
    
    ukupna_pasiva DECIMAL(20,2),                    -- UKUPNA PASIVA
    vanbilansna_pasiva DECIMAL(20,2),               -- Vanbilansna pasiva
    
    -- BILANS USPEHA
    poslovni_prihodi DECIMAL(20,2),                 -- Poslovni prihodi
    prihodi_od_prodaje DECIMAL(20,2),               -- Prihodi od prodaje robe
    prihodi_od_prodaje_proizvoda DECIMAL(20,2),     -- Prihodi od prodaje proizvoda i usluga
    prihodi_od_premija DECIMAL(20,2),               -- Prihodi od premija, subvencija
    drugi_poslovni_prihodi DECIMAL(20,2),           -- Drugi poslovni prihodi
    
    poslovni_rashodi DECIMAL(20,2),                 -- Poslovni rashodi
    nabavna_vrijednost_robe DECIMAL(20,2),          -- Nabavna vrijednost prodate robe
    prihodi_od_aktiviranja DECIMAL(20,2),           -- Prihodi od aktiviranja učinaka
    povecanje_zaliha DECIMAL(20,2),                 -- Povećanje vrijednosti zaliha
    smanjenje_zaliha DECIMAL(20,2),                 -- Smanjenje vrijednosti zaliha
    troskovi_materijala DECIMAL(20,2),              -- Troškovi materijala
    troskovi_goriva DECIMAL(20,2),                  -- Troškovi goriva i energije
    troskovi_zarada DECIMAL(20,2),                  -- Troškovi zarada
    troskovi_proizvodnih_usluga DECIMAL(20,2),      -- Troškovi proizvodnih usluga
    troskovi_amortizacije DECIMAL(20,2),            -- Troškovi amortizacije
    troskovi_dugorocnih_rezervisanja DECIMAL(20,2), -- Troškovi dugoročnih rezervisanja
    nematerijalni_troskovi DECIMAL(20,2),           -- Nematerijalni troškovi
    
    poslovni_dobitak DECIMAL(20,2),                 -- Poslovni dobitak
    poslovni_gubitak DECIMAL(20,2),                 -- Poslovni gubitak
    
    finansijski_prihodi DECIMAL(20,2),              -- Finansijski prihodi
    finansijski_rashodi DECIMAL(20,2),              -- Finansijski rashodi
    
    dobitak_iz_finansiranja DECIMAL(20,2),          -- Dobitak iz finansiranja
    gubitak_iz_finansiranja DECIMAL(20,2),          -- Gubitak iz finansiranja
    
    prihodi_od_uskladjivanja DECIMAL(20,2),         -- Prihodi od usklađivanja vrijednosti
    rashodi_od_uskladjivanja DECIMAL(20,2),         -- Rashodi od usklađivanja vrijednosti
    
    ostali_prihodi DECIMAL(20,2),                   -- Ostali prihodi
    ostali_rashodi DECIMAL(20,2),                   -- Ostali rashodi
    
    dobitak_prije_oporezivanja DECIMAL(20,2),       -- Dobitak prije oporezivanja
    gubitak_prije_oporezivanja DECIMAL(20,2),       -- Gubitak prije oporezivanja
    
    porez_na_dobitak DECIMAL(20,2),                 -- Porez na dobitak
    
    neto_dobitak DECIMAL(20,2),                     -- Neto dobitak
    neto_gubitak DECIMAL(20,2),                     -- Neto gubitak
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Jedinstveni ključ za kompaniju i godinu
    UNIQUE KEY unique_company_year (company_id, year),
    
    -- Indexi
    INDEX idx_company_year (company_id, year),
    INDEX idx_year (year)
);

-- 3. TABELA ZA REZULTATE POSLOVANJA
-- Čuva ključne pokazatelje performansi po godinama
CREATE TABLE boniteti.business_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES boniteti.companies(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    
    -- Rezultati poslovanja
    poslovni_prihod DECIMAL(20,2),                  -- Poslovni prihodi
    stopa_povrata_na_kapital_roe DECIMAL(10,4),     -- Stopa povrata na kapital (ROE) %
    stopa_povrata_aktive_roa DECIMAL(10,4),         -- Stopa povrata aktive (ROA) %
    prosecno_vreme_naplate_potrazivanja INTEGER,    -- Prosečno vreme naplate potraživanja (u danima)
    prosecno_vreme_placanja_obaveza INTEGER,        -- Prosečno vreme plaćanja dobavljačima (u danima)
    neto_rezultat DECIMAL(20,2),                    -- Neto rezultat
    poslovni_prihod_po_zaposlenom DECIMAL(20,2),    -- Poslovni prihod po zaposlenom
    potrazivanja DECIMAL(20,2),                     -- Potraživanja
    gotovinski_ekvivalenti_gotovina DECIMAL(20,2),  -- Gotovinski ekvivalenti i gotovina
    ukupna_aktiva DECIMAL(20,2),                    -- Ukupna aktiva
    obaveze_iz_poslovanja DECIMAL(20,2),            -- Obaveze iz poslovanja
    broj_zaposlenih INTEGER,                        -- Broj zaposlenih
    
    -- Procentualne promene (rast/pad)
    poslovni_prihod_change DECIMAL(10,2),           -- % promene u odnosu na prethodnu godinu
    roe_change DECIMAL(10,2),
    roa_change DECIMAL(10,2),
    neto_rezultat_change DECIMAL(10,2),
    prihod_po_zaposlenom_change DECIMAL(10,2),
    potrazivanja_change DECIMAL(10,2),
    gotovina_change DECIMAL(10,2),
    aktiva_change DECIMAL(10,2),
    obaveze_change DECIMAL(10,2),
    broj_zaposlenih_change DECIMAL(10,2),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Jedinstveni ključ
    UNIQUE KEY unique_company_year (company_id, year),
    
    -- Indexi
    INDEX idx_company_year (company_id, year),
    INDEX idx_year (year)
);

-- 4. TABELA ZA PRAĆENJE SINHRONIZACIJE
-- Omogućava praćenje šta je već skinuto i kada
CREATE TABLE boniteti.sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES boniteti.companies(id) ON DELETE CASCADE,
    sync_type VARCHAR(50), -- 'registration', 'financial', 'business_results'
    year INTEGER,
    sync_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20), -- 'success', 'failed', 'partial'
    details JSONB, -- Dodatni detalji o sinhronizaciji
    
    INDEX idx_company_sync (company_id, sync_type, year),
    INDEX idx_sync_date (sync_date)
);

-- 5. TABELA ZA ISTORIJU PROMENA KAPITALA
-- Čuva promene kapitala kroz vreme
CREATE TABLE boniteti.capital_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES boniteti.companies(id) ON DELETE CASCADE,
    change_date DATE,
    change_type VARCHAR(50), -- 'increase', 'decrease'
    amount DECIMAL(20,2),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_company_changes (company_id, change_date)
);

-- Trigger za ažuriranje updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON boniteti.companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_indicators_updated_at BEFORE UPDATE ON boniteti.financial_indicators
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_results_updated_at BEFORE UPDATE ON boniteti.business_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();