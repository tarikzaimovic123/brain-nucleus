-- Tabela za sve delatnosti (activity sectors) sa tree strukturom
CREATE TABLE IF NOT EXISTS boniteti.activities (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER UNIQUE NOT NULL,        -- ID sa Boniteti API-ja
    code VARCHAR(10) NOT NULL,                  -- Šifra delatnosti (npr. "0111")
    name TEXT NOT NULL,                         -- Puni naziv delatnosti
    full_text TEXT NOT NULL,                    -- Kombinovani text (code + name)
    parent_id INTEGER,                          -- Parent ID za tree strukturu
    level INTEGER DEFAULT 0,                    -- Nivo u hijerarhiji (0=root, 1=sektor, 2=podsektor, itd)
    is_leaf BOOLEAN DEFAULT false,              -- Da li je list (nema podkategorije)
    country VARCHAR(100) DEFAULT 'Crna Gora',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexi
    INDEX idx_activity_code (code),
    INDEX idx_parent_id (parent_id),
    INDEX idx_level (level),
    
    -- Foreign key na sebe za parent-child vezu
    FOREIGN KEY (parent_id) REFERENCES boniteti.activities(activity_id) ON DELETE SET NULL
);

-- View za lakše pregledanje hijerarhije
CREATE OR REPLACE VIEW boniteti.activities_tree AS
WITH RECURSIVE activity_tree AS (
    -- Root level (activities without parent)
    SELECT 
        id,
        activity_id,
        code,
        name,
        full_text,
        parent_id,
        level,
        is_leaf,
        code AS path,
        name AS full_path
    FROM boniteti.activities
    WHERE parent_id IS NULL
    
    UNION ALL
    
    -- Recursive part
    SELECT 
        a.id,
        a.activity_id,
        a.code,
        a.name,
        a.full_text,
        a.parent_id,
        a.level,
        a.is_leaf,
        t.path || ' > ' || a.code AS path,
        t.full_path || ' > ' || a.name AS full_path
    FROM boniteti.activities a
    INNER JOIN activity_tree t ON a.parent_id = t.activity_id
)
SELECT * FROM activity_tree
ORDER BY path;

-- Funkcija za upsert delatnosti
CREATE OR REPLACE FUNCTION boniteti.upsert_activity(
    p_activity_id INTEGER,
    p_code VARCHAR,
    p_name TEXT,
    p_full_text TEXT,
    p_parent_id INTEGER DEFAULT NULL,
    p_country VARCHAR DEFAULT 'Crna Gora'
) RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO boniteti.activities (
        activity_id, code, name, full_text, parent_id, country
    ) VALUES (
        p_activity_id, p_code, p_name, p_full_text, p_parent_id, p_country
    )
    ON CONFLICT (activity_id) DO UPDATE SET
        code = EXCLUDED.code,
        name = EXCLUDED.name,
        full_text = EXCLUDED.full_text,
        parent_id = EXCLUDED.parent_id,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Funkcija za računanje nivoa u hijerarhiji
CREATE OR REPLACE FUNCTION boniteti.update_activity_levels() 
RETURNS VOID AS $$
DECLARE
    current_level INTEGER := 0;
    rows_updated INTEGER;
BEGIN
    -- Reset all levels
    UPDATE boniteti.activities SET level = NULL;
    
    -- Level 0: Root nodes (no parent)
    UPDATE boniteti.activities 
    SET level = 0 
    WHERE parent_id IS NULL;
    
    -- Calculate levels iteratively
    LOOP
        rows_updated := 0;
        
        UPDATE boniteti.activities a
        SET level = current_level + 1
        FROM boniteti.activities p
        WHERE p.activity_id = a.parent_id
          AND p.level = current_level
          AND a.level IS NULL;
        
        GET DIAGNOSTICS rows_updated = ROW_COUNT;
        
        EXIT WHEN rows_updated = 0;
        current_level := current_level + 1;
    END LOOP;
    
    -- Mark leaves (nodes with no children)
    UPDATE boniteti.activities a
    SET is_leaf = NOT EXISTS (
        SELECT 1 FROM boniteti.activities c 
        WHERE c.parent_id = a.activity_id
    );
END;
$$ LANGUAGE plpgsql;

-- Trigger za ažuriranje updated_at
CREATE TRIGGER update_activities_updated_at 
BEFORE UPDATE ON boniteti.activities
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View za statistiku po levelima
CREATE OR REPLACE VIEW boniteti.activities_stats AS
SELECT 
    level,
    COUNT(*) as count,
    COUNT(DISTINCT parent_id) as parent_count,
    ARRAY_AGG(DISTINCT LEFT(code, 2) ORDER BY LEFT(code, 2)) as main_sectors
FROM boniteti.activities
GROUP BY level
ORDER BY level;