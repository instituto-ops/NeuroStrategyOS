const fs = require('fs');
const buf = fs.readFileSync('frontend/public/js/vortex-studio.js');
console.log(buf.slice(0, 100).toString('hex'));
