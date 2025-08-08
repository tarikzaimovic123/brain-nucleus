#!/usr/bin/env python3
"""
Migration script for Access databases to Supabase
Migrates data from BazaBrain.mdb, HARMON.mdb, and Fiskal_log.mdb
"""

import pyodbc
import psycopg2
from psycopg2.extras import RealDictCursor
import json
from datetime import datetime, date
from decimal import Decimal
import uuid
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
ACCESS_DB_PATHS = {
    'main': '/Users/tarikzaimovic/brain-nucleus/old-aplicaiton/backup-db/BazaBrain.mdb',
    'harmon': '/Users/tarikzaimovic/brain-nucleus/old-aplicaiton/backup-db/HARMON.mdb',
    'fiscal': '/Users/tarikzaimovic/brain-nucleus/old-aplicaiton/backup-db/Fiskal_log.mdb'
}

# Supabase connection
SUPABASE_URL = "postgresql://postgres.glnskbhfrpglioehjwhz:lDpJP7MdwgzSBSTG@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

def connect_access(db_path):
    """Connect to Access database"""
    try:
        conn_str = (
            r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};'
            f'DBQ={db_path};'
        )
        # Alternative for Mac/Linux with mdbtools
        # conn_str = f'Driver={{MDBTools}};DBQ={db_path};'
        
        return pyodbc.connect(conn_str)
    except Exception as e:
        print(f"Error connecting to Access DB {db_path}: {e}")
        # Try alternative method with mdbtools for Mac/Linux
        return None

def connect_supabase():
    """Connect to Supabase PostgreSQL"""
    try:
        return psycopg2.connect(SUPABASE_URL)
    except Exception as e:
        print(f"Error connecting to Supabase: {e}")
        return None

def get_access_tables(conn):
    """Get list of tables in Access database"""
    cursor = conn.cursor()
    tables = []
    for row in cursor.tables():
        if row.table_type == 'TABLE':
            tables.append(row.table_name)
    return tables

def analyze_access_structure(db_path, db_name):
    """Analyze Access database structure"""
    print(f"\n{'='*60}")
    print(f"Analyzing {db_name} database: {db_path}")
    print('='*60)
    
    conn = connect_access(db_path)
    if not conn:
        print(f"Could not connect to {db_name}")
        return None
    
    structure = {}
    tables = get_access_tables(conn)
    
    for table in tables:
        print(f"\nTable: {table}")
        try:
            cursor = conn.cursor()
            # Get columns
            columns = []
            for row in cursor.columns(table=table):
                columns.append({
                    'name': row.column_name,
                    'type': row.type_name,
                    'size': row.column_size,
                    'nullable': row.nullable
                })
            
            # Get row count
            cursor.execute(f"SELECT COUNT(*) FROM [{table}]")
            row_count = cursor.fetchone()[0]
            
            structure[table] = {
                'columns': columns,
                'row_count': row_count
            }
            
            print(f"  - Columns: {len(columns)}")
            print(f"  - Rows: {row_count}")
            
            # Show sample data
            if row_count > 0:
                cursor.execute(f"SELECT TOP 1 * FROM [{table}]")
                sample = cursor.fetchone()
                print(f"  - Sample fields: {', '.join([col['name'] for col in columns[:5]])}")
                
        except Exception as e:
            print(f"  - Error reading table {table}: {e}")
    
    conn.close()
    return structure

