import fs from 'fs';

const css = fs.readFileSync('../styles.css', 'utf-8');
const lines = css.split('\n');

function find(query) {
  console.log(`\n--- Searching for "${query}" ---`);
  lines.forEach((line, idx) => {
    if (line.includes(query)) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  });
}

find('stat-num');
find('feature-card');
find('page-header');
find('h2');
find('color: #fff');
find('color: white');
find('color: var(--color-text-muted)');
find('Predict Travel');
find('transit-card');
find('dispatch-history');
find('eco-rec');
find('rec-');
find('.pred-');
