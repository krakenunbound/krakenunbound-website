// Kraken Arkade API - Cloudflare Worker
// Handles all game data operations via D1 database + Groq AI for puzzle generation

// =============================================================================
// DEPLOYMENT FLAGS - CHANGE THESE BEFORE PUSHING TO PRODUCTION!
// See DEPLOYMENT_FLAGS.md for full documentation
// =============================================================================
const BYPASS_AUTH = false;  // true = skip login (LOCAL TESTING), false = require login (PRODUCTION)
// When true: All auth checks are bypassed, uses "Guest" as default user
// When false: Requires valid token from /api/arkade/login

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// =============================================================================
// GROQ AI HELPER
// =============================================================================

async function queryGroq(env, prompt, maxTokens = 200) {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

// =============================================================================
// PUZZLE GENERATORS
// =============================================================================

async function generateWordleWord(env, targetDate) {
  // Check if already exists
  const existing = await env.DB.prepare('SELECT * FROM daily_words WHERE date = ?').bind(targetDate).first();
  if (existing) return existing;

  // Get past words to avoid repeats
  const pastWords = await env.DB.prepare('SELECT word FROM daily_words').all();
  const usedWords = new Set(pastWords.results.map(r => r.word));

  const dateObj = new Date(targetDate);
  const readableDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const prompt = `Current Date: ${readableDate}. Location: USA.

STRICT REQUIREMENTS:
1. Word MUST be exactly 5 letters.
2. Word MUST be a common American English word.
3. Difficulty: COLLEGE LEVEL - Not too easy, not obscure.
4. GOOD examples: CRANE, BRISK, GLYPH, PLUMB, CRAVE, DWELL, FORGE
5. NO plurals ending in S. NO proper nouns.

THEME SELECTION:
- If ${readableDate} is near a US Holiday, USE THAT THEME.
- Otherwise, use a seasonal or interesting theme.

FORMAT: THEME|WORD
Example: THANKSGIVING|FEAST

Output ONLY the format string, nothing else.`;

  let word = 'CRANE';
  let theme = 'General';

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await queryGroq(env, prompt);
      const cleaned = response.toUpperCase().replace(/[^A-Z|]/g, '');

      if (cleaned.includes('|')) {
        const [candidateTheme, candidateWord] = cleaned.split('|');
        if (candidateWord && candidateWord.length === 5 && !usedWords.has(candidateWord)) {
          word = candidateWord;
          theme = candidateTheme || 'General';
          break;
        }
      }
    } catch (e) {
      console.error(`Attempt ${attempt + 1} failed:`, e);
    }
  }

  // Save to database
  await env.DB.prepare(
    'INSERT OR REPLACE INTO daily_words (date, word, theme) VALUES (?, ?, ?)'
  ).bind(targetDate, word, theme).run();

  return { date: targetDate, word, theme };
}

async function generateConnections(env, targetDate) {
  // Check if already exists
  const existing = await env.DB.prepare('SELECT * FROM daily_connections WHERE date = ?').bind(targetDate).first();
  if (existing) return existing;

  const dateObj = new Date(targetDate);
  const readableDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const prompt = `Create a NYT-level Connections puzzle for ${readableDate}. This must be DIFFICULT and use RED HERRINGS.

DIFFICULTY TIERS (mandatory):
1. YELLOW (Easy): Direct synonyms or obvious set membership (e.g., RUSH, HURRY, DASH, SPRINT)
2. GREEN (Medium): Trivia or "things with X" categories requiring visualization (e.g., PIANO, TOOTH, COMB, SAW = Things with teeth)
3. BLUE (Hard): Requires specific knowledge or compound word awareness (e.g., ATOM, SECOND, HAIR, BANANA = Things that can be "split")
4. PURPLE (Fiendish): Wordplay, fill-in-the-blank, or linguistic tricks. NOT about word meaning, but word STRUCTURE (e.g., MOON, LIGHT, STAR, SKY = Words that follow "BLUE ___")

CRITICAL RED HERRING RULES:
- Include at least 2-3 words that APPEAR to fit multiple categories (this is mandatory)
- Example: If you have a "Birds" category, include TURKEY in a "Synonyms for Failure" category instead
- Example: SWALLOW could be a bird OR "tolerate" - use the less obvious meaning
- Example: JACK could be a name, a card, a tool, or part of "Jack Sparrow"
- The solver should see 5+ words that SEEM to fit one category, forcing them to find the true grouping

PURPLE CATEGORY PATTERNS (use one):
- Fill-in-the-blank: Words that precede/follow a hidden word (FIRE, WALL, FLY, PAPER all precede "TRAP")
- Homophones: EWE, YOU, YEW, U (sound alike)
- Hidden words: COCKATIEL contains "TEAL", CAMEROON contains "MAROON"
- Famous ___: JACK (Sparrow, Nicholson, Black, Kennedy)

FORMAT (JSON only):
{
  "categories": [
    {"name": "CATEGORY_NAME", "words": ["WORD1", "WORD2", "WORD3", "WORD4"], "difficulty": 1},
    {"name": "CATEGORY_NAME", "words": ["WORD1", "WORD2", "WORD3", "WORD4"], "difficulty": 2},
    {"name": "CATEGORY_NAME", "words": ["WORD1", "WORD2", "WORD3", "WORD4"], "difficulty": 3},
    {"name": "CATEGORY_NAME", "words": ["WORD1", "WORD2", "WORD3", "WORD4"], "difficulty": 4}
  ]
}

Remember: A good puzzle makes the solver think "Birds!" then realize TURKEY=Flop, SWALLOW=Tolerate, SPARROW=Pirate. Output ONLY valid JSON.`;

  let puzzleData = null;
  let theme = 'Daily Puzzle';

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await queryGroq(env, prompt, 800);
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let parsed = JSON.parse(jsonMatch[0]);
        if (parsed.categories && parsed.categories.length === 4) {
          // First pass: normalize words and names
          parsed.categories = parsed.categories.map((cat, idx) => ({
            name: String(cat.name || 'CATEGORY').toUpperCase(),
            words: (cat.words || []).map(w => String(w).toUpperCase().trim()),
            difficulty: cat.difficulty || (idx + 1)
          }));

          // Second pass: fix difficulties to be unique 1-4
          const claimedDiffs = new Map(); // maps difficulty -> category index that claimed it
          const availableDiffs = [1, 2, 3, 4];

          // First pass: let each category claim unique difficulties
          parsed.categories.forEach((cat, idx) => {
            const d = cat.difficulty;
            if (d >= 1 && d <= 4 && !claimedDiffs.has(d)) {
              claimedDiffs.set(d, idx);
              const pos = availableDiffs.indexOf(d);
              if (pos !== -1) availableDiffs.splice(pos, 1);
            }
          });

          // Second pass: assign unclaimed difficulties
          parsed.categories.forEach((cat, idx) => {
            if (claimedDiffs.get(cat.difficulty) !== idx) {
              // This category didn't get its requested difficulty, assign from available
              cat.difficulty = availableDiffs.shift() || 1;
            }
          });

          // Check all words are valid (non-empty, single words, 16 unique)
          const allWords = parsed.categories.flatMap(c => c.words);
          const allHave4Words = parsed.categories.every(c => c.words.length === 4);
          if (allHave4Words && allWords.length === 16 &&
            allWords.every(w => w.length > 0 && !w.includes(' ')) &&
            new Set(allWords).size === 16) {
            puzzleData = parsed;
            break;
          }
        }
      }
    } catch (e) {
      console.error(`Connections attempt ${attempt + 1} failed:`, e);
    }
  }

  if (!puzzleData) {
    // Fallback puzzle with proper red herrings
    // Red herrings: BEAR (animal or tolerate?), TURKEY (bird or flop?), LEMON (fruit or failure?)
    puzzleData = {
      categories: [
        { name: "TOLERATE", words: ["BEAR", "STAND", "STOMACH", "SWALLOW"], difficulty: 1 },
        { name: "THINGS WITH TEETH", words: ["COMB", "SAW", "ZIPPER", "GEAR"], difficulty: 2 },
        { name: "MOVIE FLOPS", words: ["TURKEY", "BOMB", "DUD", "LEMON"], difficulty: 3 },
        { name: "___ TRAP", words: ["MOUSE", "SPEED", "TOURIST", "BOOBY"], difficulty: 4 }
      ]
    };
  }

  // Save to database
  await env.DB.prepare(
    'INSERT OR REPLACE INTO daily_connections (date, theme, puzzle_data) VALUES (?, ?, ?)'
  ).bind(targetDate, theme, JSON.stringify(puzzleData)).run();

  return { date: targetDate, theme, puzzle_data: JSON.stringify(puzzleData) };
}

