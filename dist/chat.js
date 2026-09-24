import sqlite3InitModule from './vendor/sqlite-wasm/index.mjs';

const $ = selector => document.querySelector(selector);
const panel = $('#assistant-panel');
const launcher = $('#assistant-launcher');
const log = $('#assistant-log');
const form = $('#assistant-form');
const input = $('#assistant-input');
const send = $('#assistant-send');
let databasePromise;

const stopWords = new Set(`a an and are as at be but by can could do does for from had has have how i if in into is it its me my of on or our please should so tell than that the their them then there these they this to us was we what when where which who why will with would you your about academy bake baking cooking cook class classes course courses learn find show give information info`.split(' '));

async function getDatabase() {
  if (!databasePromise) databasePromise = (async () => {
    const sqlite3 = await sqlite3InitModule({ print: () => {}, printErr: () => {} });
    const response = await fetch('./data/academy.db');
    if (!response.ok) throw new Error('The course database could not be loaded.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    const pointer = sqlite3.wasm.allocFromTypedArray(bytes);
    const db = new sqlite3.oo1.DB();
    db.checkRc(sqlite3.capi.sqlite3_deserialize(
      db.pointer, 'main', pointer, bytes.length, bytes.length,
      sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE | sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE
    ));
    return db;
  })();
  return databasePromise;
}

function queryFor(text) {
  const words = (text.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter(word => word.length > 1 && !stopWords.has(word))
    .slice(0, 12);
  const unique = [...new Set(words)];
  return unique.length ? unique.map(word => `"${word.replaceAll('"', '""')}"`).join(' OR ') : null;
}

function addMessage(role, text, source) {
  const message = document.createElement('div');
  message.className = `assistant-msg assistant-msg--${role}`;
  message.textContent = text;
  if (source) {
    const citation = document.createElement('span');
    citation.className = 'assistant-source';
    citation.append('From the academy guide: ');
    const link = document.createElement('a');
    link.href = source.url || '#courses';
    link.textContent = `${source.title} · ${source.section}`;
    citation.append(link);
    message.append(citation);
  }
  log.append(message);
  log.scrollTop = log.scrollHeight;
  return message;
}

function searchDatabase(db, text) {
  const query = queryFor(text);
  if (!query) return null;

  const structured = /\b(fee|fees|price|prices|cost|cheapest|afford|intake|intakes|schedule|date|dates)\b/i.test(text);
  if (structured) {
    const code = text.match(/\b(?:BAK|CUL)[- ]?\d{3}\b/i)?.[0]?.replace(' ', '-').toUpperCase();
    const words = (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(word => word.length > 2 && !stopWords.has(word));
    let courses = [];
    if (/\bcheapest|most affordable\b/i.test(text)) {
      courses = db.exec({ sql: 'SELECT code,title,fee,weeks,campus,schedule,next_intake FROM courses ORDER BY fee LIMIT 1', rowMode: 'object', returnValue: 'resultRows' });
    } else if (code) {
      courses = db.exec({ sql: 'SELECT code,title,fee,weeks,campus,schedule,next_intake FROM courses WHERE code = ? LIMIT 1', bind: [code], rowMode: 'object', returnValue: 'resultRows' });
    } else if (words.length) {
      courses = db.exec({
        sql: `SELECT code,title,fee,weeks,campus,schedule,next_intake FROM courses
              WHERE ${words.map(() => 'lower(title) LIKE ?').join(' OR ')}
              ORDER BY length(title) LIMIT 1`,
        bind: words.map(word => `%${word}%`), rowMode: 'object', returnValue: 'resultRows'
      });
    }
    if (courses.length) {
      const course = courses[0];
      const asksFee = /\b(fee|fees|price|prices|cost|cheapest|afford)\b/i.test(text);
      const detail = asksFee
        ? `The fee for ${course.title} is S$${Number(course.fee).toLocaleString('en-SG')}.`
        : `${course.title} is at ${course.campus}. It meets ${course.schedule}; the next listed intake is ${course.next_intake}.`;
      return { text: detail, source: { title: `${course.title} (${course.code})`, section: 'Schedule, fee and class size', url: `#course-${course.code}` } };
    }
  }

  const results = db.exec({
    sql: 'SELECT doc_id,title,section,body,url FROM chunks WHERE chunks MATCH ? ORDER BY bm25(chunks,0,6,3,1,0) LIMIT 1',
    bind: [query], rowMode: 'object', returnValue: 'resultRows'
  });
  return results.length ? { text: results[0].body.trim(), source: results[0] } : null;
}

async function answer(question) {
  const db = await getDatabase();
  const result = searchDatabase(db, question);
  if (result) addMessage('bot', result.text, result.source);
  else addMessage('bot', 'I couldn’t find that in the academy guide. I can help with courses, fees, dates, allergens, campuses and policies.');
}

async function submitQuestion(question) {
  const trimmed = question.trim();
  if (!trimmed || send.disabled) return;
  addMessage('user', trimmed);
  input.value = '';
  send.disabled = true;
  const pending = addMessage('bot', 'Looking that up in the academy guide…');
  try {
    await answer(trimmed);
  } catch (error) {
    addMessage('bot', error.message || 'Sorry, the academy guide is unavailable right now.');
  } finally {
    pending.remove();
    send.disabled = false;
    input.focus();
  }
}

function openPanel() {
  panel.hidden = false;
  launcher.setAttribute('aria-expanded', 'true');
  if (!log.childElementCount) addMessage('bot', 'Hello! Ask about courses, fees, schedules, allergens, campuses or policies. I’ll look it up in the academy guide.');
  input.focus();
  getDatabase().catch(() => {});
}

launcher.addEventListener('click', openPanel);
$('#assistant-close').addEventListener('click', () => {
  panel.hidden = true;
  launcher.setAttribute('aria-expanded', 'false');
  launcher.focus();
});
form.addEventListener('submit', event => {
  event.preventDefault();
  submitQuestion(input.value);
});
log.addEventListener('click', event => {
  const prompt = event.target.closest('[data-question]');
  if (prompt) submitQuestion(prompt.dataset.question);
});
document.querySelectorAll('.assistant-prompt').forEach(button => {
  button.addEventListener('click', () => submitQuestion(button.dataset.question));
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !panel.hidden) {
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    launcher.focus();
  }
});
