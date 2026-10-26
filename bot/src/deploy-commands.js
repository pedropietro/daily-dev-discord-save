// Registers the message context menu and the /dailydev command. Run once, and again after changing them.
import { REST, Routes } from 'discord.js';
import { loadConfig } from './config.js';
import { data as saveCommand } from './commands/save.js';
import { data as dailydevCommand } from './commands/dailydev.js';

const config = loadConfig({ requireRuntime: false });
const rest = new REST().setToken(config.discordToken);
const body = [saveCommand.toJSON(), dailydevCommand.toJSON()];

const route = config.discordGuildId
  ? Routes.applicationGuildCommands(config.discordClientId, config.discordGuildId)
  : Routes.applicationCommands(config.discordClientId);

try {
  await rest.put(route, { body });
  console.log(
    config.discordGuildId
      ? `Registered "Save to daily.dev" and /dailydev in guild ${config.discordGuildId} (available now).`
      : 'Registered "Save to daily.dev" and /dailydev globally (may take up to 1 hour to appear).',
  );
} catch (err) {
  console.error('Failed to register commands:', err);
  process.exit(1);
}
