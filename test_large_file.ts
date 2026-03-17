
import fs from 'fs';
const largeData = 'a'.repeat(10 * 1024 * 1024);
const agreements = [{ id: 'large', data: largeData }];
try {
  fs.writeFileSync('./data/agreements.json', JSON.stringify(agreements, null, 2));
  console.log('Wrote 10MB file');
} catch (e) {
  console.error('Failed to write 10MB file:', e.message);
}
