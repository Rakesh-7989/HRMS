module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  setupFilesAfterSetup: [],
  coveragePathIgnorePatterns: ['/node_modules/', '/scripts/'],
  collectCoverageFrom: ['src/**/*.js'],
};