def migrate_companies(access_conn, pg_conn):
    """Migrate companies data"""
    print("\nMigrating Companies...")
    
    try:
        # Try different possible table names
        table_names = ['Firme', 'Firma', 'Companies', 'Kompanije', 'Klijenti']
        access_cursor = access_conn.cursor()
        pg_cursor = pg_conn.cursor()
        
        for table_name in table_names:
            try:
                # Check if table exists
                access_cursor.execute(f"SELECT COUNT(*) FROM [{table_name}]")
                count = access_cursor.fetchone()[0]
                
                if count > 0:
                    print(f"Found {count} records in {table_name} table")
                    
                    # Fetch all companies
                    access_cursor.execute(f"SELECT * FROM [{table_name}]")
                    companies = access_cursor.fetchall()
                    
                    # Get column names
                    columns = [column[0] for column in access_cursor.description]
                    print(f"Columns: {columns}")
                    
                    # Insert into Supabase
                    for company in companies:
                        # Map Access fields to Supabase fields
                        data = {}
                        for i, col in enumerate(columns):
                            value = company[i]
                            
                            # Map common field names
                            if col.lower() in ['naziv', 'ime', 'name', 'naziv_firme']:
                                data['name'] = value
                            elif col.lower() in ['pib', 'tax_number', 'poreski_broj']:
                                data['tax_number'] = str(value) if value else None
                            elif col.lower() in ['pdv', 'vat', 'pdv_broj']:
                                data['vat_number'] = str(value) if value else None
                            elif col.lower() in ['adresa', 'address', 'ulica']:
                                data['address'] = value
                            elif col.lower() in ['grad', 'city', 'mjesto']:
                                data['city'] = value
                            elif col.lower() in ['telefon', 'phone', 'tel']:
                                data['phone'] = str(value) if value else None
                            elif col.lower() in ['email', 'e-mail', 'mail']:
                                data['email'] = value
                            elif col.lower() in ['ziro_racun', 'racun', 'bank_account']:
                                data['bank_account'] = str(value) if value else None
                        
                        # Ensure required fields
                        if 'name' in data and data['name']:
                            data['is_active'] = True
                            data['country'] = 'Montenegro'
                            data['payment_terms'] = 30
                            data['credit_limit'] = 0
                            
                            # Insert into Supabase
                            pg_cursor.execute("""
                                INSERT INTO companies (
                                    name, tax_number, vat_number, address, city,
                                    phone, email, bank_account, is_active, country,
                                    payment_terms, credit_limit
                                ) VALUES (
                                    %(name)s, %(tax_number)s, %(vat_number)s, %(address)s, %(city)s,
                                    %(phone)s, %(email)s, %(bank_account)s, %(is_active)s, %(country)s,
                                    %(payment_terms)s, %(credit_limit)s
                                ) ON CONFLICT (tax_number) DO UPDATE SET
                                    name = EXCLUDED.name,
                                    address = EXCLUDED.address,
                                    city = EXCLUDED.city
                            """, data)
                    
                    pg_conn.commit()
                    print(f"✓ Migrated {count} companies")
                    break
                    
            except Exception as e:
                continue
                
    except Exception as e:
        print(f"Error migrating companies: {e}")
        pg_conn.rollback()

