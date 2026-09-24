// Score shared retrieval against the course assistant's golden questions.
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { readFileSync } from 'node:fs';
import { search, structuredAnswer } from '../js/rag.js';

function parseCsv(text) {
  return text.trim().split(/\r?\n/).slice(1).map(line => {
    const cells = line.match(/("(?:[^"]|"")*"|[^,]*)(?:,|$)/g).map(cell =>
      cell.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'));
    return { id: cells[0], question: cells[1], expected: cells[2], must: cells[3] };
  });
}

const sqlite3 = await sqlite3InitModule({ print: () => {}, printErr: () => {} });
const bytes = new Uint8Array(readFileSync(new URL('../data/academy.db', import.meta.url)));
const pointer = sqlite3.wasm.allocFromTypedArray(bytes);
const db = new sqlite3.oo1.DB();
db.checkRc(sqlite3.capi.sqlite3_deserialize(db.pointer, 'main', pointer, bytes.length, bytes.length,
  sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE | sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE));
const golden = parseCsv(readFileSync(new URL('../eval/golden-questions.csv', import.meta.url), 'utf8'));
let passed = 0;
const start = performance.now();
for (const item of golden) {
  const structured = structuredAnswer(db, item.question);
  const hits = structured?.hits ?? search(db, item.question, 3);
  let ok;
  if (item.expected === 'REFUSE') ok = hits.length === 0;
  else {
    const expected = item.expected.split('|');
    const sourceOk = item.expected === '*' || hits.some(hit => expected.includes(hit.doc_id.split('/').at(-1)));
    const content = `${structured?.text ?? ''} ${hits.map(hit => `${hit.title} ${hit.section} ${hit.body}`).join(' ')}`;
    ok = sourceOk && content.toLowerCase().includes(item.must.toLowerCase());
  }
  if (ok) passed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${item.id} ${item.question} — ${hits.map(hit => hit.doc_id).join(', ') || '(refused)'}`);
}
console.log(`\n${passed}/${golden.length} passed (${((passed / golden.length) * 100).toFixed(0)}%) · ${((performance.now() - start) / golden.length).toFixed(2)} ms/question`);
db.close();
process.exitCode = passed === golden.length ? 0 : 1;
