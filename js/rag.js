// Retrieval helpers shared by the browser assistant and scripts/eval.mjs.
const STOPWORDS = new Set((
  'a an and are as at be but by can could do does for from have how i if in ' +
  'into is it its me my of on or our please should so tell than that the ' +
  'their them then there these they this to us was we what when where which ' +
  'who why will with would you your about any also get got just like know ' +
  'need want am did cook bake academy singapore sg whats dont im ive cant ' +
  'hi hello'
).split(' '));

const INTENTS = [
  [/how long|duration|how many weeks|shortest|longest/, ['duration', 'weeks']],
  [/\bwhen\b|start|begin|intake|next class|date/, ['intakes', 'when']],
  [/how much|cost|price|fee|expensive|afford|cheapest|priciest/, ['fee']],
  [/where|address|location|get there|mrt/, ['address']],
  [/allerg|nut|gluten|dairy|vegan|vegetarian|halal|peanut/, ['allergens', 'ingredients']],
];

const OUT_OF_SCOPE = [
  /\b(?:weather|forecast|temperature|rainfall)\b/i,
  /\b(?:restaurant|restaurants|hotel|hotels|flight|flights|tourism|tourist|movie|movies|cryptocurrency|crypto)\b/i,
  /\b(?:python|javascript|programming|system prompt)\b/i,
  /\b(?:write me|write a|create|generate|draft)\b.{0,50}\b(?:script|code|poem|story|essay|resume)\b/i,
];

function isOutOfScope(text) {
  return OUT_OF_SCOPE.some(pattern => pattern.test(String(text ?? '')));
}

export function buildQuery(text) {
  const cleaned = String(text ?? '').toLowerCase().replace(/[’']/g, '');
  const codes = [...cleaned.matchAll(/\b(bak|cul)[\s-]?(\d{3})\b/g)]
    .map(match => `"${match[1]} ${match[2]}"`);
  const words = (cleaned.match(/[a-z0-9]+/g) ?? [])
    .filter(word => word.length > 1 && !STOPWORDS.has(word) && !/^(bak|cul)$/.test(word))
    .map(word => `"${word}"`);
  const intentTerms = [];
  for (const [pattern, terms] of INTENTS) if (pattern.test(cleaned)) intentTerms.push(...terms);
  const terms = [...new Set([...codes, ...words, ...intentTerms.map(term => `"${term}"`)])];
  return terms.length ? terms.join(' OR ') : null;
}

export function search(db, text, k = 3) {
  if (isOutOfScope(text)) return [];
  const query = buildQuery(text);
  if (!query) return [];
  return db.exec({
    sql: 'SELECT doc_id, title, section, body, url, bm25(chunks, 0, 6, 3, 1, 0) AS score FROM chunks WHERE chunks MATCH ? ORDER BY score LIMIT ?',
    bind: [query, Math.max(1, Math.floor(k))],
    rowMode: 'object',
    returnValue: 'resultRows',
  });
}

export function structuredAnswer(db, text) {
  const question = String(text ?? '').toLowerCase();
  if (isOutOfScope(question)) return { text: '', hits: [] };
  const category = /bak(e|ing|ery)/.test(question) ? 'Bakery'
    : /cook(ing)?\b|cuisine/.test(question) ? 'Cooking' : null;
  const where = category ? 'WHERE cat = ?' : '';
  const under = question.match(/(?:under|below|less than)\s*s?\$?\s*(\d{2,5})/);
  let order = null;
  if (/cheapest|lowest (?:fee|price)|least expensive|most affordable/.test(question)) order = 'fee ASC';
  else if (/most expensive|highest (?:fee|price)|priciest/.test(question)) order = 'fee DESC';
  else if (/shortest/.test(question)) order = 'weeks ASC, fee ASC';
  else if (/longest/.test(question)) order = 'weeks DESC';
  if (!under && !order) return null;

  const sql = under
    ? `SELECT code,title,fee,weeks FROM courses ${where ? where + ' AND' : 'WHERE'} fee < ? ORDER BY fee LIMIT 3`
    : `SELECT code,title,fee,weeks FROM courses ${where} ORDER BY ${order} LIMIT 3`;
  const bind = [...(category ? [category] : []), ...(under ? [Number(under[1])] : [])];
  const rows = db.exec({ sql, bind, rowMode: 'object', returnValue: 'resultRows' });
  // A recognized table question must never fall back to broad FTS search,
  // even when no course satisfies its price constraint.
  if (!rows.length) return { text: '', hits: [] };
  const lines = rows.map(row => `${row.code} ${row.title} — S$${Number(row.fee).toLocaleString('en-SG')}, ${row.weeks} week${row.weeks === 1 ? '' : 's'}`);
  return {
    text: `${under ? `Courses under S$${under[1]}:` : ''}${under ? '\n' : ''}${lines.join('\n')}`,
    hits: rows.map(row => ({ doc_id: row.code, title: `${row.title} (${row.code})`, section: 'Schedule, fee and class size', body: lines.join('\n'), url: `#course-${row.code}` })),
  };
}

export function extractiveAnswer(hits) {
  if (!hits?.length) return null;
  const best = hits[0];
  const body = String(best.body ?? '').replace(/\n{2,}/g, '\n').trim();
  const excerpt = body.length > 520 ? `${body.slice(0, 520).replace(/\s+\S*$/, '')}…` : body;
  return `${best.title} — ${best.section}\n${excerpt}`;
}

export const REFUSAL = "I can only answer questions about Cook & Bake's courses, schedules, fees, campuses and policies, and I could not find that in our documents. Please email enrol@cookbakeacademy.sg or call +65 6888 1234.";
