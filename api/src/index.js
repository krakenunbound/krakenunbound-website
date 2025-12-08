// Kraken Arkade API - Cloudflare Worker
// Handles all game data operations via D1 database + Groq AI for puzzle generation

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

      else if (path === '/api/generate/all' && request.method === 'POST') {
        // Generate all puzzles for a date
        const body = await request.json();
        const date = body.date || new Date().toISOString().split('T')[0];
        const wordle = await generateWordleWord(env, date);
        const connections = await generateConnections(env, date);
        const spellingbee = await generateSpellingBee(env, date);
        result = { date, wordle, connections, spellingbee };
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

      // ===== BETWEEN (Abyssal Between) =====
      else if (path === '/api/between/daily' && request.method === 'GET') {
        const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
        const row = await env.DB.prepare('SELECT * FROM daily_between WHERE date = ?').bind(date).first();
        result = row || { error: 'No puzzle for this date' };
      }

      else if (path === '/api/between/score' && request.method === 'POST') {
        const body = await request.json();
        const { date, player_name, guesses, score } = body;
        await env.DB.prepare(
          'INSERT OR REPLACE INTO between_scores (date, player_name, guesses, score) VALUES (?, ?, ?, ?)'
        ).bind(date, player_name, guesses, score).run();
        result = { success: true };
      }

      // ===== PHRASE (Phrase Kraken) =====
      else if (path === '/api/phrase/daily' && request.method === 'GET') {
        const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
        const row = await env.DB.prepare('SELECT * FROM daily_phrases WHERE date = ?').bind(date).first();
        result = row || { error: 'No puzzle for this date' };
      }

      else if (path === '/api/phrase/score' && request.method === 'POST') {
        const body = await request.json();
        const { date, player_name, attempts, won, score } = body;
        await env.DB.prepare(
          'INSERT OR REPLACE INTO phrase_scores (date, player_name, attempts, won, score) VALUES (?, ?, ?, ?, ?)'
        ).bind(date, player_name, attempts, won ? 1 : 0, score).run();
        result = { success: true };
      }

      // ===== CONTEXTO (Abyssal Guess) =====
      else if (path === '/api/contexto/daily' && request.method === 'GET') {
        const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
        const row = await env.DB.prepare('SELECT * FROM daily_contexto WHERE date = ?').bind(date).first();
        result = row || { error: 'No puzzle for this date' };
      }

      else if (path === '/api/contexto/score' && request.method === 'POST') {
        const body = await request.json();
        const { date, player_name, guesses, solved } = body;
        await env.DB.prepare(
          'INSERT OR REPLACE INTO contexto_scores (date, player_name, guesses, solved) VALUES (?, ?, ?, ?)'
        ).bind(date, player_name, guesses, solved ? 1 : 0).run();
        result = { success: true };
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
      console.log('Puzzles generated successfully!');
    } catch (e) {
      console.error('Puzzle generation failed:', e);
    }
  }
};
