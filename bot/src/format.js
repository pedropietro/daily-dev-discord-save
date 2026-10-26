// Pure formatting helpers (no discord.js imports) so they can be unit-tested.

const MAX_MESSAGE = 1900; // Discord limit is 2000

/** Escape characters that would break a Discord markdown link label. */
export function escapeLabel(text) {
  return String(text ?? '')
    .replace(/\s+/g, ' ')
    .replace(/([\\[\]()*_~`|>])/g, '\\$1')
    .trim();
}

export function truncate(text, max) {
  const s = String(text ?? '');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export function postLink(post) {
  return post.commentsPermalink || post.url || `https://app.daily.dev/posts/${post.id}`;
}

/** Select-menu option for an ambiguous match (Discord: label/description ≤ 100 chars). */
export function choiceOption(post, strings) {
  return {
    label: truncate(post.title || strings.untitled, 100),
    description: truncate([post.source?.name, post.url ? new URL(post.url).hostname : null].filter(Boolean).join(' · '), 100) || undefined,
    value: post.id,
  };
}

/** Private list of the user's own recent saves. */
export function buildSavedList(posts, listName, strings) {
  if (!posts.length) return strings.savedEmpty;
  let text = strings.savedList(listName);
  posts.forEach((p, i) => {
    const line = `\n${i + 1}. [${escapeLabel(truncate(p.title || strings.untitled, 120))}](<${postLink(p)}>)`;
    if (text.length + line.length <= MAX_MESSAGE) text += line;
  });
  return text;
}