async function generateContexto(env, targetDate) {
  // Check if already exists
  const existing = await env.DB.prepare('SELECT * FROM daily_contexto WHERE date = ?').bind(targetDate).first();
  if (existing) return existing;

  // Get past words to avoid repeats
  const pastWords = await env.DB.prepare('SELECT secret_word FROM daily_contexto').all();
  const usedWords = new Set(pastWords.results.map(r => r.secret_word));

  const dateObj = new Date(targetDate);
  const readableDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const prompt = `Current Date: ${readableDate}.

Choose a SECRET WORD for a Contexto/semantic similarity game.

REQUIREMENTS:
1. Must be a COMMON English NOUN (not a verb, adjective, or proper noun)
2. Should be concrete (can be visualized) - not abstract concepts
3. 4-8 letters preferred
4. Should have MANY related words (for interesting gameplay)
5. Not too easy (avoid: DOG, CAT, HOUSE) - aim for medium difficulty

GOOD examples: OCEAN, FOREST, CASTLE, VOLCANO, TROPHY, LIBRARY, COMPASS, HARBOR
BAD examples: LOVE, THING, WAY, TIME (too abstract), CAT, DOG (too easy)

${readableDate.includes('December') ? 'Consider winter/holiday themes!' : ''}

Also provide a one-word THEME/CATEGORY for the word.

FORMAT: THEME|WORD
Example: NATURE|FOREST

Output ONLY the format string, nothing else.`;

  let secretWord = 'OCEAN';
  let theme = 'General';

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await queryGroq(env, prompt);
      const cleaned = response.toUpperCase().replace(/[^A-Z|]/g, '');

      if (cleaned.includes('|')) {
        const [candidateTheme, candidateWord] = cleaned.split('|');
        if (candidateWord && candidateWord.length >= 3 && candidateWord.length <= 10 && !usedWords.has(candidateWord)) {
          secretWord = candidateWord;
          theme = candidateTheme || 'General';
          break;
        }
      }
    } catch (e) {
      console.error(`Contexto attempt ${attempt + 1} failed:`, e);
    }
  }

  // Save to database
  await env.DB.prepare(
    'INSERT OR REPLACE INTO daily_contexto (date, secret_word, theme, nearby_words) VALUES (?, ?, ?, ?)'
  ).bind(targetDate, secretWord, theme, '[]').run();

  return { date: targetDate, secret_word: secretWord, theme };
}

async function generateSpellingBee(env, targetDate) {
  // Check if already exists
  const existing = await env.DB.prepare('SELECT * FROM daily_spellingbee WHERE date = ?').bind(targetDate).first();
  if (existing) return existing;

  const prompt = `Create a Spelling Bee puzzle.

RULES:
- Choose 7 unique letters (no repeats)
- One letter is the CENTER (required in all words)
- Valid words must be 4+ letters, use only these 7 letters, include center letter
- Include at least one pangram (uses all 7 letters)

FORMAT (JSON only):
{
  "center": "A",
  "outer": ["B", "C", "D", "E", "F", "G"],
  "pangrams": ["ABCDEFG"],
  "words": ["ABLE", "BEAD", "CAFE", ...]
}

Choose letters that allow many common words. Output ONLY valid JSON.`;

  let puzzleData = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await queryGroq(env, prompt, 800);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        puzzleData = JSON.parse(jsonMatch[0]);
        if (puzzleData.center && puzzleData.outer && puzzleData.words) {
          break;
        }
      }
    } catch (e) {
      console.error(`SpellingBee attempt ${attempt + 1} failed:`, e);
    }
  }

  if (!puzzleData) {
    // Fallback
    puzzleData = {
      center: "A",
      outer: ["P", "L", "N", "E", "T", "S"],
      pangrams: ["PLANETS"],
      words: ["PLAN", "PLANE", "PLANT", "PLANTS", "PLATE", "PLATES", "PLANET", "PLANETS", "LEAN", "LANE", "LATE", "SEAL", "SALE", "TALE", "PALE", "PANE", "SANE", "SLANT", "STALE", "STEAL"]
    };
  }

  const maxPoints = puzzleData.words.reduce((sum, w) => sum + (w.length === 4 ? 1 : w.length), 0) +
    puzzleData.pangrams.length * 7;

  await env.DB.prepare(
    'INSERT OR REPLACE INTO daily_spellingbee (date, center_letter, outer_letters, valid_words, pangrams, max_points) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(
    targetDate,
    puzzleData.center,
    puzzleData.outer.join(''),
    JSON.stringify(puzzleData.words),
    JSON.stringify(puzzleData.pangrams),
    maxPoints
  ).run();

  return { date: targetDate, center_letter: puzzleData.center, outer_letters: puzzleData.outer.join(''), valid_words: JSON.stringify(puzzleData.words), pangrams: JSON.stringify(puzzleData.pangrams), max_points: maxPoints };
}

async function generateBetween(env, targetDate) {
  // Check if already exists
  const existing = await env.DB.prepare('SELECT * FROM daily_between WHERE date = ?').bind(targetDate).first();
  if (existing) return existing;

  // Get past target words to avoid repeats
  const pastWords = await env.DB.prepare('SELECT target_word FROM daily_between').all();
  const usedWords = new Set(pastWords.results.map(r => r.target_word));

  const dateObj = new Date(targetDate);
  const readableDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const prompt = `Create a Betweenle puzzle for ${readableDate}.

BETWEENLE RULES:
- Player must find a SECRET WORD by guessing words
- Each guess narrows down an alphabetical range (lower/upper bounds)
- The secret word is alphabetically BETWEEN the bounds

REQUIREMENTS:
1. Choose a SECRET WORD that is:
   - A common English word (5-8 letters preferred)
   - Not too obscure but not too obvious
   - Has interesting alphabetical neighbors

2. Set initial bounds:
   - LOWER BOUND: A common word that comes BEFORE the secret alphabetically
   - UPPER BOUND: A common word that comes AFTER the secret alphabetically
   - Bounds should be ~50-200 words apart (not too easy, not too hard)

${readableDate.includes('December') ? 'Consider winter/holiday themed words!' : ''}

FORMAT (JSON only):
{
  "target": "KRAKEN",
  "lower": "IGLOO",
  "upper": "LUNAR"
}

Choose interesting words. Output ONLY valid JSON.`;

  let puzzleData = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await queryGroq(env, prompt, 100);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        puzzleData = JSON.parse(jsonMatch[0]);
        const target = (puzzleData.target || '').toUpperCase();
        const lower = (puzzleData.lower || '').toUpperCase();
        const upper = (puzzleData.upper || '').toUpperCase();

        // Validate: lower < target < upper alphabetically
        if (target && lower && upper && lower < target && target < upper && !usedWords.has(target)) {
          puzzleData = { target, lower, upper };
          break;
        }
      }
    } catch (e) {
      console.error(`Between attempt ${attempt + 1} failed:`, e);
    }
  }

  if (!puzzleData) {
    // Fallback with good defaults
    const fallbacks = [
      { target: 'HARBOR', lower: 'GARDEN', upper: 'ISLAND' },
      { target: 'CASTLE', lower: 'BRIDGE', upper: 'DRAGON' },
      { target: 'FOREST', lower: 'FALCON', upper: 'GALAXY' },
      { target: 'PIRATE', lower: 'PALACE', upper: 'PUZZLE' },
      { target: 'SHADOW', lower: 'SEASON', upper: 'SILVER' }
    ];
    puzzleData = fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  await env.DB.prepare(
    'INSERT OR REPLACE INTO daily_between (date, target_word, lower_bound, upper_bound) VALUES (?, ?, ?, ?)'
  ).bind(targetDate, puzzleData.target, puzzleData.lower, puzzleData.upper).run();

  return { date: targetDate, target_word: puzzleData.target, lower_bound: puzzleData.lower, upper_bound: puzzleData.upper };
}

