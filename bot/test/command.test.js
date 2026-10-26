import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApplicationCommandType, MessageFlags } from 'discord.js';
import * as save from '../src/commands/save.js';
import * as dailydev from '../src/commands/dailydev.js';

const config = { list: { name: 'From Discord', icon: '💬' } };
const oauth = { createAuthorization: (id) => ({ url: `https://api.daily.dev/auth/oauth2/authorize?u=${id}`, state: 's' }) };

function fakeTokens({ connected = ['alice'], client = {} } = {}) {
  const records = Object.fromEntries(connected.map((id) => [id, { username: id, connectedAt: new Date().toISOString() }]));
  const calls = [];
  return {
    calls,
    records,
    store: { get: async (id) => records[id] ?? null, set: async (id, r) => { records[id] = r; } },
    isConnected: async (id) => Boolean(records[id]),
    withClient: async (id, fn) => { calls.push(id); return fn(client); },
    disconnect: async (id) => { const had = Boolean(records[id]); delete records[id]; return had; },
  };
}

function apiClient({ search = [] } = {}) {
  const added = [];
  return {
    added,
    getPost: async () => null,
    searchPosts: async () => search,
    getBookmarkLists: async () => [],
    createBookmarkList: async (name) => ({ id: 'L1', name }),
    addBookmarks: async (ids, listId) => { added.push([ids, listId]); return []; },
    getBookmarks: async () => [{ id: 'p1', title: 'Saved one', commentsPermalink: 'https://daily.dev/posts/p1' }],
  };
}

function ctxInteraction({ user = 'alice', locale = 'en-US', message }) {
  const out = {};
  return {
    out,
    user: { id: user },
    locale,
    targetMessage: message,
    deferReply: async (o) => { out.deferred = o; },
    editReply: async (o) => { out.edit = o; },
  };
}

test('context menu is a Message command named "Save to daily.dev" with pt-BR name', () => {
  const json = save.data.toJSON();
  assert.equal(json.type, ApplicationCommandType.Message);
  assert.equal(json.name, 'Save to daily.dev');
  assert.equal(json.name_localizations['pt-BR'], 'Salvar no daily.dev');
  const subs = dailydev.data.toJSON().options.map((o) => [o.name, o.name_localizations?.['pt-BR']]);
  assert.deepEqual(subs, [['connect', 'conectar'], ['disconnect', 'desconectar'], ['status', undefined], ['saved', 'salvos']]);
});

test('unlinked user gets a private connect button and no API call', async () => {
  const tokens = fakeTokens();
  const i = ctxInteraction({ user: 'bob', message: { content: 'https://x.dev/a-b-c', embeds: [] } });
  await save.execute(i, { tokens, oauth, config });
  assert.equal(i.out.deferred.flags, MessageFlags.Ephemeral);
  assert.match(i.out.edit.content, /Connect your daily\.dev account/);
  assert.deepEqual(tokens.calls, []);
});

test('exact match is saved to the user\'s own "From Discord" list, privately, in pt-BR', async () => {
  const post = { id: 'p9', title: 'Kafka 4 released', url: 'https://blog.example.com/kafka-4-released', commentsPermalink: 'https://daily.dev/posts/p9' };
  const client = apiClient({ search: [post] });
  const tokens = fakeTokens({ client });
  const i = ctxInteraction({
    locale: 'pt-BR',
    message: { content: 'https://blog.example.com/kafka-4-released', embeds: [{ url: 'https://blog.example.com/kafka-4-released', title: 'Kafka 4 released' }] },
  });
  await save.execute(i, { tokens, oauth, config });
  assert.deepEqual(client.added, [[['p9'], 'L1']]);
  assert.equal(i.out.deferred.flags, MessageFlags.Ephemeral);
  assert.match(i.out.edit.content, /salvo na sua lista \*\*From Discord\*\*/);
  assert.deepEqual(tokens.calls.every((id) => id === 'alice'), true);
});

test('ambiguous match shows a private select menu; only the owner can pick', async () => {
  const near = [{ id: 'a', title: 'Close one', url: 'https://other.dev/1', source: { name: 'Other' } }];
  const client = apiClient({ search: near });
  const tokens = fakeTokens({ client });
  const i = ctxInteraction({ message: { content: 'https://blog.example.com/kafka-four-released', embeds: [] } });
  await save.execute(i, { tokens, oauth, config });
  const menu = i.out.edit.components[0].components[0];
  assert.match(i.out.edit.content, /couldn't match/);
  assert.deepEqual(menu.options.map((o) => o.data.value), ['a']);

  const stranger = { customId: menu.data.custom_id, user: { id: 'mallory' }, values: ['a'], locale: 'en-US', update: async (o) => { stranger.out = o; } };
  await save.handlePick(stranger, { tokens, oauth, config });
  assert.match(stranger.out.content, /expired/);
  assert.deepEqual(client.added, []);
});

test('message without links or unknown article', async () => {
  const tokens = fakeTokens({ client: apiClient() });
  const a = ctxInteraction({ message: { content: 'hello', embeds: [] } });
  await save.execute(a, { tokens, oauth, config });
  assert.equal(a.out.edit, 'That message has no link to save.');
  const b = ctxInteraction({ message: { content: 'https://golang.ch/?p=1295', embeds: [] } });
  await save.execute(b, { tokens, oauth, config });
  assert.match(b.out.edit, /couldn't find/);
});

test('/dailydev saved lists the user\'s own saves privately', async () => {
  const tokens = fakeTokens({ client: apiClient() });
  tokens.records.alice.listId = 'L1';
  const out = {};
  const i = {
    user: { id: 'alice' }, locale: 'en-US', options: { getSubcommand: () => 'saved' },
    deferReply: async (o) => { out.deferred = o; }, editReply: async (o) => { out.edit = o; },
  };
  await dailydev.execute(i, { tokens, oauth, config });
  assert.equal(out.deferred.flags, MessageFlags.Ephemeral);
  assert.match(out.edit, /latest saves in \*\*From Discord\*\*/);
  assert.match(out.edit, /\[Saved one\]/);
});
