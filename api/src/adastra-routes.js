// Ad Astra API Routes - Copy this section into index.js before the "// 404 for unknown routes" line

      // ===== AD ASTRA =====
      else if (path === '/api/adastra/register' && request.method === 'POST') {
        const body = await request.json();
        const username = (body.username || '').trim();
        const password = body.password || '';
        if (!username || !password) return new Response(JSON.stringify({ error: 'Username and password required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        const existing = await env.DB.prepare('SELECT id FROM adastra_accounts WHERE username = ?').bind(username).first();
        if (existing) return new Response(JSON.stringify({ error: 'Username already exists' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(password));
        const passwordHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
        const createdAt = new Date().toISOString();
        const accountResult = await env.DB.prepare('INSERT INTO adastra_accounts (username, password_hash, created_at) VALUES (?, ?, ?)').bind(username, passwordHash, createdAt).run();
        const accountId = accountResult.meta.last_row_id;
        await env.DB.prepare('INSERT INTO adastra_players (account_id, pilot_name, ship_name) VALUES (?, ?, ?)').bind(accountId, '', '').run();
        const token = crypto.randomUUID() + crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 30*24*60*60*1000).toISOString();
        await env.DB.prepare('INSERT INTO adastra_sessions (account_id, token, created_at, expires_at) VALUES (?, ?, ?, ?)').bind(accountId, token, createdAt, expiresAt).run();
        result = { success: true, token, username };
      }
      else if (path === '/api/adastra/login' && request.method === 'POST') {
        const body = await request.json();
        const username = (body.username || '').trim();
        const password = body.password || '';
        if (!username || !password) return new Response(JSON.stringify({ error: 'Username and password required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(password));
        const passwordHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
        const account = await env.DB.prepare('SELECT id, is_admin, is_banned FROM adastra_accounts WHERE username = ? AND password_hash = ?').bind(username, passwordHash).first();
        if (!account) return new Response(JSON.stringify({ error: 'Invalid username or password' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        if (account.is_banned) return new Response(JSON.stringify({ error: 'Account is banned' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        await env.DB.prepare('UPDATE adastra_accounts SET last_login = ? WHERE id = ?').bind(new Date().toISOString(), account.id).run();
        const token = crypto.randomUUID() + crypto.randomUUID();
        const createdAt = new Date().toISOString();
        const expiresAt = new Date(Date.now() + 30*24*60*60*1000).toISOString();
        await env.DB.prepare('INSERT INTO adastra_sessions (account_id, token, created_at, expires_at) VALUES (?, ?, ?, ?)').bind(account.id, token, createdAt, expiresAt).run();
        result = { success: true, token, username, isAdmin: !!account.is_admin };
      }
      else if (path === '/api/adastra/player' && request.method === 'GET') {
        const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
        if (!token) return new Response(JSON.stringify({ error: 'No token provided' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        const session = await env.DB.prepare('SELECT account_id FROM adastra_sessions WHERE token = ?').bind(token).first();
        if (!session) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        const player = await env.DB.prepare('SELECT p.*, a.username, a.is_admin FROM adastra_players p JOIN adastra_accounts a ON p.account_id = a.id WHERE p.account_id = ?').bind(session.account_id).first();
        if (!player) return new Response(JSON.stringify({ error: 'Player not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        result = { username: player.username, pilotName: player.pilot_name, shipName: player.ship_name, credits: player.credits, turns: player.turns, currentSector: player.current_sector, shipType: player.ship_type, shipVariant: player.ship_variant || 1, cargo: JSON.parse(player.cargo || '{}'), equipment: JSON.parse(player.equipment || '{}'), gameState: JSON.parse(player.game_state || '{}'), isAdmin: !!player.is_admin };
      }
      else if (path === '/api/adastra/player' && request.method === 'PUT') {
        const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
        if (!token) return new Response(JSON.stringify({ error: 'No token provided' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        const session = await env.DB.prepare('SELECT account_id FROM adastra_sessions WHERE token = ?').bind(token).first();
        if (!session) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        const body = await request.json();
        await env.DB.prepare('UPDATE adastra_players SET pilot_name=?, ship_name=?, credits=?, turns=?, current_sector=?, ship_type=?, ship_variant=?, cargo=?, equipment=?, game_state=?, last_activity=? WHERE account_id=?').bind(body.pilotName || '', body.shipName || '', body.credits || 10000, body.turns || 50, body.currentSector || 1, body.shipType || 'Scout', body.shipVariant || 1, JSON.stringify(body.cargo || {}), JSON.stringify(body.equipment || {}), JSON.stringify(body.gameState || {}), new Date().toISOString(), session.account_id).run();
        result = { success: true };
      }
      else if (path === '/api/adastra/multiplayer' && request.method === 'GET') {
        const row = await env.DB.prepare('SELECT data FROM adastra_multiplayer ORDER BY id DESC LIMIT 1').first();
        result = row ? JSON.parse(row.data) : {};
      }
      else if (path === '/api/adastra/multiplayer' && request.method === 'PUT') {
        const body = await request.json();
        await env.DB.prepare('DELETE FROM adastra_multiplayer').run();
        await env.DB.prepare('INSERT INTO adastra_multiplayer (data, updated_at) VALUES (?, ?)').bind(JSON.stringify(body), new Date().toISOString()).run();
        result = { success: true };
      }
