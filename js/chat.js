import sqlite3InitModule from '../vendor/sqlite-wasm/index.mjs';
import { extractiveAnswer, REFUSAL, search, structuredAnswer } from './rag.js';

const $ = selector => document.querySelector(selector);
const panel = $('#assistant-panel');
const launcher = $('#assistant-launcher');
const log = $('#assistant-log');
const form = $('#assistant-form');
const input = $('#assistant-input');
const send = $('#assistant-send');
let databasePromise;

async function getDatabase() {
  if (!databasePromise) databasePromise = (async () => {
    const sqlite3 = await sqlite3InitModule({ print: () => {}, printErr: () => {} });
    const response = await fetch('./data/academy.db');
    if (!response.ok) throw new Error('The course database could not be loaded.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    const pointer = sqlite3.wasm.allocFromTypedArray(bytes);
    const db = new sqlite3.oo1.DB();
    db.checkRc(sqlite3.capi.sqlite3_deserialize(db.pointer, 'main', pointer, bytes.length, bytes.length,
      sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE | sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE));
    return db;
  })();
  return databasePromise;
}

function addMessage(role, text, sources = []) {
  const message = document.createElement('div');
  message.className = `assistant-msg assistant-msg--${role}`;
  message.textContent = text;
  if (sources.length) {
    const citation = document.createElement('div');
    citation.className = 'assistant-source';
    citation.textContent = 'Sources: ';
    sources.forEach((source, index) => {
      if (index) citation.append(document.createTextNode(' · '));
      const link = document.createElement('a');
      link.href = source.url || '#courses';
      link.textContent = `${source.title} — ${source.section}`;
      citation.append(link);
    });
    message.append(citation);
  }
  log.append(message);
  log.scrollTop = log.scrollHeight;
  return message;
}

async function answer(question) {
  const db = await getDatabase();
  const structured = structuredAnswer(db, question);
  const hits = structured?.hits ?? search(db, question, 3);
  if (!hits.length) {
    addMessage('bot', REFUSAL);
    return;
  }
  addMessage('bot', structured?.text ?? extractiveAnswer(hits), hits.slice(0, 3));
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
  } catch {
    addMessage('bot', 'Sorry, the academy guide is unavailable right now. Please email enrol@cookbakeacademy.sg or call +65 6888 1234.');
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
