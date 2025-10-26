import type { CodegenConfig } from '@graphql-codegen/cli';

if (!process.env.GQL_API_URL) {
  throw new Error(
    'GQL_API_URL environment variable is required for GraphQL code generation'
  );
}

const config: CodegenConfig = {
  overwrite: true,
  schema: process.env.GQL_API_URL,
  documents: ['src/**/*.{ts,tsx}'],
  ignoreNoDocuments: true,
  generates: {
    'src/@types/graphql.d.ts': {
      plugins: ['typescript', 'typescript-operations'],
      config: {
        avoidOptionals: true,
        preResolveTypes: true,
        skipTypename: false,
        defaultScalarType: 'unknown',
        nonOptionalTypename: true,
        skipTypeNameForRoot: true,
        maybeValue: 'T | null | undefined',
      },
    },
  },
};

export default config;