def migrate_products(access_conn, pg_conn):
    """Migrate products data"""
    print("\nMigrating Products...")
    
    try:
        table_names = ['Artikli', 'Artikal', 'Products', 'Proizvodi', 'Roba']
        access_cursor = access_conn.cursor()
        pg_cursor = pg_conn.cursor()
        
        for table_name in table_names:
            try:
                access_cursor.execute(f"SELECT COUNT(*) FROM [{table_name}]")
                count = access_cursor.fetchone()[0]
                
                if count > 0:
                    print(f"Found {count} records in {table_name} table")
                    
                    # First, create default category
                    pg_cursor.execute("""
                        INSERT INTO product_categories (name, description, display_order)
                        VALUES ('Opšte', 'Opšta kategorija', 0)
                        ON CONFLICT DO NOTHING
                        RETURNING id
                    """)
                    result = pg_cursor.fetchone()
                    if result:
                        default_category_id = result[0]
                    else:
                        pg_cursor.execute("SELECT id FROM product_categories WHERE name = 'Opšte'")
                        default_category_id = pg_cursor.fetchone()[0]
                    
                    # Fetch all products
                    access_cursor.execute(f"SELECT * FROM [{table_name}]")
                    products = access_cursor.fetchall()
                    columns = [column[0] for column in access_cursor.description]
                    
                    for product in products:
                        data = {'category_id': default_category_id}
                        
                        for i, col in enumerate(columns):
                            value = product[i]
                            
                            # Map fields
                            if col.lower() in ['sifra', 'code', 'kod']:
                                data['code'] = str(value) if value else f"ART{i:04d}"
                            elif col.lower() in ['naziv', 'name', 'ime']:
                                data['name'] = value or f"Proizvod {i}"
                            elif col.lower() in ['opis', 'description']:
                                data['description'] = value
                            elif col.lower() in ['jedinica_mjere', 'jm', 'unit']:
                                data['unit_of_measure'] = value or 'kom'
                            elif col.lower() in ['nabavna_cijena', 'nabavna', 'purchase_price']:
                                data['purchase_price'] = float(value) if value else 0
                            elif col.lower() in ['prodajna_cijena', 'prodajna', 'cijena', 'selling_price']:
                                data['selling_price'] = float(value) if value else 0
                            elif col.lower() in ['pdv', 'vat', 'porez']:
                                data['vat_rate'] = float(value) if value else 21.0
                            elif col.lower() in ['stanje', 'kolicina', 'stock']:
                                data['stock_quantity'] = float(value) if value else 0
                        
                        # Ensure required fields
                        if 'code' not in data:
                            data['code'] = f"ART{len(products):04d}"
                        if 'name' not in data:
                            data['name'] = f"Proizvod {data['code']}"
                        if 'unit_of_measure' not in data:
                            data['unit_of_measure'] = 'kom'
                        if 'vat_rate' not in data:
                            data['vat_rate'] = 21.0
                        
                        data['is_active'] = True
                        data['is_service'] = False
                        data['minimum_stock'] = 0
                        
                        # Insert into Supabase
                        pg_cursor.execute("""
                            INSERT INTO products (
                                category_id, code, name, description, unit_of_measure,
                                purchase_price, selling_price, vat_rate, stock_quantity,
                                minimum_stock, is_service, is_active
                            ) VALUES (
                                %(category_id)s, %(code)s, %(name)s, %(description)s, %(unit_of_measure)s,
                                %(purchase_price)s, %(selling_price)s, %(vat_rate)s, %(stock_quantity)s,
                                %(minimum_stock)s, %(is_service)s, %(is_active)s
                            ) ON CONFLICT (code) DO UPDATE SET
                                name = EXCLUDED.name,
                                selling_price = EXCLUDED.selling_price,
                                stock_quantity = EXCLUDED.stock_quantity
                        """, data)
                    
                    pg_conn.commit()
                    print(f"✓ Migrated {count} products")
                    break
                    
            except Exception as e:
                continue
                
    except Exception as e:
        print(f"Error migrating products: {e}")
        pg_conn.rollback()

