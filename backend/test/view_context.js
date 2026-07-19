import fs from 'fs';

const css = fs.readFileSync('../styles.css', 'utf-8');
const lines = css.split('\n');

const lineNumbers = [1247, 1621, 2363];

lineNumbers.forEach(num => {
  console.log(`\n=================== Line ${num} Context ===================`);
  const start = Math.max(0, num - 10);
  const end = Math.min(lines.length - 1, num + 10);
  for (let i = start; i <= end; i++) {
    const isTarget = i === num - 1;
    console.log(`${isTarget ? '>>>' : '   '} ${i + 1}: ${lines[i]}`);
  }
});
