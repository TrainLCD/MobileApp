export type DiscordEmbed = {
  image?: {
    url: string;
  };
  fields: {
    name: string;
    value: string;
  }[];
};
