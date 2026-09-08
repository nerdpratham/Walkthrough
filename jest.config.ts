import type { Config } from 'jest';

const baseConfig = {
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
  },
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/.tmp-'],
  modulePathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/.tmp-'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};

const config: Config = {
  projects: [
    {
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      testMatch: ['**/*.test.{ts,tsx}', '!**/lib/studio/auth.test.ts'],
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            tsconfig: { jsx: 'react-jsx' },
          },
        ],
      },
      ...baseConfig,
    },
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: ['**/lib/studio/auth.test.ts'],
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            tsconfig: { jsx: 'react-jsx' },
            useESM: true,
          },
        ],
      },
      extensionsToTreatAsEsm: ['.ts'],
      ...baseConfig,
    },
  ],
};

export default config;
