#!/usr/bin/env node
/**
 * One-command production release: `npm run release [-- --reinstall --notes "..." --dry-run --yes]`
 *
 * Resolves the next `vX.Y.Z-bN` tag (version from app.config.ts, N from the
 * max of local tags + GitHub releases so a missing local tag can never
 * reuse a number), creates + pushes it, and lets `.github/workflows/release-apk.yml`
 * build + publish. With `--reinstall` it also dispatches the workflow with
 * requiresReinstall=true so the download page shows "Please re-download".
 *
 * Safety: refuses on dirty tree, off-main branch, or unsynced main.
 * Never prints secrets. Dry-run changes nothing.
 */
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const usage = `Usage: npm run release [-- --reinstall --notes "..." --dry-run --yes]

  --reinstall   native change (needs fresh install banner on download page)
  --notes "..." release notes (default: commits since last tag)
  --dry-run     show what would happen, change nothing
  --yes         skip confirmation prompt`;

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...opts,
  }).trim();
}

function fail(msg) {
  console.error(`release: error: ${msg}`);
  process.exit(1);
}

function parseArgs(argv) {
  const out = { reinstall: false, notes: '', dryRun: false, yes: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--reinstall') out.reinstall = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--yes' || a === '-y') out.yes = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--notes') {
      out.notes = argv[i + 1] ?? '';
      i += 1;
    } else if (a.startsWith('--notes=')) {
      out.notes = a.slice('--notes='.length);
    } else {
      fail(`unknown argument "${a}"\n${usage}`);
    }
  }
  return out;
}

function readAppVersion() {
  const src = readFileSync(path.join(root, 'app.config.ts'), 'utf8');
  const m = /version:\s*['"](\d+\.\d+\.\d+)['"]/.exec(src);
  if (!m) fail('could not parse version from app.config.ts');
  return m[1];
}

function parseTagNumber(tag, version) {
  const m = new RegExp(`^v${version.replace(/\./g, '\\.')}-b(\\d+)$`).exec(tag);
  return m ? Number(m[1]) : null;
}

function listLocalNumbers(version) {
  let out = '';
  try {
    out = run('git', ['tag', '--list', `v${version}-b*`]);
  } catch {
    return [];
  }
  return out
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => parseTagNumber(t, version))
    .filter((n) => n !== null);
}

function listReleaseNumbers(version) {
  try {
    const json = run('gh', ['release', 'list', '--limit', '100', '--json', 'tagName']);
    const arr = JSON.parse(json);
    return arr
      .map((r) => String(r.tagName || ''))
      .map((t) => parseTagNumber(t, version))
      .filter((n) => n !== null);
  } catch {
    console.warn('release: warning: `gh release list` failed — using local tags only.');
    return [];
  }
}

function lastTagForVersion(version) {
  // Newest existing tag for this version (local view; may lag remote).
  try {
    const out = run('git', ['tag', '--list', `v${version}-b*`, '--sort=-v:refname']);
    const first = out.split('\n').map((t) => t.trim()).filter(Boolean)[0];
    return first || null;
  } catch {
    return null;
  }
}

async function confirm(question) {
  if (!process.stdin.isTTY) fail('no TTY — re-run with --yes to confirm non-interactively.');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const ans = (await rl.question(question)).trim().toLowerCase();
    return ans === 'y' || ans === 'yes';
  } finally {
    rl.close();
  }
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(usage);
  process.exit(0);
}

// --- prechecks ---
let branch = '';
try {
  branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
} catch {
  fail('not a git repository or git is missing.');
}
if (branch !== 'main') fail(`must be on main (currently on "${branch}").`);

let porcelain = '';
try {
  porcelain = run('git', ['status', '--porcelain']);
} catch {
  fail('`git status` failed.');
}
const dirty = porcelain
  .split('\n')
  .filter((l) => l.trim() !== '' && !l.startsWith('??'));
if (dirty.length > 0) {
  fail(`working tree has ${dirty.length} modified/staged file(s). Commit or stash first.`);
}

try {
  run('gh', ['auth', 'status']);
} catch {
  fail('GitHub CLI is not authenticated. Run `gh auth login` first.');
}

try {
  run('git', ['fetch', 'origin', '--tags', '--quiet']);
} catch {
  console.warn('release: warning: `git fetch origin --tags` failed — continuing with local state.');
}

