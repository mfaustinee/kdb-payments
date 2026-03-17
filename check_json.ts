
import fs from 'fs';
try {
  const data = fs.readFileSync('./data/agreements.json', 'utf-8');
  const json = JSON.parse(data);
  console.log('JSON is valid. Array length:', json.length);
} catch (e) {
  console.error('JSON is invalid:', e.message);
}