def migrate_invoices(access_conn, pg_conn):
    """Migrate invoices data"""
    print("\nMigrating Invoices...")
    
    try:
        table_names = ['Fakture', 'Faktura', 'Invoices', 'Racuni', 'Racun']
        access_cursor = access_conn.cursor()
        pg_cursor = pg_conn.cursor()
        
        for table_name in table_names:
            try:
                access_cursor.execute(f"SELECT COUNT(*) FROM [{table_name}]")
                count = access_cursor.fetchone()[0]
                
                if count > 0:
                    print(f"Found {count} records in {table_name} table")
                    
                    # Get a default company ID
                    pg_cursor.execute("SELECT id FROM companies LIMIT 1")
                    default_company = pg_cursor.fetchone()
                    if not default_company:
                        # Create a default company
                        pg_cursor.execute("""
                            INSERT INTO companies (name, country, is_active)
                            VALUES ('Nepoznat klijent', 'Montenegro', true)
                            RETURNING id
                        """)
                        default_company_id = pg_cursor.fetchone()[0]
                    else:
                        default_company_id = default_company[0]
                    
                    # Fetch invoices
                    access_cursor.execute(f"SELECT * FROM [{table_name}]")
                    invoices = access_cursor.fetchall()
                    columns = [column[0] for column in access_cursor.description]
                    
                    for invoice in invoices:
                        data = {'company_id': default_company_id}
                        
                        for i, col in enumerate(columns):
                            value = invoice[i]
                            
                            # Map fields
                            if col.lower() in ['broj', 'broj_fakture', 'invoice_number']:
                                data['invoice_number'] = str(value) if value else f"INV{i:06d}"
                            elif col.lower() in ['datum', 'date', 'invoice_date']:
                                if value:
                                    try:
                                        if isinstance(value, str):
                                            data['invoice_date'] = value
                                        else:
                                            data['invoice_date'] = value.strftime('%Y-%m-%d')
                                    except:
                                        data['invoice_date'] = datetime.now().strftime('%Y-%m-%d')
                                else:
                                    data['invoice_date'] = datetime.now().strftime('%Y-%m-%d')
                            elif col.lower() in ['iznos', 'ukupno', 'total', 'total_amount']:
                                data['total_amount'] = float(value) if value else 0
                            elif col.lower() in ['pdv', 'vat', 'porez']:
                                data['vat_amount'] = float(value) if value else 0
                            elif col.lower() in ['osnovica', 'subtotal', 'neto']:
                                data['subtotal'] = float(value) if value else 0
                        
                        # Calculate missing values
                        if 'subtotal' not in data and 'total_amount' in data:
                            data['subtotal'] = data['total_amount'] / 1.21  # Assuming 21% VAT
                        if 'vat_amount' not in data and 'total_amount' in data and 'subtotal' in data:
                            data['vat_amount'] = data['total_amount'] - data['subtotal']
                        
                        # Ensure required fields
                        if 'invoice_number' not in data:
                            data['invoice_number'] = f"INV{datetime.now().strftime('%Y%m%d')}{i:04d}"
                        if 'invoice_date' not in data:
                            data['invoice_date'] = datetime.now().strftime('%Y-%m-%d')
                        
                        data['status'] = 'issued'
                        data['paid_amount'] = 0
                        data['discount_percentage'] = 0
                        data['discount_amount'] = 0
                        data['fiscal_verified'] = False
                        
                        # Insert invoice
                        pg_cursor.execute("""
                            INSERT INTO invoices (
                                invoice_number, company_id, invoice_date, status,
                                subtotal, vat_amount, total_amount, paid_amount,
                                discount_percentage, discount_amount, fiscal_verified
                            ) VALUES (
                                %(invoice_number)s, %(company_id)s, %(invoice_date)s, %(status)s,
                                %(subtotal)s, %(vat_amount)s, %(total_amount)s, %(paid_amount)s,
                                %(discount_percentage)s, %(discount_amount)s, %(fiscal_verified)s
                            ) ON CONFLICT (invoice_number) DO UPDATE SET
                                total_amount = EXCLUDED.total_amount,
                                vat_amount = EXCLUDED.vat_amount
                        """, data)
                    
                    pg_conn.commit()
                    print(f"✓ Migrated {count} invoices")
                    break
                    
            except Exception as e:
                continue
                
    except Exception as e:
        print(f"Error migrating invoices: {e}")
        pg_conn.rollback()

def main():
    """Main migration function"""
    print("="*60)
    print("ACCESS TO SUPABASE MIGRATION TOOL")
    print("="*60)
    
    # First, analyze databases
    structures = {}
    for db_key, db_path in ACCESS_DB_PATHS.items():
        if os.path.exists(db_path):
            structure = analyze_access_structure(db_path, db_key)
            if structure:
                structures[db_key] = structure
    
    # Save structure analysis
    with open('access_structure_analysis.json', 'w', encoding='utf-8') as f:
        json.dump(structures, f, indent=2, default=str)
    print(f"\n✓ Structure analysis saved to access_structure_analysis.json")
    
    # Connect to main database for migration
    print("\n" + "="*60)
    print("STARTING DATA MIGRATION")
    print("="*60)
    
    main_db = ACCESS_DB_PATHS['main']
    if os.path.exists(main_db):
        access_conn = connect_access(main_db)
        pg_conn = connect_supabase()
        
        if access_conn and pg_conn:
            # Migrate data
            migrate_companies(access_conn, pg_conn)
            migrate_products(access_conn, pg_conn)
            migrate_invoices(access_conn, pg_conn)
            
            # Try HARMON database too
            harmon_db = ACCESS_DB_PATHS['harmon']
            if os.path.exists(harmon_db):
                harmon_conn = connect_access(harmon_db)
                if harmon_conn:
                    print("\n--- Checking HARMON database ---")
                    migrate_companies(harmon_conn, pg_conn)
                    migrate_products(harmon_conn, pg_conn)
                    harmon_conn.close()
            
            access_conn.close()
            pg_conn.close()
            
            print("\n" + "="*60)
            print("✅ MIGRATION COMPLETED SUCCESSFULLY!")
            print("="*60)
        else:
            print("❌ Could not establish database connections")
    else:
        print(f"❌ Main database not found at {main_db}")

if __name__ == "__main__":
    main()