let behind = 0;
let ahead = 0;
try {
  behind = Number(run('git', ['rev-list', '--count', 'HEAD..origin/main'])) || 0;
  ahead = Number(run('git', ['rev-list', '--count', 'origin/main..HEAD'])) || 0;
} catch {
  console.warn('release: warning: could not compare with origin/main — continuing.');
}
if (behind > 0) fail(`main is ${behind} commit(s) behind origin/main. Run \`git pull\` first.`);
if (ahead > 0) {
  fail(`main is ${ahead} commit(s) ahead of origin/main. Run \`git push origin main\` first.`);
}

// --- resolve next tag ---
const version = readAppVersion();
const next =
  Math.max(0, ...listLocalNumbers(version), ...listReleaseNumbers(version)) + 1;
const tag = `v${version}-b${next}`;
if (!/^v\d+\.\d+\.\d+-b\d+$/.test(tag)) fail(`computed invalid tag "${tag}".`);

const prevTag = lastTagForVersion(version);
let commits = '';
try {
  commits = prevTag
    ? run('git', ['log', `${prevTag}..HEAD`, '--oneline', '--max-count=20'])
    : run('git', ['log', '--oneline', '--max-count=10']);
} catch {
  commits = '';
}
const notes = args.notes.trim() || (commits.trim() ? commits.trim() : 'Production release.');
const headSha = run('git', ['rev-parse', '--short', 'HEAD']);

console.log(`release: version ${version}, next tag ${tag} (HEAD ${headSha})`);
console.log(`release: reinstall banner: ${args.reinstall ? 'yes' : 'no'}`);
if (prevTag) console.log(`release: changes since ${prevTag}:\n${commits || '(none)'}`);

if (args.dryRun) {
  console.log('release: dry-run — would run:');
  console.log(`  git tag -a ${tag} -m "<notes>${args.reinstall ? ' [reinstall]' : ''}"`);
  console.log(`  git push origin ${tag}`);
  if (args.reinstall) {
    console.log(
      `  gh workflow run release-apk.yml --ref main -f tag=${tag} -f requiresReinstall=true`,
    );
  }
  process.exit(0);
}

if (!args.yes) {
  const ok = await confirm(`Create and push ${tag}? [y/N] `);
  if (!ok) {
    console.log('release: aborted.');
    process.exit(0);
  }
}

// --- tag + push ---
const tagMessage = `NUcleus Mobile ${version} (b${next})\n\n${notes}${args.reinstall ? '\n\n[reinstall]' : ''}`;
try {
  run('git', ['tag', '-a', tag, '-m', tagMessage]);
} catch (e) {
  fail(`\`git tag\` failed: ${e.message}`);
}
try {
  run('git', ['push', 'origin', tag]);
} catch (e) {
  try {
    run('git', ['tag', '-d', tag]);
  } catch {
    /* leave the local tag for inspection */
  }
  fail(`\`git push origin ${tag}\` failed: ${e.message}`);
}
console.log(`release: pushed ${tag}.`);

// --- reinstall flag needs a dispatch (a tag push cannot carry inputs) ---
if (args.reinstall) {
  try {
    const dispatchArgs = [
      'workflow',
      'run',
      'release-apk.yml',
      '--ref',
      'main',
      '-f',
      `tag=${tag}`,
      '-f',
      'requiresReinstall=true',
    ];
    if (args.notes.trim()) {
      dispatchArgs.push('-f', `notes=${args.notes.trim().slice(0, 500)}`);
    }
    run('gh', dispatchArgs);
    console.log('release: dispatched workflow with requiresReinstall=true.');
    console.log('release: the tag-push run will stand down; the dispatch run builds.');
  } catch (e) {
    fail(
      `tag ${tag} is pushed, but the reinstall dispatch failed: ${e.message}\n` +
        `Re-run manually: gh workflow run release-apk.yml --ref main -f tag=${tag} -f requiresReinstall=true`,
    );
  }
}

console.log('release: done. Follow the build:');
console.log(`  gh run list --workflow release-apk.yml --limit 3`);
console.log(`  gh run watch`);
console.log('Page updates itself when the build finishes: https://download.nu-cleus.app/');
