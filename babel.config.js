module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['inline-dotenv'],
    env: {
      production: {
        plugins: ['transform-remove-console'],
      },
    },
  };
};
