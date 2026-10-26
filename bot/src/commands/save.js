// Message context menu: right-click a message → Apps → "Save to daily.dev".
import {
  ActionRowBuilder,
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { randomUUID } from 'node:crypto';
import { savePost } from '../bookmarks.js';
import { choiceOption, escapeLabel, postLink, truncate } from '../format.js';
import { t } from '../i18n.js';
import { resolvePost } from '../resolve.js';
import { NotConnectedError } from '../tokenManager.js';
import { connectRow, ephemeral, errorMessage, logUnexpected, PT } from './common.js';

export const NAME = 'Save to daily.dev';
export const PICK_PREFIX = 'dds:pick:';
const CHOICE_TTL_MS = 10 * 60 * 1000;

export const data = new ContextMenuCommandBuilder()
  .setName(NAME)
  .setNameLocalizations({ [PT]: 'Salvar no daily.dev' })
  .setType(ApplicationCommandType.Message);

/** choiceId -> { userId, posts, locale, expiresAt } */
const choices = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of choices) if (v.expiresAt < now) choices.delete(k);
}, 60 * 1000).unref();

function listName(listId, config) {
  return listId ? config.list.name : null;
}

/** Works for both a deferred reply and a deferred component update. */
async function saveAndReport(interaction, deps, post, s) {
  const { listId } = await savePost(deps.tokens, interaction.user.id, post.id, deps.config.list);
  const content = s.saved(escapeLabel(truncate(post.title || s.untitled, 150)), postLink(post), listName(listId, deps.config));
  return interaction.editReply({ content, components: [] });
}

export async function execute(interaction, deps) {
  const { tokens, oauth } = deps;
  const s = t(interaction.locale);
  const userId = interaction.user.id;
  // Everything is private: it is the clicking user's own bookmark.
  await interaction.deferReply(ephemeral);

  if (!(await tokens.isConnected(userId))) {
    await interaction.editReply({ content: s.notConnected, components: [connectRow(oauth.createAuthorization(userId).url, s)] });
    return;
  }

  try {
    const result = await tokens.withClient(userId, (client) => resolvePost(client, interaction.targetMessage));
    if (result.status === 'none') {
      await interaction.editReply(result.url ? s.notOnDailyDev(result.url) : s.noLink);
      return;
    }
    if (result.status === 'found') {
      await saveAndReport(interaction, deps, result.post, s);
      return;
    }
    // Ambiguous: let the user pick instead of guessing.
    const id = randomUUID().replaceAll('-', '').slice(0, 16);
    choices.set(id, { userId, posts: result.posts, locale: interaction.locale, expiresAt: Date.now() + CHOICE_TTL_MS });
    const menu = new StringSelectMenuBuilder()
      .setCustomId(PICK_PREFIX + id)
      .setPlaceholder(s.pickPlaceholder)
      .addOptions(result.posts.map((p) => choiceOption(p, s)));
    await interaction.editReply({ content: s.pickOne(result.url), components: [new ActionRowBuilder().addComponents(menu)] });
  } catch (err) {
    logUnexpected('[save]', err);
    const components = err instanceof NotConnectedError ? [connectRow(oauth.createAuthorization(userId).url, s)] : [];
    await interaction.editReply({ content: errorMessage(err, s), components });
  }
}

/** The select menu only exists in the user's own ephemeral reply, but we still check ownership. */
export async function handlePick(interaction, deps) {
  const id = interaction.customId.slice(PICK_PREFIX.length);
  const entry = choices.get(id);
  const s = t(entry?.locale ?? interaction.locale);
  if (!entry || entry.expiresAt < Date.now() || entry.userId !== interaction.user.id) {
    await interaction.update({ content: s.choiceExpired, components: [] });
    return;
  }
  const post = entry.posts.find((p) => p.id === interaction.values[0]);
  choices.delete(id);
  await interaction.deferUpdate();
  try {
    await saveAndReport(interaction, deps, post, s);
  } catch (err) {
    logUnexpected('[save pick]', err);
    await interaction.editReply({ content: errorMessage(err, s), components: [] });
  }
}
