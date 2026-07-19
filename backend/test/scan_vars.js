import fs from 'fs';

const css = fs.readFileSync('../styles.css', 'utf-8');
const lines = css.split('\n');

console.log('--- Scanning --color-text-primary in styles.css ---');
lines.forEach((line, idx) => {
  if (line.includes('--color-text-primary')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
  if (line.includes(':root')) {
    console.log(`${idx + 1}: [ROOT DECLARATION]`);
  }
});
