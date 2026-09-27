const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const suites = fs.readdirSync(__dirname)
  .filter(file => file.endsWith('.test.js'))
  .sort();

if (!suites.length) {
  console.error('No test suites found.');
  process.exit(1);
}

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const failed = [];

for (const suite of suites) {
  console.log(`\n=== ${suite} ===`);
  const result = spawnSync(process.execPath, [path.join(__dirname, suite)], { stdio: 'inherit', env });
  if (result.status !== 0) failed.push(suite);
}

console.log('\n=====================');
if (failed.length) {
  console.log(`FAILED suites: ${failed.join(', ')}`);
  process.exit(1);
}

console.log(`All ${suites.length} suites passed.`);
