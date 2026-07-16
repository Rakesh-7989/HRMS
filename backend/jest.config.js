module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  setupFiles: ['<rootDir>/src/test/setup.js'],
  coveragePathIgnorePatterns: ['/node_modules/', '/scripts/', '/src/test/'],
  collectCoverageFrom: ['src/**/*.js'],
  testTimeout: 60000,
};
