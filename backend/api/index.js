module.exports = (req, res) => {
  const body = JSON.stringify({
    status: 'ok',
    message: 'HRMS SaaS API running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
  res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
};
