module.exports = {
  clearMocks: true,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  roots: ['<rootDir>/src'],
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          esModuleInterop: true,
          module: 'commonjs',
          moduleResolution: 'node',
          target: 'es2022',
        },
      },
    ],
  },
};
