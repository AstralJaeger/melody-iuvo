import { SlashCommandBuilder } from "discord.js";

import { Command } from "../interfaces/Command";
import { errorHandler } from "../utils/errorHandler";
import { getDatabaseRecord } from "../utils/getDatabaseRecord";

export const initiate: Command = {
  data: new SlashCommandBuilder()
    .setName("initiate")
    .setDMPermission(false)
    .setDescription("Nominate someone to be initiated into the coven.")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The user to initiate")
        .setRequired(true)
    ),
  run: async (bot, interaction) => {
    try {
      await interaction.deferReply({ ephemeral: true });
      const targetUser = interaction.options.getUser("target", true);
      const target =
        interaction.guild.members.cache.get(targetUser.id) ||
        (await interaction.guild.members.fetch(targetUser.id));

      if (!target) {
        await interaction.editReply({
          content:
            "Forgive me, but I cannot locate that member's records. Please try again later."
        });
        return;
      }

      const isInitiatied = interaction.member.roles.cache.has(
        bot.discord.roles.regular.id
      );
      if (!isInitiatied) {
        await interaction.editReply({
          content: "Only current coven members may nominate new initiates."
        });
        return;
      }

      const targetIsInitiated = target.roles.cache.has(
        bot.discord.roles.regular.id
      );

      if (targetIsInitiated) {
        await interaction.editReply({
          content: "They are already a member of our coven!"
        });
        return;
      }

      const record = await getDatabaseRecord(bot, target.id);
      const initiations = record.initiations;

      if (initiations.includes(interaction.user.id)) {
        await interaction.editReply({
          content: "You have already nominated this member for initiation."
        });
        return;
      }

      initiations.push(interaction.user.id);

      if (initiations.length < 3) {
        await bot.db.users.update({
          where: {
            userId: target.id
          },
          data: {
            initiations
          }
        });
        await interaction.editReply({
          content: "Your nomination has been logged."
        });
        return;
      }

      await target.roles.add(bot.discord.roles.regular);
      await bot.discord.channels.general.send(
        `## <:pentatrans:1169725148740472912> ${
          target.user.displayName || target.user.username
        } has been successfully initiated into the coven~! Make sure to use the \`/training\` command to complete your training! <:pentatrans:1169725148740472912>`
      );
      await interaction.editReply({
        content: "Your nomination has been logged."
      });

      await bot.db.users.update({
        where: {
          userId: target.id
        },
        data: {
          initiations: []
        }
      });
    } catch (err) {
      await errorHandler(bot, "initiate command", err);
    }
  }
};
