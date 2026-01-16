/* eslint-disable */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      ["module:react-native-dotenv", { moduleName: "react-native-dotenv" }],
      [
        "module-resolver",
        {
          root: ["."],
          alias: {
            "~": "./src",
          },
        },
      ]
    ],
    env: {
      production: {
        plugins: ["transform-remove-console"],
      },
    },
  };
};
