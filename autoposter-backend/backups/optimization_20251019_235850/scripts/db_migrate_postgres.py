# scripts/db_migrate_postgres.py
"""
Database migration from SQLite to PostgreSQL
Prepares the application for production deployment
"""
import os
import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
from pathlib import Path
import json
from datetime import datetime
from typing import Dict, Any, List

class DatabaseMigrator:
    def __init__(self, postgres_url: str = None):
        """
        Initialize migrator with PostgreSQL connection string
        Format: postgresql://user:password@host:port/database
        """
        self.postgres_url = postgres_url or os.getenv('DATABASE_URL')
        if not self.postgres_url:
            raise ValueError("PostgreSQL connection string required")
        
        self.sqlite_path = Path(__file__).parent.parent / "data" / "autoposter.db"
        
    def connect_sqlite(self):
        """Connect to SQLite database"""
        if not self.sqlite_path.exists():
            raise FileNotFoundError(f"SQLite database not found at {self.sqlite_path}")
        
        conn = sqlite3.connect(str(self.sqlite_path))
        conn.row_factory = sqlite3.Row
        return conn
    
    def connect_postgres(self):
        """Connect to PostgreSQL database"""
        return psycopg2.connect(self.postgres_url, cursor_factory=RealDictCursor)
    
    def create_postgres_schema(self):
        """Create PostgreSQL schema with multi-tenancy support"""
        schema_sql = """
        -- Enable UUID extension
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        
        -- Tenants table for multi-tenancy
        CREATE TABLE IF NOT EXISTS tenants (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL UNIQUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            settings JSONB DEFAULT '{}',
            status VARCHAR(50) DEFAULT 'active'
        );
        
        -- Clients table (tenant-scoped)
        CREATE TABLE IF NOT EXISTS clients (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            config JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            status VARCHAR(50) DEFAULT 'active',
            UNIQUE(tenant_id, name)
        );
        
        -- Jobs table (tenant-scoped)
        CREATE TABLE IF NOT EXISTS jobs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
            path TEXT NOT NULL,
            content_type VARCHAR(50) NOT NULL,
            caption TEXT,
            eta TIMESTAMP WITH TIME ZONE,
            status VARCHAR(50) NOT NULL DEFAULT 'queued',
            extras JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            started_at TIMESTAMP WITH TIME ZONE,
            done_at TIMESTAMP WITH TIME ZONE,
            error TEXT,
            attempts INTEGER NOT NULL DEFAULT 0
        );
        
        -- Indexes for performance
        CREATE INDEX IF NOT EXISTS idx_jobs_tenant_status_eta 
            ON jobs(tenant_id, status, eta);
        CREATE INDEX IF NOT EXISTS idx_jobs_client_status 
            ON jobs(client_id, status);
        CREATE INDEX IF NOT EXISTS idx_jobs_path 
            ON jobs(path);
        CREATE INDEX IF NOT EXISTS idx_clients_tenant 
            ON clients(tenant_id);
        
        -- Audit log table
        CREATE TABLE IF NOT EXISTS audit_log (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
            action VARCHAR(100) NOT NULL,
            entity_type VARCHAR(50) NOT NULL,
            entity_id UUID,
            old_values JSONB,
            new_values JSONB,
            user_id VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create default tenant for migration
        INSERT INTO tenants (id, name, settings) 
        VALUES ('00000000-0000-0000-0000-000000000000', 'default', '{}')
        ON CONFLICT (id) DO NOTHING;
        """
        
        with self.connect_postgres() as conn:
            with conn.cursor() as cur:
                cur.execute(schema_sql)
                conn.commit()
    
    def migrate_data(self):
        """Migrate data from SQLite to PostgreSQL"""
        print("🔄 Starting database migration...")
        
        # Create schema
        print("📋 Creating PostgreSQL schema...")
        self.create_postgres_schema()
        
        # Connect to both databases
        sqlite_conn = self.connect_sqlite()
        postgres_conn = self.connect_postgres()
        
        try:
            with postgres_conn.cursor() as pg_cur:
                # Get default tenant ID
                pg_cur.execute("SELECT id FROM tenants WHERE name = 'default'")
                default_tenant_id = pg_cur.fetchone()['id']
                
                # Migrate clients
                print("👥 Migrating clients...")
                sqlite_cur = sqlite_conn.execute("""
                    SELECT DISTINCT client FROM jobs WHERE client IS NOT NULL
                """)
                
                client_mapping = {}
                for row in sqlite_cur.fetchall():
                    client_name = row['client']
                    
                    # Check if client already exists
                    pg_cur.execute("""
                        SELECT id FROM clients WHERE tenant_id = %s AND name = %s
                    """, (default_tenant_id, client_name))
                    
                    existing = pg_cur.fetchone()
                    if existing:
                        client_id = existing['id']
                    else:
                        # Create new client
                        pg_cur.execute("""
                            INSERT INTO clients (tenant_id, name, config, created_at)
                            VALUES (%s, %s, %s, %s)
                            RETURNING id
                        """, (
                            default_tenant_id,
                            client_name,
                            json.dumps({}),
                            datetime.now()
                        ))
                        client_id = pg_cur.fetchone()['id']
                    
                    client_mapping[client_name] = client_id
                
                # Migrate jobs
                print("📦 Migrating jobs...")
                sqlite_cur = sqlite_conn.execute("""
                    SELECT * FROM jobs ORDER BY id
                """)
                
                for row in sqlite_cur.fetchall():
                    client_id = client_mapping.get(row['client'])
                    if not client_id:
                        print(f"⚠️ Skipping job for unknown client: {row['client']}")
                        continue
                    
                    # Parse extras JSON
                    try:
                        extras = json.loads(row['extras'] or '{}')
                    except:
                        extras = {}
                    
                    # Convert timestamps
                    eta = None
                    if row['eta']:
                        try:
                            eta = datetime.fromisoformat(row['eta'].replace('Z', '+00:00'))
                        except:
                            pass
                    
                    created_at = datetime.fromisoformat(row['created_at'].replace('Z', '+00:00'))
                    started_at = None
                    if row['started_at']:
                        try:
                            started_at = datetime.fromisoformat(row['started_at'].replace('Z', '+00:00'))
                        except:
                            pass
                    
                    done_at = None
                    if row['done_at']:
                        try:
                            done_at = datetime.fromisoformat(row['done_at'].replace('Z', '+00:00'))
                        except:
                            pass
                    
                    # Insert job
                    pg_cur.execute("""
                        INSERT INTO jobs (
                            tenant_id, client_id, path, content_type, caption, eta,
                            status, extras, created_at, started_at, done_at, error, attempts
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        default_tenant_id,
                        client_id,
                        row['path'],
                        row['content_type'],
                        row['caption'],
                        eta,
                        row['status'],
                        json.dumps(extras),
                        created_at,
                        started_at,
                        done_at,
                        row['error'],
                        row['attempts']
                    ))
                
                postgres_conn.commit()
                print("✅ Migration completed successfully!")
                
                # Print statistics
                pg_cur.execute("SELECT COUNT(*) as count FROM jobs")
                job_count = pg_cur.fetchone()['count']
                
                pg_cur.execute("SELECT COUNT(*) as count FROM clients")
                client_count = pg_cur.fetchone()['count']
                
                print(f"📊 Migrated {job_count} jobs and {client_count} clients")
                
        finally:
            sqlite_conn.close()
            postgres_conn.close()
    
    def verify_migration(self):
        """Verify migration was successful"""
        print("🔍 Verifying migration...")
        
        with self.connect_postgres() as conn:
            with conn.cursor() as cur:
                # Check job counts by status
                cur.execute("""
                    SELECT status, COUNT(*) as count 
                    FROM jobs 
                    GROUP BY status 
                    ORDER BY count DESC
                """)
                
                print("📊 Job status distribution:")
                for row in cur.fetchall():
                    print(f"  {row['status']}: {row['count']}")
                
                # Check client counts
                cur.execute("SELECT COUNT(*) as count FROM clients")
                client_count = cur.fetchone()['count']
                print(f"👥 Total clients: {client_count}")

def main():
    """CLI for database migration"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Migrate M1Autoposter database to PostgreSQL")
    parser.add_argument("--postgres-url", help="PostgreSQL connection string")
    parser.add_argument("--verify-only", action="store_true", help="Only verify migration")
    
    args = parser.parse_args()
    
    try:
        migrator = DatabaseMigrator(args.postgres_url)
        
        if args.verify_only:
            migrator.verify_migration()
        else:
            migrator.migrate_data()
            migrator.verify_migration()
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
