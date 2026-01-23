
const app = require('./app');
const env = require('./src/config/env');
const logger = require('./src/config/logger');
// const swaggerLoader = require("./src/docs");

// swaggerLoader(app);

app.listen(env.PORT, () => {
  logger.info(`HRMS SaaS API listening on port ${env.PORT}`);
});

