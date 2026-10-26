import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyDevPostRef, extractLinks, normalizeUrl, resolvePost, slugQuery } from '../src/resolve.js';

test('normalizeUrl ignores scheme, www, tracking params, trailing slash and hash', () => {
  assert.equal(
    normalizeUrl('https://www.InfoQ.com/news/2026/07/sitar/?utm_source=x&ref=hn#top'),
    normalizeUrl('http://infoq.com/news/2026/07/sitar'),
  );
  assert.notEqual(normalizeUrl('https://a.dev/p?id=1'), normalizeUrl('https://a.dev/p?id=2'));
  assert.equal(normalizeUrl('not a url'), null);
});

test('extractLinks reads content and embeds, keeps preview titles, dedupes', () => {
  const links = extractLinks({
    content: 'look (https://blog.example.com/kafka-4-released/) and https://x.dev/a.',
    embeds: [{ url: 'https://blog.example.com/kafka-4-released', title: 'Kafka 4 released' }],
  });
  assert.deepEqual(links, [
    { url: 'https://blog.example.com/kafka-4-released/', title: 'Kafka 4 released' },
    { url: 'https://x.dev/a', title: null },
  ]);
});

test('dailyDevPostRef recognises daily.dev post links only', () => {
  assert.equal(dailyDevPostRef('https://app.daily.dev/posts/b7eKZAZNV'), 'b7eKZAZNV');
  assert.equal(dailyDevPostRef('https://daily.dev/posts/tempo-3-1-release-b7ekzaznv?x=1'), 'tempo-3-1-release-b7ekzaznv');
  assert.equal(dailyDevPostRef('https://daily.dev/squads/java'), null);
  assert.equal(dailyDevPostRef('https://evil.dev/posts/abc'), null);
});

test('slugQuery turns the last path segment into words', () => {
  assert.equal(slugQuery('https://dzone.com/articles/dmn-13-temporal-feel-expressions'), 'dmn temporal feel expressions');
  assert.equal(slugQuery('https://x.dev/news/kafka-4-released.html'), 'kafka released');
  assert.equal(slugQuery('https://golang.ch/?p=1295'), null);
});

function fakeClient({ posts = {}, search = {} } = {}) {
  const calls = [];
  return {
    calls,
    getPost: async (ref) => (calls.push(['getPost', ref]), posts[ref] ?? null),
    searchPosts: async (q) => (calls.push(['search', q]), search[q] ?? []),
  };
}

test('a daily.dev link resolves with one getPost and no search', async () => {
  const client = fakeClient({ posts: { abc: { id: 'abc', title: 'T' } } });
  const r = await resolvePost(client, { content: 'https://app.daily.dev/posts/abc', embeds: [] });
  assert.equal(r.status, 'found');
  assert.deepEqual(client.calls, [['getPost', 'abc']]);
});

test('external link: title search first, accepted only on exact URL match', async () => {
  const target = { id: 'p1', title: 'Kafka 4 released', url: 'https://blog.example.com/kafka-4-released?utm_source=dd' };
  const client = fakeClient({ search: { 'Kafka 4 released': [{ id: 'x', url: 'https://other.dev/kafka' }, target] } });
  const r = await resolvePost(client, {
    content: 'https://blog.example.com/kafka-4-released',
    embeds: [{ url: 'https://blog.example.com/kafka-4-released', title: 'Kafka 4 released' }],
  });
  assert.equal(r.status, 'found');
  assert.equal(r.post.id, 'p1');
  assert.equal(client.calls.length, 1, 'stops after the first exact match');
});

test('falls back to slug search, then offers choices instead of guessing', async () => {
  const near = [{ id: 'a', url: 'https://other.dev/one' }, { id: 'b', url: 'https://other.dev/two' }];
  const client = fakeClient({ search: { 'kafka four released': near } });
  const r = await resolvePost(client, { content: 'https://blog.example.com/kafka-four-released', embeds: [] });
  assert.equal(r.status, 'choices');
  assert.deepEqual(r.posts.map((p) => p.id), ['a', 'b']);
  assert.deepEqual(client.calls, [['search', 'kafka four released']]);
});

test('no link or nothing found', async () => {
  assert.equal((await resolvePost(fakeClient(), { content: 'no links here', embeds: [] })).status, 'none');
  const r = await resolvePost(fakeClient(), { content: 'https://golang.ch/?p=1295', embeds: [] });
  assert.deepEqual(r, { status: 'none', url: 'https://golang.ch/?p=1295' });
});
