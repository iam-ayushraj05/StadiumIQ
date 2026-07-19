import fs from 'fs';

const css = fs.readFileSync('../styles.css', 'utf-8');
const lines = css.split('\n');

console.log('--- Scanning color rules in styles.css ---');
lines.forEach((line, idx) => {
  if (line.includes('color:') || line.includes('background:')) {
    // Print lines containing white, #fff, text-light, light-gray, etc.
    const lower = line.toLowerCase();
    if (lower.includes('#fff') || lower.includes('white') || lower.includes('rgba(255') || lower.includes('var(--bg-') || lower.includes('text-light') || lower.includes('#f')) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