async function generatePhrase(env, targetDate) {
  // Check if already exists
  const existing = await env.DB.prepare('SELECT * FROM daily_phrases WHERE date = ?').bind(targetDate).first();
  if (existing) return existing;

  // Get past phrases to avoid repeats
  const pastPhrases = await env.DB.prepare('SELECT phrase FROM daily_phrases').all();
  const usedPhrases = new Set(pastPhrases.results.map(r => r.phrase.toUpperCase()));

  const dateObj = new Date(targetDate);
  const readableDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const prompt = `Create a Phrase puzzle for ${readableDate}.

PHRASE PUZZLE RULES:
- Player guesses a famous phrase/quote letter by letter (like Wheel of Fortune meets Wordle)
- Each guess fills in ALL letters across all words

REQUIREMENTS:
1. Choose a PHRASE that is:
   - Well-known (famous quote, idiom, movie line, saying)
   - 2-5 words long
   - Each word 2-8 letters
   - Total phrase length 10-30 characters (letters only)
   - Easy to recognize once solved

2. Provide a CATEGORY hint (e.g., "MOVIE QUOTE", "IDIOM", "FAMOUS SAYING", "SONG LYRIC")

${readableDate.includes('December') ? 'Consider holiday/winter themed phrases!' : ''}

GOOD EXAMPLES:
- "THE EARLY BIRD" (IDIOM)
- "MAY THE FORCE" (MOVIE QUOTE)
- "JUST DO IT" (SLOGAN)
- "TO BE OR NOT" (SHAKESPEARE)

FORMAT (JSON only):
{
  "phrase": "MAY THE FORCE",
  "category": "MOVIE QUOTE"
}

Output ONLY valid JSON.`;

  let puzzleData = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await queryGroq(env, prompt, 100);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        puzzleData = JSON.parse(jsonMatch[0]);
        const phrase = (puzzleData.phrase || '').toUpperCase().replace(/[^A-Z ]/g, '').trim();
        const category = puzzleData.category || 'PHRASE';

        // Validate
        const words = phrase.split(' ').filter(w => w.length > 0);
        if (phrase.length >= 8 && phrase.length <= 40 && words.length >= 2 && words.length <= 6 && !usedPhrases.has(phrase)) {
          puzzleData = { phrase, category };
          break;
        }
      }
    } catch (e) {
      console.error(`Phrase attempt ${attempt + 1} failed:`, e);
    }
  }

  if (!puzzleData) {
    // Fallback with famous phrases
    const fallbacks = [
      { phrase: 'CARPE DIEM', category: 'LATIN PHRASE' },
      { phrase: 'TO BE OR NOT TO BE', category: 'SHAKESPEARE' },
      { phrase: 'JUST DO IT', category: 'SLOGAN' },
      { phrase: 'MAY THE FORCE BE WITH YOU', category: 'MOVIE QUOTE' },
      { phrase: 'THE EARLY BIRD', category: 'IDIOM' },
      { phrase: 'BREAK A LEG', category: 'IDIOM' },
      { phrase: 'ACTIONS SPEAK LOUDER', category: 'PROVERB' },
      { phrase: 'TIME IS MONEY', category: 'SAYING' }
    ];
    puzzleData = fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  await env.DB.prepare(
    'INSERT OR REPLACE INTO daily_phrases (date, phrase, category) VALUES (?, ?, ?)'
  ).bind(targetDate, puzzleData.phrase, puzzleData.category).run();

  return { date: targetDate, phrase: puzzleData.phrase, category: puzzleData.category };
}

// =============================================================================
// AD ASTRA HELPERS
// =============================================================================

// Helper: Hash password for Ad Astra
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper: Generate token for Ad Astra
function generateToken() {
  return crypto.randomUUID() + crypto.randomUUID();
}

