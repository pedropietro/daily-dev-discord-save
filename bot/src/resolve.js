// Finds the daily.dev post behind a Discord message.
//
// Measured against real posts (Oct 2026): searching /search/posts by the URL itself found 0/10,
// by the URL slug 7/10, by the article title 10/10. So we search by the link-preview title first,
// then by slug, and only accept a result whose URL matches the link. Anything else becomes a
// choice for the user, never a silent guess.

const URL_RE = /https?:\/\/[^\s<>()]+[^\s<>().,!?:;'"]/gi;
const DAILY_DEV_HOSTS = new Set(['daily.dev', 'app.daily.dev', 'www.daily.dev']);
const TRACKING_PARAMS = /^(utm_\w+|ref|ref_src|source|fbclid|gclid|mc_cid|mc_eid)$/i;

/** Canonical form used to compare links: no scheme, no www, no tracking params, no trailing slash or hash. */
export function normalizeUrl(raw) {
  try {
    const u = new URL(raw);
    for (const key of [...u.searchParams.keys()]) if (TRACKING_PARAMS.test(key)) u.searchParams.delete(key);
    const query = u.searchParams.toString();
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    const path = decodeURIComponent(u.pathname).replace(/\/+$/, '');
    return `${host}${path}${query ? `?${query}` : ''}`;
  } catch {
    return null;
  }
}

/**
 * Links in a message, in order, with the link-preview title when Discord provided one.
 * @returns {{ url: string, title: string | null }[]}
 */
export function extractLinks(message) {
  const links = new Map();
  for (const m of String(message?.content ?? '').matchAll(URL_RE)) links.set(m[0], null);
  for (const e of message?.embeds ?? []) {
    const url = e?.url ?? e?.data?.url;
    if (!url) continue;
    links.set(url, e?.title ?? e?.data?.title ?? links.get(url) ?? null);
  }
  // Attach preview titles to content links that Discord normalised slightly differently.
  const byNorm = new Map([...links].map(([u, title]) => [normalizeUrl(u), title]));
  return [...links.keys()]
    .filter((u, i, all) => all.findIndex((x) => normalizeUrl(x) === normalizeUrl(u)) === i)
    .map((url) => ({ url, title: links.get(url) ?? byNorm.get(normalizeUrl(url)) ?? null }));
}

/** `app.daily.dev/posts/<id>` or `daily.dev/posts/<slug>` → the id or slug, else null. */
export function dailyDevPostRef(url) {
  try {
    const u = new URL(url);
    if (!DAILY_DEV_HOSTS.has(u.hostname.toLowerCase())) return null;
    const m = u.pathname.match(/^\/posts\/([^/?#]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  } catch {
    return null;
  }
}

/** Words from the last path segment, e.g. `/news/kafka-4-released.html` → "kafka 4 released". */
export function slugQuery(url) {
  try {
    const last = new URL(url).pathname.replace(/\/+$/, '').split('/').pop() ?? '';
    const words = last
      .replace(/\.(html?|php|aspx?)$/i, '')
      .replace(/-[0-9a-f]{8,}$/i, '')
      .split(/[-_+]+/)
      .filter((w) => w && !/^\d+$/.test(w));
    return words.length >= 2 ? words.join(' ') : null;
  } catch {
    return null;
  }
}

const sameLink = (post, norm) => Boolean(post?.url) && normalizeUrl(post.url) === norm;

/**
 * @param {import('./dailydev.js').DailyDevClient} client  bound to the requesting user's token
 * @param {object} message  discord.js Message (content + embeds)
 * @returns {Promise<
 *   | { status: 'found', post: object, url: string }
 *   | { status: 'choices', posts: object[], url: string }
 *   | { status: 'none', url: string | null }>}
 */
export async function resolvePost(client, message, { maxChoices = 5 } = {}) {
  const links = extractLinks(message);
  if (!links.length) return { status: 'none', url: null };

  // 1) A daily.dev link is exact: one request, no guessing.
  for (const { url } of links) {
    const ref = dailyDevPostRef(url);
    if (ref) {
      const post = await client.getPost(ref);
      if (post) return { status: 'found', post, url };
    }
  }

  // 2) First external link: title search, then slug search, accept only an exact URL match.
  const { url, title } = links.find((l) => !dailyDevPostRef(l.url)) ?? links[0];
  const norm = normalizeUrl(url);
  const seen = new Map();
  for (const query of [title, slugQuery(url)].filter(Boolean)) {
    const posts = await client.searchPosts(query.slice(0, 200), { limit: 10, time: 'all' });
    const hit = posts.find((p) => sameLink(p, norm));
    if (hit) return { status: 'found', post: hit, url };
    for (const p of posts) if (!seen.has(p.id)) seen.set(p.id, p);
  }

  const posts = [...seen.values()].slice(0, maxChoices);
  return posts.length ? { status: 'choices', posts, url } : { status: 'none', url };
}
