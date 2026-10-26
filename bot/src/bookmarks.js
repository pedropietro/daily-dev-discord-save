// Saves a post into the user's own bookmarks, inside a "From Discord" list when their plan supports lists.
import { DailyDevError } from './dailydev.js';

async function updateRecord(store, userId, patch) {
  const record = await store.get(userId);
  if (record) await store.set(userId, { ...record, ...patch });
}

/** Returns the list id to use, or null when lists are unavailable (non-Plus accounts). Cached per user. */
async function ensureList(client, store, userId, { name, icon }) {
  const record = await store.get(userId);
  if (record?.listUnsupported) return null;
  if (record?.listId) return record.listId;
  try {
    const existing = (await client.getBookmarkLists()).find((l) => l.name === name);
    const list = existing ?? (await client.createBookmarkList(name, icon));
    await updateRecord(store, userId, { listId: list.id });
    return list.id;
  } catch (err) {
    if (err instanceof DailyDevError && (err.status === 403 || err.status === 402)) {
      await updateRecord(store, userId, { listUnsupported: true });
      return null; // lists are a Plus feature: plain bookmark instead
    }
    throw err;
  }
}

/**
 * @returns {Promise<{ listId: string | null }>}
 */
export async function savePost(tokens, userId, postId, listConfig) {
  return tokens.withClient(userId, async (client) => {
    let listId = await ensureList(client, tokens.store, userId, listConfig);
    try {
      await client.addBookmarks([postId], listId ?? undefined);
    } catch (err) {
      // The cached list was deleted on daily.dev: forget it and try once more.
      if (!(listId && err instanceof DailyDevError && (err.status === 404 || err.status === 400))) throw err;
      await updateRecord(tokens.store, userId, { listId: undefined });
      listId = await ensureList(client, tokens.store, userId, listConfig);
      await client.addBookmarks([postId], listId ?? undefined);
    }
    return { listId };
  });
}

export async function recentSaves(tokens, userId, limit = 10) {
  const record = await tokens.store.get(userId);
  return tokens.withClient(userId, (client) => client.getBookmarks({ limit, listId: record?.listId }));
}
