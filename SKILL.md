---
name: save-to-daily-dev-discord
description: Sets up a Discord bot that adds a "Save to daily.dev" option to every message. Right-click a message with a link and the article lands in your own daily.dev bookmarks, in a "From Discord" list.
---

# Save to daily.dev (Discord)

Good links get shared in Discord every day and are gone from view a few scrolls later. This bot adds **Apps → Save to daily.dev** to every message. A member right-clicks a message with a link, the bot finds that article on daily.dev and bookmarks it in **their own** account, in a "From Discord" list (Plus accounts) or as a plain bookmark. The confirmation is visible only to them.

Every request runs as the Discord user who clicked, with their own daily.dev OAuth token. There is no shared token and nothing from the API is shown to anyone else.

You (the agent) help the bot owner deploy it from the source code and verify it works. You never post to Discord on anyone's behalf, and you only handle secrets by writing them into a local `.env` the owner asked you to create.

## Requirements

- Node.js 18.17+ and the bot source (the plugin's Link field points to the repository; the code lives in `bot/`).
- A **daily.dev OAuth app**: daily.dev → Settings → API → OAuth apps → Create app. Redirect URI: `<PUBLIC_BASE_URL>/oauth/callback`. Note the client ID and the client secret (shown once).
- A public **HTTPS** URL that reaches the bot's HTTP port.
- A Discord application with a bot user: bot token and application (client) ID.

The bot does **not** need a personal daily.dev access token. Do not put one in the configuration.

## How the bot uses daily.dev

| Step | Call | Token |
|---|---|---|
| `/dailydev connect` | OAuth authorization code + PKCE (S256), scopes `openid profile offline_access read write`, `resource=https://api.daily.dev/public/v1`. The callback refuses grants without `write`. | none yet |
| Link is a daily.dev post | `GET /posts/{id or slug}` | the clicker's own |
| Link is external | `GET /search/posts?q=<link preview title>`, then `?q=<words from the URL slug>`; a result is used only if its URL matches the link (scheme, `www`, tracking params and trailing slash ignored). Otherwise up to 5 candidates are offered privately. | the clicker's own |
| First save (Plus) | `GET /bookmarks/lists`, `POST /bookmarks/lists` `{ name: "From Discord", icon: "💬" }`; the list id is cached | the clicker's own |
| Save | `POST /bookmarks` `{ postIds: [id], listId }` | the clicker's own |
| `/dailydev saved` | `GET /bookmarks?listId=…&limit=10` | the clicker's own |
| `/dailydev disconnect` | delete stored tokens, `POST https://api.daily.dev/auth/oauth2/revoke` | client secret |

Writes are limited to adding bookmarks and creating that one list. Tokens are encrypted at rest (AES-256-GCM) and refresh tokens are rotated.

## Steps

1. **Check the environment.** `node -v` ≥ 18.17. In `bot/`: `npm install`, then `npm test`.
2. **Create the `.env`.** Copy `bot/.env.example` to `bot/.env`, ask the owner for each value, don't echo secrets back. `TOKEN_ENCRYPTION_KEY`: `openssl rand -base64 32`. `DISCORD_GUILD_ID` is optional but makes commands appear instantly.
3. **Expose the callback.** `<PUBLIC_BASE_URL>/healthz` must return `ok` from the internet, and `<PUBLIC_BASE_URL>/oauth/callback` must be registered exactly on the OAuth app.
4. **Invite the bot.** Discord developer portal → OAuth2 → URL Generator: scopes `bot` and `applications.commands`. No extra permissions and no privileged intents: the right-clicked message arrives with the interaction.
5. **Register the commands.** `npm run deploy-commands` (registers the "Save to daily.dev" message command and `/dailydev`).
6. **Run it.** `npm start`, or the included `Dockerfile` with a volume on `/app/data`.
7. **Test with the owner.** `/dailydev connect` → approve read and write → "daily.dev connected". Post a link to a well-known article, right-click it → Apps → Save to daily.dev → private "Saved … to your From Discord list". Check it appears under Bookmarks on daily.dev and in `/dailydev saved`. Try a message without a link and `/dailydev disconnect`.

## Output

Report: Node version, `npm test` result, public callback URL, registration mode, and whether connect, save, saved and disconnect worked. If a step fails, show the exact error and the fix.

## Guardrails

- Never configure a shared or personal daily.dev token.
- Never save a post that doesn't match the link; offer choices instead.
- Every reply is ephemeral. The bot never posts in channels, reads message history or needs the `MessageContent` intent.
- Quota: each user has their own allowance (free tier: 60 requests/minute, 200/month). A save costs 2–3 requests (lookup + bookmark; the list is created once). `/dailydev saved` costs 1.
- Don't commit `.env` or `data/`.
