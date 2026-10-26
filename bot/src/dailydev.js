// Minimal daily.dev public API client. One instance per request, bound to ONE user's OAuth access token.
// The token is only ever sent to this fixed host — never build the base URL from user input.
const BASE_URL = 'https://api.daily.dev/public/v1';
const TIMEOUT_MS = 8000;

export class DailyDevError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'DailyDevError';
    this.status = status;
    this.code = code;
  }
}

export class DailyDevClient {
  constructor(token, { fetchImpl = globalThis.fetch } = {}) {
    if (!token) throw new Error('daily.dev token is required');
    this.token = token;
    this.fetch = fetchImpl;
  }

  async #request(method, path, { params = {}, body } = {}, { retryOn429 = true } = {}) {
    const url = new URL(BASE_URL + path);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    }
    const headers = { Authorization: `Bearer ${this.token}`, Accept: 'application/json' };
    if (body !== undefined) headers['content-type'] = 'application/json';

    const res = await this.fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (res.status === 429 && retryOn429) {
      const waitSec = Math.min(Number(res.headers.get('retry-after')) || 2, 5);
      await new Promise((r) => setTimeout(r, waitSec * 1000));
      return this.#request(method, path, { params, body }, { retryOn429: false });
    }
    if (res.ok) return res.status === 204 ? {} : res.json();

    const err = await res.json().catch(() => ({}));
    const messages = {
      401: 'daily.dev access token is invalid or expired.',
      403: 'daily.dev refused the request (missing permission or Plus-only feature).',
      404: 'Not found on daily.dev.',
      429: 'daily.dev rate limit or monthly quota reached.',
    };
    throw new DailyDevError(messages[res.status] ?? `daily.dev API error (HTTP ${res.status}).`, res.status, err.error);
  }

  /** Keyword search over all posts. */
  async searchPosts(query, { limit = 10, time = 'all' } = {}) {
    const body = await this.#request('GET', '/search/posts', { params: { q: query, limit, time } });
    return body.data ?? [];
  }

  /** Accepts a post id or a daily.dev slug (`my-title-abc123`). Returns null when not found. */
  async getPost(idOrSlug) {
    try {
      return (await this.#request('GET', `/posts/${encodeURIComponent(idOrSlug)}`)).data ?? null;
    } catch (err) {
      if (err instanceof DailyDevError && err.status === 404) return null;
      throw err;
    }
  }

  async getBookmarkLists() {
    return (await this.#request('GET', '/bookmarks/lists')).data ?? [];
  }

  async createBookmarkList(name, icon) {
    return (await this.#request('POST', '/bookmarks/lists', { body: { name, icon } })).data;
  }

  /** listId is honoured for Plus users and ignored by the API otherwise. */
  async addBookmarks(postIds, listId) {
    const body = await this.#request('POST', '/bookmarks/', { body: listId ? { postIds, listId } : { postIds } });
    return body.data ?? [];
  }

  async getBookmarks({ limit = 10, listId } = {}) {
    return (await this.#request('GET', '/bookmarks/', { params: { limit, listId } })).data ?? [];
  }
}
