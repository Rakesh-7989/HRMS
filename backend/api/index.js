exports.handler = async function (event, context) {
  console.log('Handler invoked with event:', JSON.stringify(event));
  console.log('Node version:', process.version);
  console.log('CWD:', process.cwd());
  console.log('Env vars:', Object.keys(process.env).sort().join(', '));
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      status: 'ok', 
      message: 'HRMS SaaS API running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      node: process.version
    })
  };
};
