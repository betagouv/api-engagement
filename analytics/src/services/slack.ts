const { ENV, SLACK_TOKEN } = process.env;

export const postMessage = async ({ title, text, author_name, color }: { title?: string; text: string; author_name?: string; color?: string }, channelId?: string) => {
  if (ENV !== "production") {
    console.log(`---- SLACK ----`);
    console.log(`title: ${title}`);
    console.log(`text: ${text}`);
    console.log(`author_name: ${author_name || "none"}`);
    console.log(`color: ${color || "none"}`);
    console.log(`channelId: ${channelId}`);
    console.log(`---- SLACK ----`);
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
      attachments: [
        {
          title,
          text,
          author_name,
          color,
        },
      ],
    }),
  };
  const response = await fetch(url, options);

  const data = await response.json();
  return data;
};
