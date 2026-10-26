// English by default; Brazilian Portuguese for users whose Discord client is set to pt-BR.

const en = {
  untitled: 'Untitled',
  notConnected:
    'Connect your daily.dev account first. Saves go to **your own** bookmarks and use your own API allowance (free tier: 60 requests/min, 200/month).',
  connectButton: 'Connect daily.dev',
  connectPrompt:
    'Click below to sign in to daily.dev and approve **read and write** access (write is only used to add bookmarks). The link works once and expires in 10 minutes.',
  alreadyConnected: (who) => `You are already connected${who ? ` as **${who}**` : ''}. Use \`/dailydev disconnect\` to unlink.`,
  disconnected:
    'Disconnected. Your tokens were deleted from this bot and revoked. You can also remove the app under daily.dev → Settings → API → Connected apps.',
  notLinked: 'You have no daily.dev account connected to this bot.',
  status: (who, since, list) =>
    `Connected${who ? ` as **${who}**` : ''} since ${since}. ${list ? `Saves go to your **${list}** list.` : 'Saves go to your bookmarks.'}`,
  noLink: 'That message has no link to save.',
  saved: (title, url, list) => `🔖 Saved **[${title}](<${url}>)** to ${list ? `your **${list}** list` : 'your bookmarks'} on daily.dev.`,
  notOnDailyDev: (url) =>
    `I couldn't find <${url}> on daily.dev. Only articles daily.dev has indexed can be bookmarked.`,
  pickOne: (url) => `I couldn't match <${url}> exactly. Is it one of these? Pick one to save it, or ignore this message.`,
  pickPlaceholder: 'Choose the post to save',
  choiceExpired: 'This choice expired. Run Save to daily.dev on the message again.',
  savedList: (list) => `🔖 Your latest saves${list ? ` in **${list}**` : ''}:`,
  savedEmpty: 'Nothing saved yet. Right-click a message with a link → Apps → Save to daily.dev.',
  rateLimited:
    '⚠️ daily.dev rate limit or monthly allowance reached for your account (free tier: 60/min, 200/month). Try again later.',
  forbidden: '⚠️ daily.dev refused the save. Run `/dailydev connect` again and keep write access ticked.',
  timeout: '⚠️ daily.dev took too long to answer. Try again.',
  genericError: '⚠️ Could not reach daily.dev right now. Try again in a moment.',
  reconnect: 'Your daily.dev session expired or was revoked. Run `/dailydev connect` again.',
};

const ptBR = {
  untitled: 'Sem título',
  notConnected:
    'Conecte primeiro a sua conta do daily.dev. Os links vão para os **seus** bookmarks e usam a sua própria cota da API (plano gratuito: 60 requisições/min, 200/mês).',
  connectButton: 'Conectar daily.dev',
  connectPrompt:
    'Clique abaixo para entrar no daily.dev e aprovar acesso de **leitura e escrita** (a escrita só é usada para adicionar bookmarks). O link vale uma vez e expira em 10 minutos.',
  alreadyConnected: (who) => `Você já está conectado${who ? ` como **${who}**` : ''}. Use \`/dailydev desconectar\` para desvincular.`,
  disconnected:
    'Desconectado. Seus tokens foram apagados deste bot e revogados. Você também pode remover o app em daily.dev → Settings → API → Connected apps.',
  notLinked: 'Você não tem conta do daily.dev conectada a este bot.',
  status: (who, since, list) =>
    `Conectado${who ? ` como **${who}**` : ''} desde ${since}. ${list ? `Os links vão para a sua lista **${list}**.` : 'Os links vão para os seus bookmarks.'}`,
  noLink: 'Essa mensagem não tem link para salvar.',
  saved: (title, url, list) => `🔖 **[${title}](<${url}>)** salvo ${list ? `na sua lista **${list}**` : 'nos seus bookmarks'} do daily.dev.`,
  notOnDailyDev: (url) =>
    `Não encontrei <${url}> no daily.dev. Só dá para salvar artigos que o daily.dev indexou.`,
  pickOne: (url) => `Não achei <${url}> com exatidão. É um destes? Escolha um para salvar ou ignore esta mensagem.`,
  pickPlaceholder: 'Escolha o post para salvar',
  choiceExpired: 'Essa escolha expirou. Use Salvar no daily.dev na mensagem de novo.',
  savedList: (list) => `🔖 Seus últimos links salvos${list ? ` em **${list}**` : ''}:`,
  savedEmpty: 'Nada salvo ainda. Clique com o botão direito numa mensagem com link → Apps → Salvar no daily.dev.',
  rateLimited:
    '⚠️ Você atingiu o limite de requisições ou a cota mensal da sua conta no daily.dev (plano gratuito: 60/min, 200/mês). Tente mais tarde.',
  forbidden: '⚠️ O daily.dev recusou salvar. Rode `/dailydev conectar` de novo e mantenha a permissão de escrita marcada.',
  timeout: '⚠️ O daily.dev demorou para responder. Tente novamente.',
  genericError: '⚠️ Não consegui falar com o daily.dev agora. Tente novamente em instantes.',
  reconnect: 'Sua sessão do daily.dev expirou ou foi revogada. Rode `/dailydev conectar` de novo.',
};

/** @param {string | undefined} locale  Discord interaction.locale, e.g. 'pt-BR', 'en-US' */
export function t(locale) {
  return locale === 'pt-BR' ? ptBR : en;
}

export const STRINGS = { en, ptBR };
