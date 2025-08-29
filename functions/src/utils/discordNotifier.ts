// Discord通知を送信するユーティリティ

interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  fields?: DiscordEmbedField[];
  timestamp?: string;
}

interface DiscordWebhookPayload {
  embeds: DiscordEmbed[];
}

/**
 * Discord Webhookを使用して通知を送信する
 * @param embedData Discordに送信するembed情報
 */
export async function sendDiscordNotification(embedData: DiscordEmbed): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.log('Discord Webhook URLが設定されていません。通知をスキップします。');
    return;
  }

  const payload: DiscordWebhookPayload = {
    embeds: [
      {
        ...embedData,
        timestamp: embedData.timestamp || new Date().toISOString(),
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Discord notification failed: ${response.status} ${response.statusText}`);
    }

    console.log('Discord notification sent successfully');
  } catch (error) {
    console.error('Error sending Discord notification:', error);
    throw error;
  }
}