// Generate bcrypt hash for test password
const bcrypt = require('bcryptjs');

const password = 'Demo@1234';
const hash = bcrypt.hashSync(password, 10);

console.log('Password:', password);
console.log('Hash:', hash);
