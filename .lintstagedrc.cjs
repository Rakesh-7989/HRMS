const path = require('path');

module.exports = {
  'frontend/src/**/*.{ts,tsx}': (filenames) => {
    return `npx --prefix frontend eslint --resolve-plugins-relative-to frontend --fix ${filenames.join(' ')}`;
  },
  'backend/src/**/*.js': (filenames) => {
    return `npx --prefix backend eslint --resolve-plugins-relative-to backend --fix ${filenames.join(' ')}`;
  },
};
