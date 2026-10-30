// jest-expo imports Expo's internal core module directly. Resolve the copy owned by Expo,
// even when npm keeps that transitive dependency nested.
module.exports = {
  "preset": "jest-expo",
  "moduleFileExtensions": [
    "ts",
    "tsx",
    "js",
    "jsx",
    "json",
    "node",
    "d.ts"
  ],
  "watchman": false,
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|fractional-indexing)"
  ],
  "setupFilesAfterEnv": [
    "<rootDir>/jest.setup.js"
  ],
  "moduleNameMapper": {
    "^~/(.*)$": "<rootDir>/src/$1",
    "^~/@types/graphql$": "<rootDir>/src/@types/graphql.ts",
    "^react-native-reanimated/mock$": "<rootDir>/src/__mocks__/react-native-reanimated-mock.js"
  }
};
module.exports.moduleNameMapper['^expo-modules-core$'] = require.resolve(
  'expo-modules-core',
  { paths: [require.resolve('expo/package.json')] }
);
