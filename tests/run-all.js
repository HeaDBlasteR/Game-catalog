const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const failed = [];

const compiledShared = path.join(__dirname, '..', 'dist-electron', 'src', 'shared');
if (!fs.existsSync(compiledShared)) {
  console.error('Compiled sources not found. Run "npm run build" first.');
  process.exit(1);
}

console.log('=== unit tests ===');
const unit = spawnSync(process.execPath, ['--test', 'tests/unit/**/*.test.js'], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
  env
});
if (unit.status !== 0) failed.push('unit tests');

const suites = fs.readdirSync(__dirname)
  .filter(file => file.endsWith('.test.js'))
  .sort();

if (!suites.length) {
  console.error('No end-to-end suites found.');
  process.exit(1);
}

for (const suite of suites) {
  console.log(`\n=== ${suite} ===`);
  const result = spawnSync(process.execPath, [path.join(__dirname, suite)], { stdio: 'inherit', env });
  if (result.status !== 0) failed.push(suite);
}

console.log('\n=====================');
if (failed.length) {
  console.log(`FAILED: ${failed.join(', ')}`);
  process.exit(1);
}

console.log(`All ${suites.length} end-to-end suites and the unit tests passed.`);
