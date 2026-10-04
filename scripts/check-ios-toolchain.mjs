import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function atLeast(actual, required) {
  const parts = actual.split('.').map(Number);
  for (let index = 0; index < required.length; index++) {
    const difference = (parts[index] || 0) - required[index];
    if (difference) return difference > 0;
  }
  return true;
}

if (process.platform !== 'darwin') {
  console.error('Local iPhone builds require a Mac.');
  process.exit(1);
}
const problems = [];
const macOS = execFileSync('sw_vers', ['-productVersion'], { encoding: 'utf8' }).trim();
console.log(`macOS ${macOS}; Node ${process.versions.node}`);
const helpers = readFileSync(
  new URL('../node_modules/react-native/scripts/cocoapods/helpers.rb', import.meta.url),
  'utf8',
);
const minimumXcode = helpers.match(
  /def self\.min_xcode_version_supported\s+return ['"]([\d.]+)['"]/,
)?.[1];
if (!minimumXcode) {
  console.error(
    'Could not read React Native’s minimum Xcode version. Run npm install and check the native build output.',
  );
  process.exit(1);
}
if (!atLeast(process.versions.node, [22, 13])) problems.push('Install Node.js 22.13 or newer.');
try {
  const output = execFileSync('xcodebuild', ['-version'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const version = output.match(/Xcode (\d+(?:\.\d+)*)/)?.[1];
  console.log(version ? `Xcode ${version}` : 'Xcode version unavailable');
  if (!version || !atLeast(version, minimumXcode.split('.').map(Number)))
    problems.push(
      `This installed React Native package requires Xcode ${minimumXcode} or newer. Select or install a compatible Xcode, then open it once to finish setup.`,
    );
} catch {
  problems.push(
    'Install full Xcode and select it with: sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer',
  );
}
try {
  const version = execFileSync('pod', ['--version'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  console.log(`CocoaPods ${version}`);
} catch {
  problems.push('Install CocoaPods with: brew install cocoapods');
}
if (problems.length) {
  console.error(
    '\nBefore building locally:\n' + problems.map((problem) => `- ${problem}`).join('\n'),
  );
  process.exit(1);
}
console.log(
  '\nLocal toolchain ready. Connect and unlock your iPhone, trust the Mac, and enable Developer Mode.',
);
