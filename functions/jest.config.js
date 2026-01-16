/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "node",
  watchman: false,
  testPathIgnorePatterns: ["/node_modules/", "/lib/"],
  transform: {
    "^.+.tsx?$": ["ts-jest",{}],
  },
};
