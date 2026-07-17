const express = require('express');
const app = express();
app.disable('x-powered-by');

const routes = require('../src/routes');
app.use('/api', routes);

module.exports = app;
