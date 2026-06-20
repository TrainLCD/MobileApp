/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: 'node',
  watchman: false,
  testPathIgnorePatterns: ['/node_modules/'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        // ランタイム結合は wrangler dev で確認する。テストは純粋関数のみを
        // トランスパイルのみ（型チェックなし）で実行し、Workers 型の解決を不要にする。
        isolatedModules: true,
        tsconfig: { module: 'commonjs', verbatimModuleSyntax: false },
      },
    ],
  },
};
