// /dailydev connect | disconnect | status | saved   (all replies are ephemeral)
import { SlashCommandBuilder } from 'discord.js';
import { recentSaves } from '../bookmarks.js';
import { buildSavedList } from '../format.js';
import { t } from '../i18n.js';
import { connectRow, ephemeral, errorMessage, logUnexpected, PT } from './common.js';

export const data = new SlashCommandBuilder()
  .setName('dailydev')
  .setDescription('Link your daily.dev account to save links from Discord')
  .setDescriptionLocalizations({ [PT]: 'Vincule a sua conta do daily.dev para salvar links do Discord' })
  .addSubcommand((sub) =>
    sub
      .setName('connect')
      .setNameLocalizations({ [PT]: 'conectar' })
      .setDescription('Link your daily.dev account')
      .setDescriptionLocalizations({ [PT]: 'Vincula a sua conta do daily.dev' }),
  )
  .addSubcommand((sub) =>
    sub
      .setName('disconnect')
      .setNameLocalizations({ [PT]: 'desconectar' })
      .setDescription('Unlink your daily.dev account and delete your tokens')
      .setDescriptionLocalizations({ [PT]: 'Desvincula a sua conta do daily.dev e apaga seus tokens' }),
  )
  .addSubcommand((sub) =>
    sub
      .setName('status')
      .setDescription('Show whether your daily.dev account is connected')
      .setDescriptionLocalizations({ [PT]: 'Mostra se a sua conta do daily.dev está conectada' }),
  )
  .addSubcommand((sub) =>
    sub
      .setName('saved')
      .setNameLocalizations({ [PT]: 'salvos' })
      .setDescription('Show your latest saves (only you see them)')
      .setDescriptionLocalizations({ [PT]: 'Mostra seus últimos links salvos (só você vê)' }),
  );

export async function execute(interaction, deps) {
  const sub = interaction.options.getSubcommand();
  const s = t(interaction.locale);
  const { tokens, oauth, config } = deps;
  const userId = interaction.user.id;

  if (sub === 'connect') {
    const record = await tokens.store.get(userId);
    if (record) return interaction.reply({ content: s.alreadyConnected(record.username), ...ephemeral });
    const { url } = oauth.createAuthorization(userId);
    return interaction.reply({ content: s.connectPrompt, components: [connectRow(url, s)], ...ephemeral });
  }

  if (sub === 'disconnect') {
    await interaction.deferReply(ephemeral);
    return interaction.editReply((await tokens.disconnect(userId)) ? s.disconnected : s.notLinked);
  }

  if (sub === 'status') {
    const record = await tokens.store.get(userId);
    if (!record) return interaction.reply({ content: s.notLinked, ...ephemeral });
    const since = record.connectedAt ? `<t:${Math.floor(Date.parse(record.connectedAt) / 1000)}:D>` : '—';
    return interaction.reply({ content: s.status(record.username, since, record.listId ? config.list.name : null), ...ephemeral });
  }

  // saved
  await interaction.deferReply(ephemeral);
  const record = await tokens.store.get(userId);
  if (!record) {
    return interaction.editReply({ content: s.notConnected, components: [connectRow(oauth.createAuthorization(userId).url, s)] });
  }
  try {
    const posts = await recentSaves(tokens, userId, 10);
    return interaction.editReply(buildSavedList(posts, record.listId ? config.list.name : null, s));
  } catch (err) {
    logUnexpected('[saved]', err);
    return interaction.editReply(errorMessage(err, s));
  }
}
