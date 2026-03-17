
import fs from 'fs';
const stats = fs.statSync('./data/agreements.json');
console.log('Size:', stats.size, 'bytes');
