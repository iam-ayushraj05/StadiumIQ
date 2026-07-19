import fs from 'fs';

const css = fs.readFileSync('../styles.css', 'utf-8');
const lines = css.split('\n');

console.log('--- Scanning "dark" and "@media" in styles.css ---');
lines.forEach((line, idx) => {
  const lower = line.toLowerCase();
  if (lower.includes('dark') || lower.includes('@media')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
