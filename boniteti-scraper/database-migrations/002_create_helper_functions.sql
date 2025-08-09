-- Helper funkcije za rad sa Boniteti podacima

-- 1. Funkcija za upsert kompanija (insert ili update)
CREATE OR REPLACE FUNCTION boniteti.upsert_company(
    p_registration_number VARCHAR,
    p_tax_number VARCHAR,
    p_name_short VARCHAR,
    p_name_full TEXT,
    p_activity_code VARCHAR DEFAULT NULL,
    p_activity_description TEXT DEFAULT NULL,
    p_legal_form VARCHAR DEFAULT NULL,
    p_status VARCHAR DEFAULT NULL,
    p_founded_date DATE DEFAULT NULL,
    p_country VARCHAR DEFAULT NULL,
    p_region VARCHAR DEFAULT NULL,
    p_city VARCHAR DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_authorized_capital DECIMAL DEFAULT NULL,
    p_paid_capital DECIMAL DEFAULT NULL,
    p_total_capital DECIMAL DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_company_id UUID;
BEGIN
    -- Pokušaj update postojeće kompanije
    UPDATE boniteti.companies SET
        name_short = p_name_short,
        name_full = p_name_full,
        activity_code = COALESCE(p_activity_code, activity_code),
        activity_description = COALESCE(p_activity_description, activity_description),
        legal_form = COALESCE(p_legal_form, legal_form),
        status = COALESCE(p_status, status),
        founded_date = COALESCE(p_founded_date, founded_date),
        country = COALESCE(p_country, country),
        region = COALESCE(p_region, region),
        city = COALESCE(p_city, city),
        address = COALESCE(p_address, address),
        authorized_capital = COALESCE(p_authorized_capital, authorized_capital),
        paid_capital = COALESCE(p_paid_capital, paid_capital),
        total_capital = COALESCE(p_total_capital, total_capital),
        last_scraped_at = CURRENT_TIMESTAMP
    WHERE registration_number = p_registration_number OR tax_number = p_tax_number
    RETURNING id INTO v_company_id;
    
    -- Ako ne postoji, insert novu kompaniju
    IF v_company_id IS NULL THEN
        INSERT INTO boniteti.companies (
            registration_number, tax_number, name_short, name_full,
            activity_code, activity_description, legal_form, status,
            founded_date, country, region, city, address,
            authorized_capital, paid_capital, total_capital,
            last_scraped_at
        ) VALUES (
            p_registration_number, p_tax_number, p_name_short, p_name_full,
            p_activity_code, p_activity_description, p_legal_form, p_status,
            p_founded_date, p_country, p_region, p_city, p_address,
            p_authorized_capital, p_paid_capital, p_total_capital,
            CURRENT_TIMESTAMP
        )
        RETURNING id INTO v_company_id;
    END IF;
    
    RETURN v_company_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Funkcija za upsert finansijskih pokazatelja
CREATE OR REPLACE FUNCTION boniteti.upsert_financial_indicators(
    p_company_id UUID,
    p_year INTEGER,
    p_indicators JSONB
) RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO boniteti.financial_indicators (
        company_id, year,
        stalna_imovina, neuplaceni_upisani_kapital, goodwill, nematerijalna_ulaganja,
        nekretnine_postrojenja_oprema, investicione_nekretnine, dugorocni_finansijski_plasmani,
        dugorocna_potrazivanja, obrtna_imovina, zalihe, potrazivanja_po_osnovu_prodaje,
        potrazivanja_iz_specificnih_poslova, druga_potrazivanja, finansijska_sredstva,
        kratkorocni_finansijski_plasmani, gotovinski_ekvivalenti, porez_na_dodatu_vrijednost,
        aktivna_vremenska_razgranicenja, poslovna_imovina, ukupna_aktiva, vanbilansna_aktiva,
        kapital, osnovni_kapital, neuplaceni_upisani_kapital_pasiva, upisani_neuplaceni_kapital,
        rezerve, revalorizacione_rezerve, nerealizovani_dobici, nerealizovani_gubici,
        nerasporedjena_dobit, gubitak, otkupljene_sopstvene_akcije, dugorocna_rezervisanja,
        dugorocne_obaveze, dugorocni_krediti, obaveze_iz_poslovanja, kratkorocne_obaveze,
        kratkorocne_finansijske_obaveze, primljeni_avansi, obaveze_iz_poslovanja_kratkorocne,
        ostale_kratkorocne_obaveze, obaveze_po_osnovu_pdv, obaveze_za_porez_dobit,
        pasivna_vremenska_razgranicenja, ukupna_pasiva, vanbilansna_pasiva,
        poslovni_prihodi, prihodi_od_prodaje, prihodi_od_prodaje_proizvoda, prihodi_od_premija,
        drugi_poslovni_prihodi, poslovni_rashodi, nabavna_vrijednost_robe, prihodi_od_aktiviranja,
        povecanje_zaliha, smanjenje_zaliha, troskovi_materijala, troskovi_goriva, troskovi_zarada,
        troskovi_proizvodnih_usluga, troskovi_amortizacije, troskovi_dugorocnih_rezervisanja,
        nematerijalni_troskovi, poslovni_dobitak, poslovni_gubitak, finansijski_prihodi,
        finansijski_rashodi, dobitak_iz_finansiranja, gubitak_iz_finansiranja,
        prihodi_od_uskladjivanja, rashodi_od_uskladjivanja, ostali_prihodi, ostali_rashodi,
        dobitak_prije_oporezivanja, gubitak_prije_oporezivanja, porez_na_dobitak,
        neto_dobitak, neto_gubitak
    ) VALUES (
        p_company_id, p_year,
        (p_indicators->>'stalna_imovina')::DECIMAL,
        (p_indicators->>'neuplaceni_upisani_kapital')::DECIMAL,
        (p_indicators->>'goodwill')::DECIMAL,
        (p_indicators->>'nematerijalna_ulaganja')::DECIMAL,
        (p_indicators->>'nekretnine_postrojenja_oprema')::DECIMAL,
        (p_indicators->>'investicione_nekretnine')::DECIMAL,
        (p_indicators->>'dugorocni_finansijski_plasmani')::DECIMAL,
        (p_indicators->>'dugorocna_potrazivanja')::DECIMAL,
        (p_indicators->>'obrtna_imovina')::DECIMAL,
        (p_indicators->>'zalihe')::DECIMAL,
        (p_indicators->>'potrazivanja_po_osnovu_prodaje')::DECIMAL,
        (p_indicators->>'potrazivanja_iz_specificnih_poslova')::DECIMAL,
        (p_indicators->>'druga_potrazivanja')::DECIMAL,
        (p_indicators->>'finansijska_sredstva')::DECIMAL,
        (p_indicators->>'kratkorocni_finansijski_plasmani')::DECIMAL,
        (p_indicators->>'gotovinski_ekvivalenti')::DECIMAL,
        (p_indicators->>'porez_na_dodatu_vrijednost')::DECIMAL,
        (p_indicators->>'aktivna_vremenska_razgranicenja')::DECIMAL,
        (p_indicators->>'poslovna_imovina')::DECIMAL,
        (p_indicators->>'ukupna_aktiva')::DECIMAL,
        (p_indicators->>'vanbilansna_aktiva')::DECIMAL,
        (p_indicators->>'kapital')::DECIMAL,
        (p_indicators->>'osnovni_kapital')::DECIMAL,
        (p_indicators->>'neuplaceni_upisani_kapital_pasiva')::DECIMAL,
        (p_indicators->>'upisani_neuplaceni_kapital')::DECIMAL,
        (p_indicators->>'rezerve')::DECIMAL,
        (p_indicators->>'revalorizacione_rezerve')::DECIMAL,
        (p_indicators->>'nerealizovani_dobici')::DECIMAL,
        (p_indicators->>'nerealizovani_gubici')::DECIMAL,
        (p_indicators->>'nerasporedjena_dobit')::DECIMAL,
        (p_indicators->>'gubitak')::DECIMAL,
        (p_indicators->>'otkupljene_sopstvene_akcije')::DECIMAL,
        (p_indicators->>'dugorocna_rezervisanja')::DECIMAL,
        (p_indicators->>'dugorocne_obaveze')::DECIMAL,
        (p_indicators->>'dugorocni_krediti')::DECIMAL,
        (p_indicators->>'obaveze_iz_poslovanja')::DECIMAL,
        (p_indicators->>'kratkorocne_obaveze')::DECIMAL,
        (p_indicators->>'kratkorocne_finansijske_obaveze')::DECIMAL,
        (p_indicators->>'primljeni_avansi')::DECIMAL,
        (p_indicators->>'obaveze_iz_poslovanja_kratkorocne')::DECIMAL,
        (p_indicators->>'ostale_kratkorocne_obaveze')::DECIMAL,
        (p_indicators->>'obaveze_po_osnovu_pdv')::DECIMAL,
        (p_indicators->>'obaveze_za_porez_dobit')::DECIMAL,
        (p_indicators->>'pasivna_vremenska_razgranicenja')::DECIMAL,
        (p_indicators->>'ukupna_pasiva')::DECIMAL,
        (p_indicators->>'vanbilansna_pasiva')::DECIMAL,
        (p_indicators->>'poslovni_prihodi')::DECIMAL,
        (p_indicators->>'prihodi_od_prodaje')::DECIMAL,
        (p_indicators->>'prihodi_od_prodaje_proizvoda')::DECIMAL,
        (p_indicators->>'prihodi_od_premija')::DECIMAL,
        (p_indicators->>'drugi_poslovni_prihodi')::DECIMAL,
        (p_indicators->>'poslovni_rashodi')::DECIMAL,
        (p_indicators->>'nabavna_vrijednost_robe')::DECIMAL,
        (p_indicators->>'prihodi_od_aktiviranja')::DECIMAL,
        (p_indicators->>'povecanje_zaliha')::DECIMAL,
        (p_indicators->>'smanjenje_zaliha')::DECIMAL,
        (p_indicators->>'troskovi_materijala')::DECIMAL,
        (p_indicators->>'troskovi_goriva')::DECIMAL,
        (p_indicators->>'troskovi_zarada')::DECIMAL,
        (p_indicators->>'troskovi_proizvodnih_usluga')::DECIMAL,
        (p_indicators->>'troskovi_amortizacije')::DECIMAL,
        (p_indicators->>'troskovi_dugorocnih_rezervisanja')::DECIMAL,
        (p_indicators->>'nematerijalni_troskovi')::DECIMAL,
        (p_indicators->>'poslovni_dobitak')::DECIMAL,
        (p_indicators->>'poslovni_gubitak')::DECIMAL,
        (p_indicators->>'finansijski_prihodi')::DECIMAL,
        (p_indicators->>'finansijski_rashodi')::DECIMAL,
        (p_indicators->>'dobitak_iz_finansiranja')::DECIMAL,
        (p_indicators->>'gubitak_iz_finansiranja')::DECIMAL,
        (p_indicators->>'prihodi_od_uskladjivanja')::DECIMAL,
        (p_indicators->>'rashodi_od_uskladjivanja')::DECIMAL,
        (p_indicators->>'ostali_prihodi')::DECIMAL,
        (p_indicators->>'ostali_rashodi')::DECIMAL,
        (p_indicators->>'dobitak_prije_oporezivanja')::DECIMAL,
        (p_indicators->>'gubitak_prije_oporezivanja')::DECIMAL,
        (p_indicators->>'porez_na_dobitak')::DECIMAL,
        (p_indicators->>'neto_dobitak')::DECIMAL,
        (p_indicators->>'neto_gubitak')::DECIMAL
    )
    ON CONFLICT (company_id, year) DO UPDATE SET
        stalna_imovina = EXCLUDED.stalna_imovina,
        neuplaceni_upisani_kapital = EXCLUDED.neuplaceni_upisani_kapital,
        goodwill = EXCLUDED.goodwill,
        nematerijalna_ulaganja = EXCLUDED.nematerijalna_ulaganja,
        nekretnine_postrojenja_oprema = EXCLUDED.nekretnine_postrojenja_oprema,
        investicione_nekretnine = EXCLUDED.investicione_nekretnine,
        dugorocni_finansijski_plasmani = EXCLUDED.dugorocni_finansijski_plasmani,
        dugorocna_potrazivanja = EXCLUDED.dugorocna_potrazivanja,
        obrtna_imovina = EXCLUDED.obrtna_imovina,
        zalihe = EXCLUDED.zalihe,
        potrazivanja_po_osnovu_prodaje = EXCLUDED.potrazivanja_po_osnovu_prodaje,
        potrazivanja_iz_specificnih_poslova = EXCLUDED.potrazivanja_iz_specificnih_poslova,
        druga_potrazivanja = EXCLUDED.druga_potrazivanja,
        finansijska_sredstva = EXCLUDED.finansijska_sredstva,
        kratkorocni_finansijski_plasmani = EXCLUDED.kratkorocni_finansijski_plasmani,
        gotovinski_ekvivalenti = EXCLUDED.gotovinski_ekvivalenti,
        porez_na_dodatu_vrijednost = EXCLUDED.porez_na_dodatu_vrijednost,
        aktivna_vremenska_razgranicenja = EXCLUDED.aktivna_vremenska_razgranicenja,
        poslovna_imovina = EXCLUDED.poslovna_imovina,
        ukupna_aktiva = EXCLUDED.ukupna_aktiva,
        vanbilansna_aktiva = EXCLUDED.vanbilansna_aktiva,
        kapital = EXCLUDED.kapital,
        osnovni_kapital = EXCLUDED.osnovni_kapital,
        neuplaceni_upisani_kapital_pasiva = EXCLUDED.neuplaceni_upisani_kapital_pasiva,
        upisani_neuplaceni_kapital = EXCLUDED.upisani_neuplaceni_kapital,
        rezerve = EXCLUDED.rezerve,
        revalorizacione_rezerve = EXCLUDED.revalorizacione_rezerve,
        nerealizovani_dobici = EXCLUDED.nerealizovani_dobici,
        nerealizovani_gubici = EXCLUDED.nerealizovani_gubici,
        nerasporedjena_dobit = EXCLUDED.nerasporedjena_dobit,
        gubitak = EXCLUDED.gubitak,
        otkupljene_sopstvene_akcije = EXCLUDED.otkupljene_sopstvene_akcije,
        dugorocna_rezervisanja = EXCLUDED.dugorocna_rezervisanja,
        dugorocne_obaveze = EXCLUDED.dugorocne_obaveze,
        dugorocni_krediti = EXCLUDED.dugorocni_krediti,
        obaveze_iz_poslovanja = EXCLUDED.obaveze_iz_poslovanja,
        kratkorocne_obaveze = EXCLUDED.kratkorocne_obaveze,
        kratkorocne_finansijske_obaveze = EXCLUDED.kratkorocne_finansijske_obaveze,
        primljeni_avansi = EXCLUDED.primljeni_avansi,
        obaveze_iz_poslovanja_kratkorocne = EXCLUDED.obaveze_iz_poslovanja_kratkorocne,
        ostale_kratkorocne_obaveze = EXCLUDED.ostale_kratkorocne_obaveze,
        obaveze_po_osnovu_pdv = EXCLUDED.obaveze_po_osnovu_pdv,
        obaveze_za_porez_dobit = EXCLUDED.obaveze_za_porez_dobit,
        pasivna_vremenska_razgranicenja = EXCLUDED.pasivna_vremenska_razgranicenja,
        ukupna_pasiva = EXCLUDED.ukupna_pasiva,
        vanbilansna_pasiva = EXCLUDED.vanbilansna_pasiva,
        poslovni_prihodi = EXCLUDED.poslovni_prihodi,
        prihodi_od_prodaje = EXCLUDED.prihodi_od_prodaje,
        prihodi_od_prodaje_proizvoda = EXCLUDED.prihodi_od_prodaje_proizvoda,
        prihodi_od_premija = EXCLUDED.prihodi_od_premija,
        drugi_poslovni_prihodi = EXCLUDED.drugi_poslovni_prihodi,
        poslovni_rashodi = EXCLUDED.poslovni_rashodi,
        nabavna_vrijednost_robe = EXCLUDED.nabavna_vrijednost_robe,
        prihodi_od_aktiviranja = EXCLUDED.prihodi_od_aktiviranja,
        povecanje_zaliha = EXCLUDED.povecanje_zaliha,
        smanjenje_zaliha = EXCLUDED.smanjenje_zaliha,
        troskovi_materijala = EXCLUDED.troskovi_materijala,
        troskovi_goriva = EXCLUDED.troskovi_goriva,
        troskovi_zarada = EXCLUDED.troskovi_zarada,
        troskovi_proizvodnih_usluga = EXCLUDED.troskovi_proizvodnih_usluga,
        troskovi_amortizacije = EXCLUDED.troskovi_amortizacije,
        troskovi_dugorocnih_rezervisanja = EXCLUDED.troskovi_dugorocnih_rezervisanja,
        nematerijalni_troskovi = EXCLUDED.nematerijalni_troskovi,
        poslovni_dobitak = EXCLUDED.poslovni_dobitak,
        poslovni_gubitak = EXCLUDED.poslovni_gubitak,
        finansijski_prihodi = EXCLUDED.finansijski_prihodi,
        finansijski_rashodi = EXCLUDED.finansijski_rashodi,
        dobitak_iz_finansiranja = EXCLUDED.dobitak_iz_finansiranja,
        gubitak_iz_finansiranja = EXCLUDED.gubitak_iz_finansiranja,
        prihodi_od_uskladjivanja = EXCLUDED.prihodi_od_uskladjivanja,
        rashodi_od_uskladjivanja = EXCLUDED.rashodi_od_uskladjivanja,
        ostali_prihodi = EXCLUDED.ostali_prihodi,
        ostali_rashodi = EXCLUDED.ostali_rashodi,
        dobitak_prije_oporezivanja = EXCLUDED.dobitak_prije_oporezivanja,
        gubitak_prije_oporezivanja = EXCLUDED.gubitak_prije_oporezivanja,
        porez_na_dobitak = EXCLUDED.porez_na_dobitak,
        neto_dobitak = EXCLUDED.neto_dobitak,
        neto_gubitak = EXCLUDED.neto_gubitak,
        updated_at = CURRENT_TIMESTAMP;
    
    -- Log sinhronizaciju
    INSERT INTO boniteti.sync_log (company_id, sync_type, year, status, details)
    VALUES (p_company_id, 'financial', p_year, 'success', p_indicators);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 3. Funkcija za upsert rezultata poslovanja
CREATE OR REPLACE FUNCTION boniteti.upsert_business_results(
    p_company_id UUID,
    p_year INTEGER,
    p_results JSONB
) RETURNS BOOLEAN AS $$
DECLARE
    v_prev_year INTEGER;
    v_prev_results RECORD;
BEGIN
    v_prev_year := p_year - 1;
    
    -- Pronađi prethodnu godinu za računanje promena
    SELECT * INTO v_prev_results 
    FROM boniteti.business_results 
    WHERE company_id = p_company_id AND year = v_prev_year;
    
    INSERT INTO boniteti.business_results (
        company_id, year,
        poslovni_prihod, stopa_povrata_na_kapital_roe, stopa_povrata_aktive_roa,
        prosecno_vreme_naplate_potrazivanja, prosecno_vreme_placanja_obaveza,
        neto_rezultat, poslovni_prihod_po_zaposlenom, potrazivanja,
        gotovinski_ekvivalenti_gotovina, ukupna_aktiva, obaveze_iz_poslovanja,
        broj_zaposlenih,
        -- Računaj promene ako postoje podaci za prethodnu godinu
        poslovni_prihod_change,
        roe_change,
        roa_change,
        neto_rezultat_change,
        prihod_po_zaposlenom_change,
        potrazivanja_change,
        gotovina_change,
        aktiva_change,
        obaveze_change,
        broj_zaposlenih_change
    ) VALUES (
        p_company_id, p_year,
        (p_results->>'poslovni_prihod')::DECIMAL,
        (p_results->>'stopa_povrata_na_kapital_roe')::DECIMAL,
        (p_results->>'stopa_povrata_aktive_roa')::DECIMAL,
        (p_results->>'prosecno_vreme_naplate_potrazivanja')::INTEGER,
        (p_results->>'prosecno_vreme_placanja_obaveza')::INTEGER,
        (p_results->>'neto_rezultat')::DECIMAL,
        (p_results->>'poslovni_prihod_po_zaposlenom')::DECIMAL,
        (p_results->>'potrazivanja')::DECIMAL,
        (p_results->>'gotovinski_ekvivalenti_gotovina')::DECIMAL,
        (p_results->>'ukupna_aktiva')::DECIMAL,
        (p_results->>'obaveze_iz_poslovanja')::DECIMAL,
        (p_results->>'broj_zaposlenih')::INTEGER,
        -- Računaj promene
        CASE WHEN v_prev_results.poslovni_prihod > 0 
            THEN ((p_results->>'poslovni_prihod')::DECIMAL - v_prev_results.poslovni_prihod) / v_prev_results.poslovni_prihod * 100
            ELSE NULL END,
        CASE WHEN v_prev_results.stopa_povrata_na_kapital_roe IS NOT NULL 
            THEN (p_results->>'stopa_povrata_na_kapital_roe')::DECIMAL - v_prev_results.stopa_povrata_na_kapital_roe
            ELSE NULL END,
        CASE WHEN v_prev_results.stopa_povrata_aktive_roa IS NOT NULL 
            THEN (p_results->>'stopa_povrata_aktive_roa')::DECIMAL - v_prev_results.stopa_povrata_aktive_roa
            ELSE NULL END,
        CASE WHEN v_prev_results.neto_rezultat != 0 
            THEN ((p_results->>'neto_rezultat')::DECIMAL - v_prev_results.neto_rezultat) / ABS(v_prev_results.neto_rezultat) * 100
            ELSE NULL END,
        CASE WHEN v_prev_results.poslovni_prihod_po_zaposlenom > 0 
            THEN ((p_results->>'poslovni_prihod_po_zaposlenom')::DECIMAL - v_prev_results.poslovni_prihod_po_zaposlenom) / v_prev_results.poslovni_prihod_po_zaposlenom * 100
            ELSE NULL END,
        CASE WHEN v_prev_results.potrazivanja > 0 
            THEN ((p_results->>'potrazivanja')::DECIMAL - v_prev_results.potrazivanja) / v_prev_results.potrazivanja * 100
            ELSE NULL END,
        CASE WHEN v_prev_results.gotovinski_ekvivalenti_gotovina > 0 
            THEN ((p_results->>'gotovinski_ekvivalenti_gotovina')::DECIMAL - v_prev_results.gotovinski_ekvivalenti_gotovina) / v_prev_results.gotovinski_ekvivalenti_gotovina * 100
            ELSE NULL END,
        CASE WHEN v_prev_results.ukupna_aktiva > 0 
            THEN ((p_results->>'ukupna_aktiva')::DECIMAL - v_prev_results.ukupna_aktiva) / v_prev_results.ukupna_aktiva * 100
            ELSE NULL END,
        CASE WHEN v_prev_results.obaveze_iz_poslovanja > 0 
            THEN ((p_results->>'obaveze_iz_poslovanja')::DECIMAL - v_prev_results.obaveze_iz_poslovanja) / v_prev_results.obaveze_iz_poslovanja * 100
            ELSE NULL END,
        CASE WHEN v_prev_results.broj_zaposlenih > 0 
            THEN ((p_results->>'broj_zaposlenih')::INTEGER - v_prev_results.broj_zaposlenih)::DECIMAL / v_prev_results.broj_zaposlenih * 100
            ELSE NULL END
    )
    ON CONFLICT (company_id, year) DO UPDATE SET
        poslovni_prihod = EXCLUDED.poslovni_prihod,
        stopa_povrata_na_kapital_roe = EXCLUDED.stopa_povrata_na_kapital_roe,
        stopa_povrata_aktive_roa = EXCLUDED.stopa_povrata_aktive_roa,
        prosecno_vreme_naplate_potrazivanja = EXCLUDED.prosecno_vreme_naplate_potrazivanja,
        prosecno_vreme_placanja_obaveza = EXCLUDED.prosecno_vreme_placanja_obaveza,
        neto_rezultat = EXCLUDED.neto_rezultat,
        poslovni_prihod_po_zaposlenom = EXCLUDED.poslovni_prihod_po_zaposlenom,
        potrazivanja = EXCLUDED.potrazivanja,
        gotovinski_ekvivalenti_gotovina = EXCLUDED.gotovinski_ekvivalenti_gotovina,
        ukupna_aktiva = EXCLUDED.ukupna_aktiva,
        obaveze_iz_poslovanja = EXCLUDED.obaveze_iz_poslovanja,
        broj_zaposlenih = EXCLUDED.broj_zaposlenih,
        poslovni_prihod_change = EXCLUDED.poslovni_prihod_change,
        roe_change = EXCLUDED.roe_change,
        roa_change = EXCLUDED.roa_change,
        neto_rezultat_change = EXCLUDED.neto_rezultat_change,
        prihod_po_zaposlenom_change = EXCLUDED.prihod_po_zaposlenom_change,
        potrazivanja_change = EXCLUDED.potrazivanja_change,
        gotovina_change = EXCLUDED.gotovina_change,
        aktiva_change = EXCLUDED.aktiva_change,
        obaveze_change = EXCLUDED.obaveze_change,
        broj_zaposlenih_change = EXCLUDED.broj_zaposlenih_change,
        updated_at = CURRENT_TIMESTAMP;
    
    -- Log sinhronizaciju
    INSERT INTO boniteti.sync_log (company_id, sync_type, year, status, details)
    VALUES (p_company_id, 'business_results', p_year, 'success', p_results);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 4. Funkcija za proveru da li su podaci već skinuti
CREATE OR REPLACE FUNCTION boniteti.check_if_synced(
    p_company_id UUID,
    p_sync_type VARCHAR,
    p_year INTEGER DEFAULT NULL,
    p_hours_threshold INTEGER DEFAULT 24
) RETURNS BOOLEAN AS $$
DECLARE
    v_last_sync TIMESTAMP;
BEGIN
    SELECT MAX(sync_date) INTO v_last_sync
    FROM boniteti.sync_log
    WHERE company_id = p_company_id 
      AND sync_type = p_sync_type
      AND (p_year IS NULL OR year = p_year)
      AND status = 'success';
    
    IF v_last_sync IS NULL THEN
        RETURN FALSE; -- Nikad nije sinhronizoavano
    END IF;
    
    -- Proveri da li je prošlo više od threshold sati
    RETURN (CURRENT_TIMESTAMP - v_last_sync) < (p_hours_threshold || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- 5. View za lakši pregled kompanija sa najnovijim podacima
CREATE OR REPLACE VIEW boniteti.companies_overview AS
SELECT 
    c.*,
    br_latest.year AS latest_year,
    br_latest.poslovni_prihod AS latest_revenue,
    br_latest.neto_rezultat AS latest_net_result,
    br_latest.broj_zaposlenih AS latest_employees,
    br_latest.stopa_povrata_na_kapital_roe AS latest_roe,
    br_latest.stopa_povrata_aktive_roa AS latest_roa
FROM boniteti.companies c
LEFT JOIN LATERAL (
    SELECT *
    FROM boniteti.business_results
    WHERE company_id = c.id
    ORDER BY year DESC
    LIMIT 1
) br_latest ON TRUE;

-- 6. View za trend analizu po kompaniji
CREATE OR REPLACE VIEW boniteti.company_trends AS
SELECT 
    c.id,
    c.registration_number,
    c.tax_number,
    c.name_short,
    br.year,
    br.poslovni_prihod,
    br.poslovni_prihod_change,
    br.neto_rezultat,
    br.neto_rezultat_change,
    br.broj_zaposlenih,
    br.broj_zaposlenih_change,
    br.stopa_povrata_na_kapital_roe,
    br.stopa_povrata_aktive_roa,
    br.ukupna_aktiva,
    br.aktiva_change
FROM boniteti.companies c
JOIN boniteti.business_results br ON c.id = br.company_id
ORDER BY c.name_short, br.year;