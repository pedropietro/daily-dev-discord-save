import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DailyDevError } from '../src/dailydev.js';
import { savePost } from '../src/bookmarks.js';

const LIST = { name: 'From Discord', icon: '💬' };

function setup({ lists = [], createError, addErrorOnce } = {}) {
  const records = { u: { accessToken: 'AT' } };
  const calls = [];
  let addFailed = false;
  const client = {
    getBookmarkLists: async () => (calls.push('getLists'), lists),
    createBookmarkList: async (name, icon) => {
      calls.push(`create:${name}:${icon}`);
      if (createError) throw createError;
      return { id: 'L-new', name };
    },
    addBookmarks: async (ids, listId) => {
      calls.push(`add:${ids.join(',')}:${listId ?? '-'}`);
      if (addErrorOnce && !addFailed) { addFailed = true; throw addErrorOnce; }
      return [{ postId: ids[0], listId: listId ?? null }];
    },
  };
  const tokens = {
    store: { get: async (id) => records[id] ?? null, set: async (id, r) => { records[id] = r; } },
    withClient: async (id, fn) => fn(client),
  };
  return { tokens, calls, records };
}

test('creates the "From Discord" list once, then reuses the cached id', async () => {
  const { tokens, calls, records } = setup();
  assert.deepEqual(await savePost(tokens, 'u', 'p1', LIST), { listId: 'L-new' });
  assert.deepEqual(await savePost(tokens, 'u', 'p2', LIST), { listId: 'L-new' });
  assert.deepEqual(calls, ['getLists', 'create:From Discord:💬', 'add:p1:L-new', 'add:p2:L-new']);
  assert.equal(records.u.listId, 'L-new');
  assert.equal(records.u.accessToken, 'AT', 'token fields are preserved');
});

test('reuses an existing list with the same name', async () => {
  const { tokens, calls } = setup({ lists: [{ id: 'L-old', name: 'From Discord' }] });
  await savePost(tokens, 'u', 'p1', LIST);
  assert.deepEqual(calls, ['getLists', 'add:p1:L-old']);
});

test('non-Plus accounts (lists forbidden) get a plain bookmark and are not asked again', async () => {
  const { tokens, calls, records } = setup({ createError: new DailyDevError('plus only', 403) });
  assert.deepEqual(await savePost(tokens, 'u', 'p1', LIST), { listId: null });
  await savePost(tokens, 'u', 'p2', LIST);
  assert.deepEqual(calls, ['getLists', 'create:From Discord:💬', 'add:p1:-', 'add:p2:-']);
  assert.equal(records.u.listUnsupported, true);
});

test('a list deleted on daily.dev is recreated and the save retried once', async () => {
  const { tokens, calls, records } = setup({ addErrorOnce: new DailyDevError('gone', 404) });
  records.u.listId = 'L-deleted';
  assert.deepEqual(await savePost(tokens, 'u', 'p1', LIST), { listId: 'L-new' });
  assert.deepEqual(calls, ['add:p1:L-deleted', 'getLists', 'create:From Discord:💬', 'add:p1:L-new']);
});

test('other errors propagate (e.g. quota)', async () => {
  const { tokens } = setup({ addErrorOnce: new DailyDevError('quota', 429) });
  await assert.rejects(savePost(tokens, 'u', 'p1', LIST), (e) => e.status === 429);
});
