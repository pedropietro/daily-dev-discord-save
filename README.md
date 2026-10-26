# Save to daily.dev for Discord

Right-click any Discord message with a link → **Apps → Save to daily.dev**. The bot finds the article on daily.dev and bookmarks it in **your own** account, in a "From Discord" list (Plus) or as a plain bookmark. Only you see the confirmation.

```
/dailydev connect      → link your daily.dev account (once, OAuth read + write)
Apps → Save to daily.dev  (message right-click menu)
/dailydev saved        → your latest saves, privately
/dailydev status | /dailydev disconnect
```

pt-BR clients see **Salvar no daily.dev**, `/dailydev conectar`, `/dailydev salvos`, `/dailydev desconectar` and Portuguese replies.

Sister project of [daily-dev-discord-search](https://github.com/pedropietro/daily-dev-discord-search); same OAuth, storage and i18n patterns.

## How a link is matched

1. **daily.dev link** (`app.daily.dev/posts/<id>` or `daily.dev/posts/<slug>`): `GET /posts/{ref}`, exact.
2. **External link**: search by the link-preview title Discord shows, then by the words in the URL slug. A result is accepted **only if its URL matches** the link (ignoring scheme, `www`, tracking params, trailing slash).
3. Otherwise the user gets up to 5 candidates in a private menu, or "not on daily.dev".

Why: in tests against real posts, searching by the URL itself found 0/10, by slug 7/10 and by title 10/10. With link previews the resolver found 4/5 real Discord-style messages exactly; the 5th (a site whose pages all share one title) became a choice instead of a wrong save.

## Structure

```
bot/src/
├── index.js               Discord client + OAuth callback server
├── commands/save.js       "Save to daily.dev" message command + candidate picker
├── commands/dailydev.js   /dailydev connect | disconnect | status | saved
├── commands/common.js     shared buttons and error messages
├── resolve.js             link extraction, URL normalisation, post matching
├── bookmarks.js           "From Discord" list (created once, cached), save, recent saves
├── oauth.js               PKCE S256, state, code exchange, refresh rotation, revoke (scope read+write)
├── tokenStore.js          per-user tokens, AES-256-GCM, atomic writes
├── tokenManager.js        valid token per user, single-flight refresh, retry on 401
├── server.js              GET /oauth/callback (requires read+write), GET /healthz
├── dailydev.js            Public API client (token only ever sent to api.daily.dev)
└── format.js, i18n.js, config.js, deploy-commands.js
```

## Running

1. Node.js 18.17+. In `bot/`: `npm install && npm test`
2. daily.dev → Settings → API → OAuth apps → Create app, redirect URI `https://<your-host>/oauth/callback`.
3. `cp .env.example .env` and fill in Discord token/client ID, `DAILY_DEV_CLIENT_ID/SECRET`, `PUBLIC_BASE_URL`, `TOKEN_ENCRYPTION_KEY` (`openssl rand -base64 32`).
4. Invite the bot: OAuth2 → URL Generator → scopes `bot` + `applications.commands`.
5. `npm run deploy-commands`, then `npm start` — or:
   ```bash
   docker build -t dd-save bot/
   docker run --env-file bot/.env -p 3000:3000 -v dd-save-data:/app/data dd-save
   ```

For local testing, `cloudflared tunnel --url http://localhost:3000` gives you an HTTPS `PUBLIC_BASE_URL`.

## Design notes

- **Per-user tokens only**; unlinked users get a private Connect button and no API call is made.
- **Everything is ephemeral.** The bot never posts in channels and needs no privileged intents.
- **Write is narrow:** add bookmarks, create one list. The callback rejects grants without `write`.
- **Quota:** 2–3 requests per save (1–2 lookups + 1 bookmark; list creation once). Free tier: 60/min, 200/month.
- **Single process:** OAuth state, picker choices and the token file live in one process; use Redis/a database for replicas.