// Helper: Verify token and get account (Unified Arkade Auth)
// When BYPASS_AUTH is true, returns a guest account for local testing
async function verifyToken(env, token) {
  // If auth is bypassed, return a guest account
  if (BYPASS_AUTH) {
    return { id: 0, username: 'TestPilot', is_admin: true };
  }

  if (!token) return null;
  const row = await env.DB.prepare(
    'SELECT a.id, a.username, a.is_admin FROM adastra_sessions s JOIN adastra_accounts a ON s.account_id = a.id WHERE s.token = ?'
  ).bind(token).first();
  return row;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      let result;

      // Route handling
      if (path === '/api/health') {
        result = { status: 'ok', timestamp: new Date().toISOString() };
      }

      // ===== GENERATE ENDPOINTS (trigger puzzle generation) =====
      else if (path === '/api/generate/wordle' && request.method === 'POST') {
        const body = await request.json();
        const date = body.date || new Date().toISOString().split('T')[0];
        result = await generateWordleWord(env, date);
      }

      else if (path === '/api/generate/connections' && request.method === 'POST') {
        const body = await request.json();
        const date = body.date || new Date().toISOString().split('T')[0];
        result = await generateConnections(env, date);
      }

      else if (path === '/api/generate/spellingbee' && request.method === 'POST') {
        const body = await request.json();
        const date = body.date || new Date().toISOString().split('T')[0];
        result = await generateSpellingBee(env, date);
      }

      else if (path === '/api/generate/contexto' && request.method === 'POST') {
        const body = await request.json();
        const date = body.date || new Date().toISOString().split('T')[0];
        result = await generateContexto(env, date);
      }

      else if (path === '/api/generate/between' && request.method === 'POST') {
        const body = await request.json();
        const date = body.date || new Date().toISOString().split('T')[0];
        result = await generateBetween(env, date);
      }

      else if (path === '/api/generate/phrase' && request.method === 'POST') {
        const body = await request.json();
        const date = body.date || new Date().toISOString().split('T')[0];
        result = await generatePhrase(env, date);
      }

      else if (path === '/api/generate/all' && request.method === 'POST') {
        // Generate all puzzles for a date
        const body = await request.json();
        const date = body.date || new Date().toISOString().split('T')[0];
        const wordle = await generateWordleWord(env, date);
        const connections = await generateConnections(env, date);
        const spellingbee = await generateSpellingBee(env, date);
        const contexto = await generateContexto(env, date);
        const between = await generateBetween(env, date);
        const phrase = await generatePhrase(env, date);
        result = { date, wordle, connections, spellingbee, contexto, between, phrase };
      }

      // ===== DAILY WORDS (Word Kraken / Wordle) =====
      else if (path === '/api/daily-word' && request.method === 'GET') {
        const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
        let row = await env.DB.prepare('SELECT * FROM daily_words WHERE date = ?').bind(date).first();
        // Auto-generate if missing and it's today
        if (!row && date === new Date().toISOString().split('T')[0]) {
          row = await generateWordleWord(env, date);
        }
        result = row || { error: 'No word for this date' };
      }

      else if (path === '/api/wordle/score' && request.method === 'POST') {
        const body = await request.json();
        const { date, player_name, guesses } = body;
        await env.DB.prepare(
          'INSERT OR REPLACE INTO wordle_scores (date, player_name, guesses) VALUES (?, ?, ?)'
        ).bind(date, player_name, guesses).run();
        result = { success: true };
      }

      else if (path === '/api/wordle/scores' && request.method === 'GET') {
        const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
        const rows = await env.DB.prepare(
          'SELECT * FROM wordle_scores WHERE date = ? ORDER BY guesses ASC'
        ).bind(date).all();
        result = rows.results;
      }

      // Delete user scores (admin function)
      else if (path === '/api/wordle/delete-user' && request.method === 'POST') {
        const body = await request.json();
        const { player_name, date } = body;
        if (date) {
          await env.DB.prepare('DELETE FROM wordle_scores WHERE player_name = ? AND date = ?').bind(player_name, date).run();
          await env.DB.prepare('DELETE FROM game_state WHERE player_name = ? AND date = ?').bind(player_name, date).run();
        } else {
          await env.DB.prepare('DELETE FROM wordle_scores WHERE player_name = ?').bind(player_name).run();
          await env.DB.prepare('DELETE FROM game_state WHERE player_name = ?').bind(player_name).run();
        }
        result = { success: true, deleted: player_name };
      }

      else if (path === '/api/wordle/state' && request.method === 'GET') {
        const date = url.searchParams.get('date');
        const player = url.searchParams.get('player');
        const row = await env.DB.prepare(
          'SELECT * FROM game_state WHERE date = ? AND player_name = ?'
        ).bind(date, player).first();
        result = row || null;
      }

      else if (path === '/api/wordle/state' && request.method === 'POST') {
        const body = await request.json();
        const { date, player_name, guesses } = body;
        await env.DB.prepare(
          'INSERT OR REPLACE INTO game_state (date, player_name, guesses) VALUES (?, ?, ?)'
        ).bind(date, player_name, guesses).run();
        result = { success: true };
      }

      // ===== VALIDATE WORD (uses Groq if not in common dictionary) =====
      else if (path === '/api/wordle/validate' && request.method === 'POST') {
        const body = await request.json();
        const word = (body.word || '').toUpperCase();

        if (word.length !== 5 || !/^[A-Z]+$/.test(word)) {
          result = { valid: false, reason: 'Invalid format' };
        } else {
          // Ask Groq if it's a valid word
          try {
            const response = await queryGroq(env,
              `Is "${word}" a valid 5-letter English word that would appear in a standard dictionary? Answer only YES or NO.`,
              10
            );
            const isValid = response.toUpperCase().includes('YES');
            result = { valid: isValid, word };
          } catch (e) {
            // If Groq fails, be permissive
            result = { valid: true, word, note: 'AI validation unavailable' };
          }
        }
      }

      // ===== CONNECTIONS (Kraken Kategories) =====
      else if (path === '/api/connections/daily' && request.method === 'GET') {
        const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
        let row = await env.DB.prepare('SELECT * FROM daily_connections WHERE date = ?').bind(date).first();
        if (!row && date === new Date().toISOString().split('T')[0]) {
          row = await generateConnections(env, date);
        }
        result = row || { error: 'No puzzle for this date' };
      }

      else if (path === '/api/connections/score' && request.method === 'POST') {
        const body = await request.json();
        const { date, player_name, mistakes, solved } = body;
        await env.DB.prepare(
          'INSERT OR REPLACE INTO connections_scores (date, player_name, mistakes, solved) VALUES (?, ?, ?, ?)'
        ).bind(date, player_name, mistakes, solved ? 1 : 0).run();
        result = { success: true };
      }

      else if (path === '/api/connections/scores' && request.method === 'GET') {
        const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
        const rows = await env.DB.prepare(
          'SELECT * FROM connections_scores WHERE date = ? ORDER BY mistakes ASC, solved DESC'
        ).bind(date).all();
        result = rows.results;
      }

      // Delete user connections scores (admin function)
      else if (path === '/api/connections/delete-user' && request.method === 'POST') {
        const body = await request.json();
        const { player_name, date } = body;
        if (date) {
          await env.DB.prepare('DELETE FROM connections_scores WHERE player_name = ? AND date = ?').bind(player_name, date).run();
        } else {
          await env.DB.prepare('DELETE FROM connections_scores WHERE player_name = ?').bind(player_name).run();
        }
        result = { success: true, deleted: player_name };
      }

      // ===== SPELLING BEE (Spelling Kraken) =====
      else if (path === '/api/spellingbee/daily' && request.method === 'GET') {
        const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
        let row = await env.DB.prepare('SELECT * FROM daily_spellingbee WHERE date = ?').bind(date).first();
        if (!row && date === new Date().toISOString().split('T')[0]) {
          row = await generateSpellingBee(env, date);
        }
        result = row || { error: 'No puzzle for this date' };
      }

      else if (path === '/api/spellingbee/score' && request.method === 'POST') {
        const body = await request.json();
        const { date, player_name, points, words_found } = body;
        await env.DB.prepare(
          'INSERT OR REPLACE INTO spellingbee_scores (date, player_name, points, words_found) VALUES (?, ?, ?, ?)'
        ).bind(date, player_name, points, words_found).run();
        result = { success: true };
      }

      else if (path === '/api/spellingbee/scores' && request.method === 'GET') {
        const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
        const rows = await env.DB.prepare(
          'SELECT * FROM spellingbee_scores WHERE date = ? ORDER BY points DESC'
        ).bind(date).all();
        result = rows.results;
      }

      // ===== SPELLING BEE CHECK =====
      else if (path === '/api/spellingbee/check' && request.method === 'POST') {
        const body = await request.json();
        const word = (body.word || '').toUpperCase().trim();
        const date = body.date || new Date().toISOString().split('T')[0];

        // Get today's puzzle
        const puzzle = await env.DB.prepare('SELECT * FROM daily_spellingbee WHERE date = ?').bind(date).first();
        if (!puzzle) {
          result = { valid: false, error: 'No puzzle found' };
        } else {
          const validWords = JSON.parse(puzzle.valid_words);
          const pangrams = JSON.parse(puzzle.pangrams);

          if (validWords.map(w => w.toUpperCase()).includes(word)) {
            const isPangram = pangrams.map(p => p.toUpperCase()).includes(word);
            const points = word.length === 4 ? 1 : (isPangram ? word.length + 7 : word.length);
            result = { valid: true, points, is_pangram: isPangram };
          } else {
            result = { valid: false, error: 'Not in word list' };
          }
        }
      }

      // ===== BETWEEN (Abyssal Between) =====
      else if (path === '/api/between/daily' && request.method === 'GET') {
        const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
        let row = await env.DB.prepare('SELECT * FROM daily_between WHERE date = ?').bind(date).first();
        // Auto-generate if missing and it's today
        if (!row && date === new Date().toISOString().split('T')[0]) {
          row = await generateBetween(env, date);
        }
        // Don't send the target word to client!
        if (row) {
          result = { date: row.date, lower_bound: row.lower_bound, upper_bound: row.upper_bound };
        } else {
          result = { error: 'No puzzle for this date' };
        }
      }

      else if (path === '/api/between/check' && request.method === 'POST') {
        const body = await request.json();
        const word = (body.word || '').toUpperCase().trim();
        const date = body.date || new Date().toISOString().split('T')[0];

        if (!word || word.length < 2) {
          result = { valid: false, error: 'Invalid word' };
        } else {
          // Use AI to validate if it's a real English word
          const validatePrompt = `Is "${word}" a valid common English word? Answer ONLY "yes" or "no".`;
          let isValidWord = true;

          try {
            const response = await queryGroq(env, validatePrompt, 10);
            isValidWord = response.toLowerCase().includes('yes');
          } catch (e) {
            // Default to accepting the word if AI fails
            isValidWord = true;
          }

          if (!isValidWord) {
            result = { valid: false, error: 'Not a valid word' };
          } else {
            // Get the puzzle to check against target
            const puzzle = await env.DB.prepare('SELECT * FROM daily_between WHERE date = ?').bind(date).first();
            if (!puzzle) {
              result = { valid: false, error: 'No puzzle found' };
            } else {
              const target = puzzle.target_word.toUpperCase();

              if (word === target) {
                result = { valid: true, result: 'correct' };
              } else if (word < target) {
                result = { valid: true, result: 'too_low' };
              } else {
                result = { valid: true, result: 'too_high' };
              }
            }
          }
        }
      }

      else if (path === '/api/between/score' && request.method === 'POST') {
        const body = await request.json();
        const { date, player_name, guesses, score } = body;
        await env.DB.prepare(
          'INSERT OR REPLACE INTO between_scores (date, player_name, guesses, score) VALUES (?, ?, ?, ?)'
        ).bind(date || new Date().toISOString().split('T')[0], player_name, guesses, score).run();
        result = { success: true };
      }

      // ===== PHRASE (Phrase Kraken) =====
      else if (path === '/api/phrase/daily' && request.method === 'GET') {
        const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
        let row = await env.DB.prepare('SELECT * FROM daily_phrases WHERE date = ?').bind(date).first();
        // Auto-generate if missing and it's today
        if (!row && date === new Date().toISOString().split('T')[0]) {
          row = await generatePhrase(env, date);
        }
        if (row) {
          // Return phrase split into words for display
          const words = row.phrase.split(' ').filter(w => w.length > 0);
          result = { date: row.date, words, category: row.category, phrase: row.phrase };
        } else {
          result = { error: 'No puzzle for this date' };
        }
      }

      else if (path === '/api/phrase/scores' && request.method === 'GET') {
        const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
        const rows = await env.DB.prepare(
          'SELECT * FROM phrase_scores WHERE date = ? AND won = 1 ORDER BY attempts ASC LIMIT 20'
        ).bind(date).all();
        result = rows.results;
      }

      else if (path === '/api/phrase/score' && request.method === 'POST') {
        const body = await request.json();
        const { date, player_name, attempts, won, score } = body;
        await env.DB.prepare(
          'INSERT OR REPLACE INTO phrase_scores (date, player_name, attempts, won, score) VALUES (?, ?, ?, ?, ?)'
        ).bind(date || new Date().toISOString().split('T')[0], player_name, attempts, won ? 1 : 0, score).run();
        result = { success: true };
      }

      else if (path === '/api/between/scores' && request.method === 'GET') {
        const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
        const rows = await env.DB.prepare(
          'SELECT * FROM between_scores WHERE date = ? ORDER BY guesses ASC LIMIT 20'
        ).bind(date).all();
        result = rows.results;
      }

      // ===== CONTEXTO (Abyssal Guess) =====
      else if (path === '/api/contexto/daily' && request.method === 'GET') {
        const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
        let row = await env.DB.prepare('SELECT * FROM daily_contexto WHERE date = ?').bind(date).first();
        // Auto-generate if missing and it's today
        if (!row && date === new Date().toISOString().split('T')[0]) {
          row = await generateContexto(env, date);
        }
        // Return theme only, not the secret word!
        if (row) {
          result = { date: row.date, theme: row.theme, hasWord: !!row.secret_word };
        } else {
          result = { error: 'No puzzle for this date' };
        }
      }

      else if (path === '/api/contexto/guess' && request.method === 'POST') {
        const body = await request.json();
        const { word, date } = body;
        const targetDate = date || new Date().toISOString().split('T')[0];
        const guessWord = (word || '').toUpperCase().trim();

        if (!guessWord || guessWord.length < 2) {
          result = { error: 'Invalid word' };
        } else {
          // Get the secret word
          let puzzle = await env.DB.prepare('SELECT * FROM daily_contexto WHERE date = ?').bind(targetDate).first();
          if (!puzzle) {
            puzzle = await generateContexto(env, targetDate);
          }

          const secretWord = puzzle.secret_word;

          // Check for exact match
          if (guessWord === secretWord) {
            result = { word: guessWord, rank: 1, score: 100, isWinner: true };
          } else {
            // Use AI to rate semantic similarity
            const similarityPrompt = `Rate the semantic similarity between "${secretWord}" and "${guessWord}" on a scale of 0-100.

Consider:
- Direct synonyms or very related concepts: 80-99
- Same category/field: 60-79
- Loosely related: 40-59
- Tangentially related: 20-39
- Unrelated: 0-19

The secret word is: ${secretWord}
The guessed word is: ${guessWord}

Respond with ONLY a number from 0 to 100. Nothing else.`;

            try {
              const response = await queryGroq(env, similarityPrompt, 10);
              const scoreMatch = response.match(/\d+/);
              let score = scoreMatch ? parseInt(scoreMatch[0]) : 25;
              score = Math.max(0, Math.min(99, score)); // Clamp 0-99 (100 is reserved for exact match)

              // Convert score to rank (higher score = lower rank = better)
              // Score 99 -> rank ~2, Score 50 -> rank ~500, Score 0 -> rank ~1000
              const rank = Math.max(2, Math.round(1000 - (score * 10)));

              result = { word: guessWord, rank, score, isWinner: false };
            } catch (e) {
              // Fallback random score if AI fails
              const randomScore = Math.floor(Math.random() * 50) + 10;
              result = { word: guessWord, rank: 1000 - randomScore * 10, score: randomScore, isWinner: false, aiError: true };
            }
          }
        }
      }

      else if (path === '/api/contexto/hint' && request.method === 'GET') {
        const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
        const puzzle = await env.DB.prepare('SELECT * FROM daily_contexto WHERE date = ?').bind(date).first();

        if (puzzle) {
          // Generate a hint without revealing the word
          const hintPrompt = `The secret word is "${puzzle.secret_word}".
Give a VAGUE hint that helps narrow down the category without revealing the word.
Examples of good hints:
- "Think about things found in nature"
- "This relates to buildings or structures"
- "Consider items you might find at a celebration"

Keep it SHORT (under 10 words). Do NOT mention the actual word.`;

          try {
            const hint = await queryGroq(env, hintPrompt, 50);
            result = { hint: hint.replace(/"/g, '').trim() };
          } catch (e) {
            result = { hint: `Today's theme: ${puzzle.theme}` };
          }
        } else {
          result = { error: 'No puzzle found' };
        }
      }

      else if (path === '/api/contexto/reveal' && request.method === 'GET') {
        // Admin only - reveals the word for testing
        const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
        const puzzle = await env.DB.prepare('SELECT * FROM daily_contexto WHERE date = ?').bind(date).first();
        result = puzzle ? { word: puzzle.secret_word } : { error: 'No puzzle' };
      }

      else if (path === '/api/contexto/score' && request.method === 'POST') {
        const body = await request.json();
        const { date, player_name, guesses, solved } = body;
        await env.DB.prepare(
          'INSERT OR REPLACE INTO contexto_scores (date, player_name, guesses, solved) VALUES (?, ?, ?, ?)'
        ).bind(date, player_name, guesses, solved ? 1 : 0).run();
        result = { success: true };
      }

      else if (path === '/api/contexto/scores' && request.method === 'GET') {
        const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
        const rows = await env.DB.prepare(
          'SELECT player_name, guesses, solved FROM contexto_scores WHERE date = ? AND solved = 1 ORDER BY guesses ASC LIMIT 20'
        ).bind(date).all();
        result = rows.results;
      }

      // Delete user contexto scores (admin function)
      else if (path === '/api/contexto/delete-user' && request.method === 'POST') {
        const body = await request.json();
        const { player_name, date } = body;
        if (date) {
          await env.DB.prepare('DELETE FROM contexto_scores WHERE player_name = ? AND date = ?').bind(player_name, date).run();
        } else {
          await env.DB.prepare('DELETE FROM contexto_scores WHERE player_name = ?').bind(player_name).run();
        }
        result = { success: true, deleted: player_name };
      }

      // ===== ARCADE SCORES =====
      else if (path === '/api/arcade/score' && request.method === 'POST') {
        const body = await request.json();
        const { game, player_name, score, level } = body;
        await env.DB.prepare(
          'INSERT INTO arcade_scores (game, player_name, score, level) VALUES (?, ?, ?, ?)'
        ).bind(game, player_name, score, level || null).run();
        result = { success: true };
      }

      else if (path === '/api/arcade/scores' && request.method === 'GET') {
        const game = url.searchParams.get('game');
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const rows = await env.DB.prepare(
          'SELECT * FROM arcade_scores WHERE game = ? ORDER BY score DESC LIMIT ?'
        ).bind(game, limit).all();
        result = rows.results;
      }

      else if (path === '/api/arcade/highscore' && request.method === 'GET') {
        const game = url.searchParams.get('game');
        const row = await env.DB.prepare(
          'SELECT * FROM arcade_scores WHERE game = ? ORDER BY score DESC LIMIT 1'
        ).bind(game).first();
        result = row || { score: 0 };
      }

      // ===== CROSSWORD =====
      else if (path === '/api/crossword/daily' && request.method === 'GET') {
        const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
        const row = await env.DB.prepare('SELECT * FROM daily_crosswords WHERE date = ?').bind(date).first();
        result = row || { error: 'No crossword for this date' };
      }

      else if (path === '/api/crossword/score' && request.method === 'POST') {
        const body = await request.json();
        const { date, player_name, time_seconds, used_check_mode } = body;
        await env.DB.prepare(
          'INSERT OR REPLACE INTO crossword_scores (date, player_name, time_seconds, used_check_mode) VALUES (?, ?, ?, ?)'
        ).bind(date, player_name, time_seconds, used_check_mode ? 1 : 0).run();
        result = { success: true };
      }

      // ===== UNIFIED ARKADE AUTH =====
      // These endpoints handle authentication for ALL Arkade games
      // Uses adastra_accounts/sessions tables (shared with Ad Astra)

      // Check if auth is required (returns bypass status)
      else if (path === '/api/arkade/auth-status' && request.method === 'GET') {
        result = {
          bypass: BYPASS_AUTH,
          message: BYPASS_AUTH ? 'Auth bypassed for local testing' : 'Auth required'
        };
      }

      // Register new Arkade account
      else if (path === '/api/arkade/register' && request.method === 'POST') {
        // If bypassing auth, return success immediately
        if (BYPASS_AUTH) {
          result = { success: true, token: 'bypass-token', username: 'TestPilot', bypass: true };
        } else {
          const body = await request.json();
          const username = (body.username || '').trim();
          const password = body.password || '';

          if (!username || username.length < 2) {
            return new Response(JSON.stringify({ error: 'Username must be at least 2 characters' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          if (!password || password.length < 1) {
            return new Response(JSON.stringify({ error: 'Password is required' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // Check if username exists
          const existing = await env.DB.prepare('SELECT id FROM adastra_accounts WHERE username = ?').bind(username).first();
          if (existing) {
            return new Response(JSON.stringify({ error: 'Username already taken' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const passwordHash = await hashPassword(password);
          const createdAt = new Date().toISOString();
          const token = generateToken();

          // Create account
          await env.DB.prepare(
            'INSERT INTO adastra_accounts (username, password_hash, created_at) VALUES (?, ?, ?)'
          ).bind(username, passwordHash, createdAt).run();

          const accountRow = await env.DB.prepare('SELECT id FROM adastra_accounts WHERE username = ?').bind(username).first();
          const accountId = accountRow.id;

          // Create session
          await env.DB.prepare(
            'INSERT INTO adastra_sessions (account_id, token, created_at, expires_at) VALUES (?, ?, ?, ?)'
          ).bind(accountId, token, createdAt, createdAt).run();

          result = { success: true, token, username };
        }
      }

      // Login to Arkade
      else if (path === '/api/arkade/login' && request.method === 'POST') {
        // If bypassing auth, return success immediately
        if (BYPASS_AUTH) {
          result = { success: true, token: 'bypass-token', username: 'TestPilot', is_admin: true, bypass: true };
        } else {
          const body = await request.json();
          const username = (body.username || '').trim();
          const password = body.password || '';

          if (!username || !password) {
            return new Response(JSON.stringify({ error: 'Username and password required' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const passwordHash = await hashPassword(password);
          const row = await env.DB.prepare(
            'SELECT id, is_admin, is_banned FROM adastra_accounts WHERE username = ? AND password_hash = ?'
          ).bind(username, passwordHash).first();

          if (!row) {
            return new Response(JSON.stringify({ error: 'Invalid username or password' }), {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          if (row.is_banned) {
            return new Response(JSON.stringify({ error: 'Account is banned' }), {
              status: 403,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const now = new Date().toISOString();
          await env.DB.prepare('UPDATE adastra_accounts SET last_login = ? WHERE id = ?').bind(now, row.id).run();

          const token = generateToken();
          await env.DB.prepare(
            'INSERT INTO adastra_sessions (account_id, token, created_at, expires_at) VALUES (?, ?, ?, ?)'
          ).bind(row.id, token, now, now).run();

          result = { success: true, token, username, is_admin: !!row.is_admin };
        }
      }

      // Verify token (check if logged in)
      else if (path === '/api/arkade/verify' && request.method === 'GET') {
        if (BYPASS_AUTH) {
          result = { valid: true, username: 'TestPilot', is_admin: true, bypass: true };
        } else {
          const token = request.headers.get('Authorization')?.replace('Bearer ', '') ||
            url.searchParams.get('token');
          const account = await verifyToken(env, token);

          if (account) {
            result = { valid: true, username: account.username, is_admin: !!account.is_admin };
          } else {
            result = { valid: false };
          }
        }
      }

      // Logout (invalidate token)
      else if (path === '/api/arkade/logout' && request.method === 'POST') {
        if (!BYPASS_AUTH) {
          const token = request.headers.get('Authorization')?.replace('Bearer ', '');
          if (token) {
            await env.DB.prepare('DELETE FROM adastra_sessions WHERE token = ?').bind(token).run();
          }
        }
        result = { success: true };
      }

      // ===== AD ASTRA (Space Trading Game) =====

      // Register new account
      else if (path === '/api/adastra/register' && request.method === 'POST') {
        const body = await request.json();
        const username = (body.username || '').trim();
        const password = body.password || '';
        const pilotName = (body.pilotName || '').trim();
        const shipName = (body.shipName || '').trim();
        const shipType = body.shipType || 'scout';
        const shipVariant = body.shipVariant || 1;

        if (!username || !password) {
          return new Response(JSON.stringify({ error: 'Username and password required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Check if username exists
        const existing = await env.DB.prepare('SELECT id FROM adastra_accounts WHERE username = ?').bind(username).first();
        if (existing) {
          return new Response(JSON.stringify({ error: 'Username already exists' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const passwordHash = await hashPassword(password);
        const createdAt = new Date().toISOString();
        const token = generateToken();

        // Create account
        await env.DB.prepare(
          'INSERT INTO adastra_accounts (username, password_hash, created_at) VALUES (?, ?, ?)'
        ).bind(username, passwordHash, createdAt).run();

        const accountRow = await env.DB.prepare('SELECT id FROM adastra_accounts WHERE username = ?').bind(username).first();
        const accountId = accountRow.id;

        // Create player
        await env.DB.prepare(
          'INSERT INTO adastra_players (account_id, pilot_name, ship_name, ship_type, ship_variant) VALUES (?, ?, ?, ?, ?)'
        ).bind(accountId, pilotName, shipName, shipType, shipVariant).run();

        // Create session
        await env.DB.prepare(
          'INSERT INTO adastra_sessions (account_id, token, created_at, expires_at) VALUES (?, ?, ?, ?)'
        ).bind(accountId, token, createdAt, createdAt).run();

        result = { success: true, token, username };
      }

      // Login
      else if (path === '/api/adastra/login' && request.method === 'POST') {
        const body = await request.json();
        const username = (body.username || '').trim();
        const password = body.password || '';

        if (!username || !password) {
          return new Response(JSON.stringify({ error: 'Username and password required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const passwordHash = await hashPassword(password);
        const row = await env.DB.prepare(
          'SELECT id, is_admin, is_banned FROM adastra_accounts WHERE username = ? AND password_hash = ?'
        ).bind(username, passwordHash).first();

        if (!row) {
          return new Response(JSON.stringify({ error: 'Invalid username or password' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (row.is_banned) {
          return new Response(JSON.stringify({ error: 'Account is banned' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const now = new Date().toISOString();
        await env.DB.prepare('UPDATE adastra_accounts SET last_login = ? WHERE id = ?').bind(now, row.id).run();

        const token = generateToken();
        await env.DB.prepare(
          'INSERT INTO adastra_sessions (account_id, token, created_at, expires_at) VALUES (?, ?, ?, ?)'
        ).bind(row.id, token, now, now).run();

        result = { success: true, token, username, is_admin: !!row.is_admin };
      }

      // Get player data
      else if (path === '/api/adastra/player' && request.method === 'GET') {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');
        const account = await verifyToken(env, token);

        if (!account) {
          return new Response(JSON.stringify({ error: 'Invalid token' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const row = await env.DB.prepare(
          'SELECT p.*, a.username, a.is_admin FROM adastra_players p JOIN adastra_accounts a ON p.account_id = a.id WHERE p.account_id = ?'
        ).bind(account.id).first();

        if (!row) {
          return new Response(JSON.stringify({ error: 'Player not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        result = {
          username: row.username,
          pilotName: row.pilot_name,
          shipName: row.ship_name,
          credits: row.credits,
          turns: row.turns,
          currentSector: row.current_sector,
          shipType: row.ship_type,
          cargo: row.cargo ? JSON.parse(row.cargo) : {},
          equipment: row.equipment ? JSON.parse(row.equipment) : {},
          gameState: row.game_state ? JSON.parse(row.game_state) : {},
          lastActivity: row.last_activity,
          shipVariant: row.ship_variant || 1,
          is_admin: !!row.is_admin
        };
      }

      // Update player data
      else if (path === '/api/adastra/player' && request.method === 'PUT') {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');
        const account = await verifyToken(env, token);

        if (!account) {
          return new Response(JSON.stringify({ error: 'Invalid token' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const body = await request.json();
        const now = new Date().toISOString();

        // Check if player exists
        const existing = await env.DB.prepare('SELECT id FROM adastra_players WHERE account_id = ?').bind(account.id).first();

        if (!existing) {
          // Create new player record
          await env.DB.prepare(
            'INSERT INTO adastra_players (account_id, pilot_name, ship_name, credits, turns, current_sector, ship_type, cargo, equipment, game_state, ship_variant) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
          ).bind(
            account.id,
            body.pilotName || 'Unknown',
            body.shipName || 'Scout',
            body.credits || 10000,
            body.turns || 50,
            body.currentSector || 1,
            body.shipType || 'scout',
            JSON.stringify(body.cargo || {}),
            JSON.stringify(body.equipment || {}),
            JSON.stringify(body.gameState || {}),
            body.shipVariant || 1
          ).run();
        } else {
          // Update existing
          await env.DB.prepare(
            'UPDATE adastra_players SET pilot_name = ?, ship_name = ?, credits = ?, turns = ?, current_sector = ?, ship_type = ?, cargo = ?, equipment = ?, game_state = ?, last_activity = ?, ship_variant = ? WHERE account_id = ?'
          ).bind(
            body.pilotName,
            body.shipName,
            body.credits,
            body.turns,
            body.currentSector,
            body.shipType,
            JSON.stringify(body.cargo || {}),
            JSON.stringify(body.equipment || {}),
            JSON.stringify(body.gameState || {}),
            now,
            body.shipVariant || 1,
            account.id
          ).run();
        }

        result = { success: true };
      }

      // Get multiplayer state
      else if (path === '/api/adastra/multiplayer' && request.method === 'GET') {
        const row = await env.DB.prepare('SELECT data FROM adastra_multiplayer ORDER BY id DESC LIMIT 1').first();
        result = row ? JSON.parse(row.data) : {};
      }

      // Update multiplayer state
      else if (path === '/api/adastra/multiplayer' && request.method === 'PUT') {
        const body = await request.json();
        const now = new Date().toISOString();
        await env.DB.prepare('DELETE FROM adastra_multiplayer').run();
        await env.DB.prepare('INSERT INTO adastra_multiplayer (data, updated_at) VALUES (?, ?)').bind(JSON.stringify(body), now).run();
        result = { success: true };
      }

      // Admin: Get all players
      else if (path === '/api/adastra/admin/players' && request.method === 'GET') {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');
        const account = await verifyToken(env, token);

        if (!account || !account.is_admin) {
          return new Response(JSON.stringify({ error: 'Admin access required' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const rows = await env.DB.prepare(
          'SELECT p.*, a.username, a.is_admin, a.last_login, a.created_at, a.is_banned FROM adastra_players p JOIN adastra_accounts a ON p.account_id = a.id ORDER BY p.last_activity DESC'
        ).all();

        const players = rows.results.map(row => ({
          username: row.username,
          pilotName: row.pilot_name,
          shipName: row.ship_name,
          credits: row.credits,
          turns: row.turns,
          currentSector: row.current_sector,
          shipType: row.ship_type,
          cargo: row.cargo ? JSON.parse(row.cargo) : {},
          equipment: row.equipment ? JSON.parse(row.equipment) : {},
          gameState: row.game_state ? JSON.parse(row.game_state) : {},
          lastActivity: row.last_activity,
          shipVariant: row.ship_variant,
          lastLogin: row.last_login,
          createdAt: row.created_at,
          isAdmin: !!row.is_admin,
          isBanned: !!row.is_banned
        }));

        result = { players };
      }

      // Admin: Get player by username
      else if (path.startsWith('/api/adastra/admin/player/') && request.method === 'GET') {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');
        const account = await verifyToken(env, token);

        if (!account || !account.is_admin) {
          return new Response(JSON.stringify({ error: 'Admin access required' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const username = path.split('/').pop();
        const row = await env.DB.prepare(
          'SELECT p.*, a.username, a.is_admin, a.last_login, a.created_at, a.is_banned FROM adastra_players p JOIN adastra_accounts a ON p.account_id = a.id WHERE a.username = ?'
        ).bind(username).first();

        if (!row) {
          return new Response(JSON.stringify({ error: 'Player not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        result = {
          username: row.username,
          pilotName: row.pilot_name,
          shipName: row.ship_name,
          credits: row.credits,
          turns: row.turns,
          currentSector: row.current_sector,
          shipType: row.ship_type,
          cargo: row.cargo ? JSON.parse(row.cargo) : {},
          equipment: row.equipment ? JSON.parse(row.equipment) : {},
          gameState: row.game_state ? JSON.parse(row.game_state) : {},
          lastActivity: row.last_activity,
          lastLogin: row.last_login,
          createdAt: row.created_at,
          isAdmin: !!row.is_admin,
          isBanned: !!row.is_banned
        };
      }

      // Admin: Update player
      else if (path.startsWith('/api/adastra/admin/player/') && !path.includes('/kick') && !path.includes('/ban') && request.method === 'PUT') {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');
        const account = await verifyToken(env, token);

        if (!account || !account.is_admin) {
          return new Response(JSON.stringify({ error: 'Admin access required' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const username = path.split('/').pop();
        const body = await request.json();

        // Get account ID and current game state
        const playerRow = await env.DB.prepare(
          'SELECT p.account_id, p.game_state FROM adastra_players p JOIN adastra_accounts a ON p.account_id = a.id WHERE a.username = ?'
        ).bind(username).first();

        if (!playerRow) {
          return new Response(JSON.stringify({ error: 'Player not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        let gameState = playerRow.game_state ? JSON.parse(playerRow.game_state) : {};

        // Build update
        const updates = [];
        const values = [];

        if ('credits' in body) { updates.push('credits = ?'); values.push(body.credits); }
        if ('turns' in body) { updates.push('turns = ?'); values.push(body.turns); }
        if ('currentSector' in body) { updates.push('current_sector = ?'); values.push(body.currentSector); }
        if ('shipName' in body) { updates.push('ship_name = ?'); values.push(body.shipName); }
        if ('shipType' in body) { updates.push('ship_type = ?'); values.push(body.shipType); }

        if ('hull' in body || 'fuel' in body) {
          if (!gameState.ship) gameState.ship = {};
          if ('hull' in body) gameState.ship.hull = body.hull;
          if ('fuel' in body) gameState.ship.fuel = body.fuel;
          updates.push('game_state = ?');
          values.push(JSON.stringify(gameState));
        } else if ('gameState' in body) {
          updates.push('game_state = ?');
          values.push(JSON.stringify(body.gameState));
        }

        if (updates.length > 0) {
          values.push(playerRow.account_id);
          await env.DB.prepare(`UPDATE adastra_players SET ${updates.join(', ')} WHERE account_id = ?`).bind(...values).run();
        }

        result = { success: true };
      }

      // Admin: Delete player
      else if (path.startsWith('/api/adastra/admin/player/') && !path.includes('/kick') && !path.includes('/ban') && request.method === 'DELETE') {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');
        const account = await verifyToken(env, token);

        if (!account || !account.is_admin) {
          return new Response(JSON.stringify({ error: 'Admin access required' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const username = path.split('/').pop();
        const accountRow = await env.DB.prepare('SELECT id FROM adastra_accounts WHERE username = ?').bind(username).first();

        if (!accountRow) {
          return new Response(JSON.stringify({ error: 'Player not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        await env.DB.prepare('DELETE FROM adastra_players WHERE account_id = ?').bind(accountRow.id).run();
        await env.DB.prepare('DELETE FROM adastra_sessions WHERE account_id = ?').bind(accountRow.id).run();
        await env.DB.prepare('DELETE FROM adastra_accounts WHERE id = ?').bind(accountRow.id).run();

        result = { success: true, message: `Player ${username} deleted` };
      }

      // Admin: Kick player
      else if (path.match(/\/api\/adastra\/admin\/player\/[^\/]+\/kick/) && request.method === 'POST') {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');
        const account = await verifyToken(env, token);

        if (!account || !account.is_admin) {
          return new Response(JSON.stringify({ error: 'Admin access required' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const parts = path.split('/');
        const username = parts[parts.length - 2];

        const accountRow = await env.DB.prepare('SELECT id FROM adastra_accounts WHERE username = ?').bind(username).first();
        if (accountRow) {
          await env.DB.prepare('DELETE FROM adastra_sessions WHERE account_id = ?').bind(accountRow.id).run();
        }

        result = { success: true, message: `Player ${username} kicked` };
      }

      // Admin: Ban/unban player
      else if (path.match(/\/api\/adastra\/admin\/player\/[^\/]+\/ban/) && request.method === 'POST') {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');
        const account = await verifyToken(env, token);

        if (!account || !account.is_admin) {
          return new Response(JSON.stringify({ error: 'Admin access required' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const parts = path.split('/');
        const username = parts[parts.length - 2];
        const body = await request.json();
        const isBanned = body.banned !== false;

        await env.DB.prepare('UPDATE adastra_accounts SET is_banned = ? WHERE username = ?').bind(isBanned ? 1 : 0, username).run();

        if (isBanned) {
          const accountRow = await env.DB.prepare('SELECT id FROM adastra_accounts WHERE username = ?').bind(username).first();
          if (accountRow) {
            await env.DB.prepare('DELETE FROM adastra_sessions WHERE account_id = ?').bind(accountRow.id).run();
          }
        }

        result = { success: true, message: `Player ${username} ${isBanned ? 'banned' : 'unbanned'}` };
      }

      // Admin: Reset galaxy
      else if (path === '/api/adastra/admin/reset-galaxy' && request.method === 'POST') {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');
        const account = await verifyToken(env, token);

        if (!account || !account.is_admin) {
          return new Response(JSON.stringify({ error: 'Admin access required' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Get settings
        const settings = {};
        const settingsRows = await env.DB.prepare('SELECT key, value FROM adastra_settings').all();
        settingsRows.results.forEach(row => { settings[row.key] = row.value; });

        const startingCredits = parseInt(settings.starting_credits || '10000');
        const startingTurns = parseInt(settings.starting_turns || '50');
        const startingSector = parseInt(settings.starting_sector || '1');

        await env.DB.prepare(
          "UPDATE adastra_players SET credits = ?, turns = ?, current_sector = ?, cargo = '{}', equipment = '{}', game_state = '{}' WHERE account_id IN (SELECT id FROM adastra_accounts WHERE is_admin = 0)"
        ).bind(startingCredits, startingTurns, startingSector).run();

        result = { success: true, message: 'Galaxy reset' };
      }

      // Admin: Get settings
      else if (path === '/api/adastra/admin/settings' && request.method === 'GET') {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');
        const account = await verifyToken(env, token);

        if (!account || !account.is_admin) {
          return new Response(JSON.stringify({ error: 'Admin access required' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const settings = {};
        const rows = await env.DB.prepare('SELECT key, value FROM adastra_settings').all();
        rows.results.forEach(row => { settings[row.key] = row.value; });

        result = {
          success: true,
          settings: {
            startingSector: parseInt(settings.starting_sector || '1'),
            startingCredits: parseInt(settings.starting_credits || '10000'),
            startingTurns: parseInt(settings.starting_turns || '50'),
            startingFuel: parseInt(settings.starting_fuel || '100'),
            startingHull: parseInt(settings.starting_hull || '100'),
            startingShields: parseInt(settings.starting_shields || '100')
          }
        };
      }

      // Admin: Update settings
      else if (path === '/api/adastra/admin/settings' && request.method === 'PUT') {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');
        const account = await verifyToken(env, token);

        if (!account || !account.is_admin) {
          return new Response(JSON.stringify({ error: 'Admin access required' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const body = await request.json();
        const keyMap = {
          startingSector: 'starting_sector',
          startingCredits: 'starting_credits',
          startingTurns: 'starting_turns',
          startingFuel: 'starting_fuel',
          startingHull: 'starting_hull',
          startingShields: 'starting_shields'
        };

        const updated = [];
        for (const [apiKey, dbKey] of Object.entries(keyMap)) {
          if (apiKey in body) {
            await env.DB.prepare('INSERT OR REPLACE INTO adastra_settings (key, value) VALUES (?, ?)').bind(dbKey, String(body[apiKey])).run();
            updated.push(apiKey);
          }
        }

        result = { success: true, updated };
      }

      // Admin: Get stats
      else if (path === '/api/adastra/admin/stats' && request.method === 'GET') {
        const token = request.headers.get('Authorization')?.replace('Bearer ', '');
        const account = await verifyToken(env, token);

        if (!account || !account.is_admin) {
          return new Response(JSON.stringify({ error: 'Admin access required' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const totalPlayers = (await env.DB.prepare('SELECT COUNT(*) as cnt FROM adastra_accounts WHERE is_admin = 0').first()).cnt;
        const activeSessions = (await env.DB.prepare('SELECT COUNT(DISTINCT account_id) as cnt FROM adastra_sessions').first()).cnt;
        const totalConnections = (await env.DB.prepare('SELECT COUNT(*) as cnt FROM adastra_sessions').first()).cnt;

        const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const recentlyActive = (await env.DB.prepare('SELECT COUNT(*) as cnt FROM adastra_players WHERE last_activity > ?').bind(tenMinAgo).first()).cnt;

        result = { totalPlayers, activeSessions, recentlyActive, totalConnections };
      }

      // 404 for unknown routes
      else {
        return new Response(JSON.stringify({ error: 'Not found', path }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  },

  // Scheduled task - runs daily to pre-generate puzzles
  async scheduled(event, env, ctx) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    console.log(`Generating puzzles for ${tomorrowStr}...`);

    try {
      await generateWordleWord(env, tomorrowStr);
      await generateConnections(env, tomorrowStr);
      await generateSpellingBee(env, tomorrowStr);
      await generateContexto(env, tomorrowStr);
      await generateBetween(env, tomorrowStr);
      await generatePhrase(env, tomorrowStr);
      console.log('All puzzles generated successfully!');
    } catch (e) {
      console.error('Puzzle generation failed:', e);
    }
  }
};
