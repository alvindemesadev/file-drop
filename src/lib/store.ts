import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'files.db');
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB
export const MAX_UPLOAD_SIZE = 2 * 1024 * 1024 * 1024; // 2GB (accounts for multipart overhead)

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    db = new Database(DB_FILE);
    db.pragma('journal_mode = WAL');
    db.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        original_name TEXT NOT NULL,
        size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        password_hash TEXT,
        file_count INTEGER NOT NULL DEFAULT 1,
        is_zip INTEGER NOT NULL DEFAULT 0,
        access_code TEXT
      )
    `);
    const cols = (db.pragma('table_info(files)') as { name: string }[]).map((c) => c.name);
    if (!cols.includes('access_code')) {
      db.exec('ALTER TABLE files ADD COLUMN access_code TEXT');
    }
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_access_code ON files(access_code)');
  }
  return db;
}

export interface FileRecord {
  id: string;
  originalName: string;
  size: number;
  mimeType: string;
  createdAt: string;
  expiresAt: string;
  passwordHash?: string;
  fileCount: number;
  isZip: boolean;
  accessCode?: string;
}

function rowToRecord(row: Record<string, unknown>): FileRecord {
  return {
    id: row.id as string,
    originalName: row.original_name as string,
    size: row.size as number,
    mimeType: row.mime_type as string,
    createdAt: row.created_at as string,
    expiresAt: row.expires_at as string,
    passwordHash: row.password_hash as string || undefined,
    fileCount: row.file_count as number,
    isZip: !!(row.is_zip as number),
    accessCode: row.access_code as string || undefined,
  };
}

export function generateAccessCode(): string {
  const db = getDb();
  for (let attempt = 0; attempt < 100; attempt++) {
    const code = String(100000 + Math.floor(Math.random() * 900000));
    const exists = db.prepare('SELECT 1 FROM files WHERE access_code = ?').get(code);
    if (!exists) return code;
  }
  return String(100000 + Math.floor(Math.random() * 900000));
}

export async function saveFileRecord(record: FileRecord): Promise<void> {
  const stmt = getDb().prepare(`
    INSERT INTO files (id, original_name, size, mime_type, created_at, expires_at, password_hash, file_count, is_zip, access_code)
    VALUES (@id, @originalName, @size, @mimeType, @createdAt, @expiresAt, @passwordHash, @fileCount, @isZip, @accessCode)
  `);
  stmt.run({ ...record, isZip: record.isZip ? 1 : 0 });
}

export async function getFileRecord(id: string): Promise<FileRecord | null> {
  const row = getDb().prepare('SELECT * FROM files WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? rowToRecord(row) : null;
}

export async function getFileRecordByCode(code: string): Promise<FileRecord | null> {
  const row = getDb().prepare('SELECT * FROM files WHERE access_code = ?').get(code) as Record<string, unknown> | undefined;
  return row ? rowToRecord(row) : null;
}

export async function deleteExpiredFiles(): Promise<number> {
  const rows = getDb().prepare('SELECT id FROM files WHERE expires_at < ?').all(new Date().toISOString()) as { id: string }[];
  for (const { id } of rows) {
    const dir = path.join(UPLOAD_DIR, id);
    fs.rmSync(dir, { recursive: true, force: true });
  }
  const result = getDb().prepare('DELETE FROM files WHERE expires_at < ?').run(new Date().toISOString());
  return result.changes;
}
