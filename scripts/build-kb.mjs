// Build the browser-readable SQLite knowledge base with the same SQLite WASM
// engine used by the client.
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const kbDir = path.join(root, 'kb');
const dataDir = path.join(root, 'data');
const coursesPath = path.join(dataDir, 'courses.json');
const outputPath = path.join(dataDir, 'academy.db');
const distDir = path.join(root, 'dist');

function markdownFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(fullPath);
    return entry.isFile() && entry.name.toLowerCase().endsWith('.md') ? [fullPath] : [];
  }).sort((a, b) => a.localeCompare(b));
}

function chunksFromMarkdown(file) {
  const markdown = readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');
  const relative = path.relative(kbDir, file).split(path.sep).join('/');
  const docId = relative.replace(/\.md$/i, '');
  const title = markdown.match(/^#\s+(.+?)\s*#*\s*$/m)?.[1]?.trim() ?? docId;
  const url = relative.startsWith('brochures/')
    ? `#course-${path.basename(docId)}`
    : docId === 'campuses' ? '#campuses' : '#faq';
  const sections = markdown.split(/^##\s+/m).slice(1);

  return sections.map(sectionText => {
    const newline = sectionText.indexOf('\n');
    const section = (newline < 0 ? sectionText : sectionText.slice(0, newline)).trim();
    const body = (newline < 0 ? '' : sectionText.slice(newline + 1)).trim();
    return { docId, title, section, body, url };
  }).filter(chunk => chunk.body.length > 0);
}

if (!readdirSync(kbDir, { withFileTypes: true }).length) {
  throw new Error(`No Markdown documents found in ${kbDir}`);
}
const chunks = markdownFiles(kbDir).flatMap(chunksFromMarkdown);
if (!chunks.length) throw new Error(`No ## sections found in ${kbDir}`);
const courses = JSON.parse(readFileSync(coursesPath, 'utf8'));
if (!Array.isArray(courses)) throw new TypeError(`${coursesPath} must contain a JSON array`);

const sqlite3 = await sqlite3InitModule({ print: () => {}, printErr: () => {} });
const db = new sqlite3.oo1.DB(':memory:');
try {
  db.exec(`
    CREATE VIRTUAL TABLE chunks USING fts5(
      doc_id UNINDEXED, title, section, body, url UNINDEXED,
      tokenize='porter unicode61'
    );
    CREATE TABLE courses (
      code TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      cat TEXT,
      level TEXT,
      weeks INTEGER,
      fee INTEGER,
      campus TEXT,
      schedule TEXT,
      next_intake TEXT
    );
  `);

  db.transaction(() => {
    for (const chunk of chunks) {
      db.exec({
        sql: 'INSERT INTO chunks (doc_id, title, section, body, url) VALUES (?, ?, ?, ?, ?)',
        bind: [chunk.docId, chunk.title, chunk.section, chunk.body, chunk.url]
      });
    }
    for (const course of courses) {
      db.exec({
        sql: 'INSERT INTO courses VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        bind: [course.code, course.title, course.cat, course.level, course.weeks,
          course.fee, course.campus, course.when, course.intakes?.[0] ?? null]
      });
    }
  });
  db.exec("INSERT INTO chunks(chunks) VALUES('optimize')");
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(outputPath, sqlite3.capi.sqlite3_js_db_export(db));
  const browserSqliteDir = path.join(distDir, 'vendor', 'sqlite-wasm');
  mkdirSync(path.join(distDir, 'data'), { recursive: true });
  mkdirSync(browserSqliteDir, { recursive: true });
  copyFileSync(outputPath, path.join(distDir, 'data', 'academy.db'));
  copyFileSync(path.join(root, 'node_modules', '@sqlite.org', 'sqlite-wasm', 'dist', 'index.mjs'),
    path.join(browserSqliteDir, 'index.mjs'));
  copyFileSync(path.join(root, 'node_modules', '@sqlite.org', 'sqlite-wasm', 'dist', 'sqlite3.wasm'),
    path.join(browserSqliteDir, 'sqlite3.wasm'));
  console.log(`Built ${path.relative(root, outputPath)}: ${chunks.length} chunks, ${courses.length} courses.`);
} finally {
  db.close();
}
