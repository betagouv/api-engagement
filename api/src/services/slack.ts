import { SLACK_TOKEN } from "@/config";

type Message = { title?: string; text: string; author_name?: string; color?: string };

const logMessage = ({ title, text, author_name, color }: Message, channelId: string) => {
  console.log(`---- SLACK ----`);
  console.log(`title: ${title}`);
  console.log(`text: ${text}`);
  console.log(`author_name: ${author_name || "none"}`);
  console.log(`color: ${color || "none"}`);
  console.log(`channelId: ${channelId || "none"}`);
  console.log(`---- SLACK ----`);
};

export const postMessage = async ({ title, text, author_name, color, blocks }: Message & { blocks?: unknown[] }, channelId: string) => {
  // Comme Brevo sans clé : sans token ou sans channel configuré pour l'environnement, on journalise au lieu d'envoyer.
  if (!SLACK_TOKEN || !channelId) {
    logMessage({ title, text, author_name, color }, channelId);
    return { ok: true };
  }

  const url = `https://slack.com/api/chat.postMessage`;
  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SLACK_TOKEN}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      channel: channelId,
      ...(blocks ? { text, blocks } : { attachments: [{ title, text, author_name, color }] }),
    }),
  };
  const response = await fetch(url, options);

  const data = await response.json();
  return data;
};
