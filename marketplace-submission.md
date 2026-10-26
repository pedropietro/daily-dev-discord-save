# Submissão ao daily.dev Marketplace

## Name (3–60 caracteres)

Save to daily.dev for Discord

## Short description (até 300 caracteres)

Right-click any Discord message with a link and choose Save to daily.dev: the article lands in your own daily.dev bookmarks, in a From Discord list. Every member uses their own account.

## About (até 20.000 caracteres, SEM links nem imagens)

Good links get shared in Discord every day, and a few scrolls later they are gone. Save to daily.dev turns any of them into a bookmark you will actually find again.

How it works
- Link your daily.dev account once with /dailydev connect, through daily.dev OAuth.
- On any message with a link, open the message menu and choose Apps, then Save to daily.dev.
- The bot finds that article on daily.dev and adds it to your bookmarks, in a list called From Discord on Plus accounts or as a regular bookmark otherwise. Only you see the confirmation.
- /dailydev saved shows your latest saves, privately. /dailydev status and /dailydev disconnect manage the link.

Your own account, your own data
Every request runs with the daily.dev account of the person who clicked. There is no shared token, and nothing from the API is shown to anyone else: all replies are private. Disconnecting deletes your tokens from the bot and revokes them.

Finding the right post
Links to daily.dev posts are resolved exactly. For other links the bot searches daily.dev by the link preview title and by the words in the address, and saves a post only when its address matches the link. If it is not sure, it shows you up to five candidates to pick from, and if daily.dev has not indexed the article it tells you so. It never saves a post that does not match.

Permissions and limits
The bot asks for read and write access. Write is used only to add bookmarks and to create the From Discord list once. Each save uses your own daily.dev API allowance: on the free tier that is 60 requests per minute and 200 per month, and a save usually costs two or three requests. The bot needs no privileged Discord intents, does not read channel history and never posts in channels.

Language
English, with Brazilian Portuguese names and messages for members whose Discord app is set to Portuguese (Salvar no daily.dev, /dailydev conectar).

Setup
The server owner needs Node.js 18 or newer, a Discord application, a daily.dev OAuth app and a public HTTPS address for the sign-in callback. The included agent skill walks your coding agent through configuration, testing and deployment, locally or with the included Dockerfile.

## Link

https://github.com/pedropietro/daily-dev-discord-save
