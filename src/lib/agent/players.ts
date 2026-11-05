/**
 * Resolve fan-typed player names ("rahul", "arshdeep", "शमी", "KL Rahul") to Cricsheet names ("KL Rahul").
 * Only matches players that exist in the match data: unknown names are reported as not found, never guessed.
 */

const SKIP_SURNAMES = new Set(['singh', 'khan', 'kumar', 'sharma', 'rahman']);

/** Hand-checked nicknames / given names. Values are matched by suffix against real squad names. */
const MANUAL_ROMAN: Record<string, string> = {
  rahul: 'KL Rahul',
  sanju: 'SV Samson',
  yashasvi: 'YBK Jaiswal',
  mayank: 'MA Agarwal',
  evin: 'E Lewis',
  riyan: 'R Parag',
  kartik: 'Kartik Tyagi',
  arshdeep: 'Arshdeep Singh',
  shami: 'Mohammed Shami',
  mustafizur: 'Mustafizur Rahman',
  fizz: 'Mustafizur Rahman',
};

const MANUAL_DEVA: Record<string, string> = {
  'राहुल': 'KL Rahul',
  'केएल राहुल': 'KL Rahul',
  'अर्शदीप': 'Arshdeep Singh',
  'शमी': 'Mohammed Shami',
  'मोहम्मद शमी': 'Mohammed Shami',
  'सैमसन': 'SV Samson',
  'संजू': 'SV Samson',
  'मयंक': 'MA Agarwal',
  'अग्रवाल': 'MA Agarwal',
  'जायसवाल': 'YBK Jaiswal',
  'यशस्वी': 'YBK Jaiswal',
  'त्यागी': 'Kartik Tyagi',
  'कार्तिक': 'Kartik Tyagi',
  'ब्रार': 'Harpreet Brar',
  'हरप्रीत': 'Harpreet Brar',
  'लुईस': 'E Lewis',
  'लोमरोर': 'MK Lomror',
  'मॉरिस': 'CH Morris',
  'मौरिस': 'CH Morris',
  'पूरन': 'N Pooran',
  'तेवतिया': 'R Tewatia',
  'पराग': 'R Parag',
  'रियान': 'R Parag',
  'लिविंगस्टोन': 'LS Livingstone',
  'मार्करम': 'AK Markram',
  'हुड्डा': 'DJ Hooda',
  'राशिद': 'AU Rashid',
  'मुस्तफिजुर': 'Mustafizur Rahman',
  'सकारिया': 'C Sakariya',
  'पोरेल': 'IC Porel',
  'एलन': 'FA Allen',
};

/** Lowercase; keep letters, digits and Devanagari; everything else becomes a space. */
export function matchKey(s: string): string {
  return ' ' + s.toLowerCase().normalize('NFKC').replace(/[^a-z0-9\u0900-\u097F]+/g, ' ').trim() + ' ';
}

type AliasMap = Map<string, Set<string>>;
const cache = new Map<string, AliasMap>();

function addAlias(map: AliasMap, alias: string, player: string) {
  const a = alias.trim().toLowerCase();
  if (!a) return;
  if (!map.has(a)) map.set(a, new Set());
  map.get(a)!.add(player);
}

function buildAliases(players: string[]): AliasMap {
  const key = players.join('|');
  const hit = cache.get(key);
  if (hit) return hit;
  const map: AliasMap = new Map();
  const set = new Set(players);
  for (const p of players) {
    addAlias(map, matchKey(p).trim(), p); // full name
    const parts = p.split(/\s+/);
    const last = parts[parts.length - 1].toLowerCase();
    if (parts.length > 1 && last.length >= 4 && !SKIP_SURNAMES.has(last)) addAlias(map, last, p);
    const first = parts[0];
    const isInitials = first === first.toUpperCase() && first.length <= 3;
    if (parts.length > 1 && !isInitials && first.length >= 4) addAlias(map, first.toLowerCase(), p);
  }
  for (const [alias, name] of Object.entries(MANUAL_ROMAN)) if (set.has(name)) addAlias(map, alias, name);
  for (const [alias, name] of Object.entries(MANUAL_DEVA)) if (set.has(name)) addAlias(map, alias, name);
  cache.set(key, map);
  return map;
}

/** All distinct players mentioned in `text`, in order of appearance. */
export function findPlayerMentions(text: string, players: string[]): string[] {
  const hay = matchKey(text);
  const aliases = buildAliases(players);
  const hits: { idx: number; player: string }[] = [];
  for (const [alias, owners] of aliases) {
    if (owners.size !== 1) continue; // ambiguous alias: do not guess
    const idx = hay.indexOf(' ' + alias + ' ');
    if (idx >= 0) hits.push({ idx, player: [...owners][0] });
  }
  hits.sort((a, b) => a.idx - b.idx);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const h of hits) {
    if (!seen.has(h.player)) {
      seen.add(h.player);
      out.push(h.player);
    }
  }
  return out;
}

export type PlayerResolution =
  | { ok: true; player: string }
  | { ok: false; code: 'not_found' | 'ambiguous'; candidates: string[] };

/** Resolve a tool argument (free text from a model or from the router) to exactly one real player. */
export function resolvePlayer(query: string, players: string[]): PlayerResolution {
  const exact = players.find((p) => p.toLowerCase() === query.trim().toLowerCase());
  if (exact) return { ok: true, player: exact };
  const mentions = findPlayerMentions(query, players);
  if (mentions.length === 1) return { ok: true, player: mentions[0] };
  if (mentions.length > 1) return { ok: false, code: 'ambiguous', candidates: mentions };
  // Ambiguous aliases (several players share a token): list them as candidates.
  const hay = matchKey(query);
  const cands = new Set<string>();
  for (const [alias, owners] of buildAliases(players)) {
    if (owners.size > 1 && hay.includes(' ' + alias + ' ')) owners.forEach((o) => cands.add(o));
  }
  if (cands.size > 0) return { ok: false, code: 'ambiguous', candidates: [...cands] };
  return { ok: false, code: 'not_found', candidates: [] };
}
