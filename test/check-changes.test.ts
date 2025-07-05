import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { $ } from 'bun';

// Regex pattern defined at top level for performance
const SHELL_FILES_PATTERN = /changed_files=.*src\/index\.js.*src\/utils\.js/;

// Helper function to create file with directory structure
async function createFile(filePath: string, content: string) {
  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true });
  await writeFile(filePath, content);
}

// Test repository setup
let testRepo: string;
let originalCwd: string;

beforeEach(async () => {
  originalCwd = process.cwd();

  // Create temporary directory
  testRepo = await mkdtemp(join(tmpdir(), 'check-changes-test-'));
  process.chdir(testRepo);

  // Initialize git repo
  await $`git init --initial-branch=main`;
  await $`git config user.email "test@example.com"`;
  await $`git config user.name "Test User"`;
  await $`git config commit.gpgsign false`;

  // Create initial commit
  await writeFile('README.md', '# Test Repo\n');
  await $`git add .`;
  await $`git commit -m "Initial commit"`;
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(testRepo, { recursive: true, force: true });
});

test('detects changes in included files', async () => {
  // Create some files
  await createFile('src/index.js', "console.log('hello');");
  await createFile('docs/readme.md', '# Documentation');
  await $`git add .`;
  await $`git commit -m "Add files"`;

  // Modify a file
  await createFile('src/index.js', "console.log('hello world');");

  // Set environment variables
  process.env.INPUT_INCLUDE = 'src/**/*';
  process.env.INPUT_EXCLUDE = '';
  process.env.INPUT_LIST_FILES = 'none';
  process.env.GITHUB_OUTPUT = join(testRepo, 'output.txt');

  // Run the script
  const result = await $`bash ${join(originalCwd, 'check-changes.sh')}`.quiet();

  expect(result.exitCode).toBe(0);

  // Check outputs
  const output = await readFile(process.env.GITHUB_OUTPUT, 'utf-8');
  expect(output).toContain('changed=true');
  expect(output).toContain('changes_count=1');
});

test('excludes files correctly', async () => {
  // Create files
  await createFile('src/index.js', "console.log('hello');");
  await createFile('src/test.spec.js', 'test();');
  await $`git add .`;
  await $`git commit -m "Add files"`;

  // Modify both files
  await createFile('src/index.js', "console.log('hello world');");
  await createFile('src/test.spec.js', "test('modified');");

  // Set environment variables to exclude test files
  process.env.INPUT_INCLUDE = 'src/**/*';
  process.env.INPUT_EXCLUDE = '**/*.spec.js';
  process.env.INPUT_LIST_FILES = 'none';
  process.env.GITHUB_OUTPUT = join(testRepo, 'output.txt');

  // Run the script
  const result = await $`bash ${join(originalCwd, 'check-changes.sh')}`.quiet();

  expect(result.exitCode).toBe(0);

  // Check outputs - should only count index.js, not test.spec.js
  const output = await readFile(process.env.GITHUB_OUTPUT, 'utf-8');
  expect(output).toContain('changed=true');
  expect(output).toContain('changes_count=1');
});

test('handles no matching changes', async () => {
  // Create and commit a file
  await writeFile('README.md', '# Updated readme');
  await $`git add .`;
  await $`git commit -m "Update readme"`;

  // Modify the file
  await writeFile('README.md', '# Updated readme again');

  // Set environment to only include JavaScript files
  process.env.INPUT_INCLUDE = '**/*.js,**/*.ts';
  process.env.INPUT_EXCLUDE = '';
  process.env.INPUT_LIST_FILES = 'none';
  process.env.GITHUB_OUTPUT = join(testRepo, 'output.txt');

  // Run the script
  const result = await $`bash ${join(originalCwd, 'check-changes.sh')}`.quiet();

  expect(result.exitCode).toBe(0);

  // Check outputs - should find no changes
  const output = await readFile(process.env.GITHUB_OUTPUT, 'utf-8');
  expect(output).toContain('changed=false');
  expect(output).toContain('changes_count=0');
});

test('outputs file list in shell format', async () => {
  // Create files
  await createFile('src/index.js', 'code');
  await createFile('src/utils.js', 'utils');
  await $`git add .`;
  await $`git commit -m "Add files"`;

  // Modify files
  await createFile('src/index.js', 'modified code');
  await createFile('src/utils.js', 'modified utils');

  // Set environment for shell output
  process.env.INPUT_INCLUDE = 'src/**/*';
  process.env.INPUT_EXCLUDE = '';
  process.env.INPUT_LIST_FILES = 'shell';
  process.env.GITHUB_OUTPUT = join(testRepo, 'output.txt');

  // Run the script
  const result = await $`bash ${join(originalCwd, 'check-changes.sh')}`.quiet();

  expect(result.exitCode).toBe(0);

  // Check outputs
  const output = await readFile(process.env.GITHUB_OUTPUT, 'utf-8');
  expect(output).toContain('changed=true');
  expect(output).toContain('changes_count=2');
  expect(output).toMatch(SHELL_FILES_PATTERN);
});

test('outputs file list in JSON format', async () => {
  // Create files
  await createFile('src/index.js', 'code');
  await $`git add .`;
  await $`git commit -m "Add file"`;

  // Modify file
  await createFile('src/index.js', 'modified code');

  // Set environment for JSON output
  process.env.INPUT_INCLUDE = 'src/**/*';
  process.env.INPUT_EXCLUDE = '';
  process.env.INPUT_LIST_FILES = 'json';
  process.env.GITHUB_OUTPUT = join(testRepo, 'output.txt');

  // Run the script
  const result = await $`bash ${join(originalCwd, 'check-changes.sh')}`.quiet();

  expect(result.exitCode).toBe(0);

  // Check outputs
  const output = await readFile(process.env.GITHUB_OUTPUT, 'utf-8');
  expect(output).toContain('changed=true');
  expect(output).toContain('changes_count=1');
  expect(output).toContain('changed_files=["src/index.js"]');
});

test('handles comma-separated patterns', async () => {
  // Create files
  await createFile('src/index.js', 'js code');
  await createFile('src/style.css', 'css code');
  await createFile('docs/readme.md', 'docs');
  await $`git add .`;
  await $`git commit -m "Add files"`;

  // Modify all files
  await createFile('src/index.js', 'modified js');
  await createFile('src/style.css', 'modified css');
  await createFile('docs/readme.md', 'modified docs');

  // Use comma-separated include patterns
  process.env.INPUT_INCLUDE = 'src/**/*.js,src/**/*.css';
  process.env.INPUT_EXCLUDE = '';
  process.env.INPUT_LIST_FILES = 'none';
  process.env.GITHUB_OUTPUT = join(testRepo, 'output.txt');

  // Run the script
  const result = await $`bash ${join(originalCwd, 'check-changes.sh')}`.quiet();

  expect(result.exitCode).toBe(0);

  // Check outputs - should find 2 files (js and css, but not md)
  const output = await readFile(process.env.GITHUB_OUTPUT, 'utf-8');
  expect(output).toContain('changed=true');
  expect(output).toContain('changes_count=2');
});

test('works with custom base reference', async () => {
  // Create initial files
  await writeFile('file1.txt', 'content 1');
  await $`git add .`;
  await $`git commit -m "Add file1"`;

  // Create a branch and switch to it
  await $`git checkout -b feature`;
  await writeFile('file2.txt', 'content 2');
  await $`git add .`;
  await $`git commit -m "Add file2"`;

  // Set custom base
  process.env.INPUT_INCLUDE = '**/*';
  process.env.INPUT_EXCLUDE = '';
  process.env.INPUT_BASE = 'main';
  process.env.INPUT_LIST_FILES = 'none';
  process.env.GITHUB_OUTPUT = join(testRepo, 'output.txt');

  // Run the script
  const result = await $`bash ${join(originalCwd, 'check-changes.sh')}`.quiet();

  expect(result.exitCode).toBe(0);

  // Check outputs - should find the new file
  const output = await readFile(process.env.GITHUB_OUTPUT, 'utf-8');
  expect(output).toContain('changed=true');
  expect(output).toContain('changes_count=1');
});

test('writes a Markdown summary when summary input is true', async () => {
  // Create files
  await createFile('src/index.js', 'code');
  await createFile('src/utils.js', 'utils');
  await $`git add .`;
  await $`git commit -m "Add files"`;

  // Modify files
  await createFile('src/index.js', 'modified code');
  await createFile('src/utils.js', 'modified utils');

  // Set environment for summary output
  process.env.INPUT_INCLUDE = 'src/**/*';
  process.env.INPUT_EXCLUDE = '';
  process.env.INPUT_LIST_FILES = 'none';
  process.env.INPUT_SUMMARY = 'true';
  process.env.GITHUB_OUTPUT = join(testRepo, 'output.txt');
  const summaryPath = join(testRepo, 'summary.md');
  process.env.GITHUB_STEP_SUMMARY = summaryPath;

  // Run the script
  const result = await $`bash ${join(originalCwd, 'check-changes.sh')}`.quiet();

  expect(result.exitCode).toBe(0);

  // Check summary output
  const summary = await readFile(summaryPath, 'utf-8');
  expect(summary).toContain('### 🔍 Change Detection Summary');
  expect(summary).toContain('| Key | Value |');
  expect(summary).toContain('| **Changed** | Yes |');
  expect(summary).toContain('| **Changed Files Count** | 2 |');
  expect(summary).toContain('**Changed Files:**');
  expect(summary).toContain('`src/index.js`');
  expect(summary).toContain('`src/utils.js`');
  expect(summary).toContain('---');
});

test('writes a Markdown summary with excluded files', async () => {
  // Create files
  await createFile('src/index.js', 'code');
  await createFile('src/test.spec.js', 'test();');
  await $`git add .`;
  await $`git commit -m "Add files"`;

  // Modify files
  await createFile('src/index.js', 'modified code');
  await createFile('src/test.spec.js', 'modified test');

  // Set environment for summary output with exclusion
  process.env.INPUT_INCLUDE = 'src/**/*';
  process.env.INPUT_EXCLUDE = '**/*.spec.js';
  process.env.INPUT_LIST_FILES = 'none';
  process.env.INPUT_SUMMARY = 'true';
  process.env.GITHUB_OUTPUT = join(testRepo, 'output.txt');
  const summaryPath = join(testRepo, 'summary.md');
  process.env.GITHUB_STEP_SUMMARY = summaryPath;

  // Run the script
  const result = await $`bash ${join(originalCwd, 'check-changes.sh')}`.quiet();

  expect(result.exitCode).toBe(0);

  // Check summary output
  const summary = await readFile(summaryPath, 'utf-8');
  expect(summary).toContain('### 🔍 Change Detection Summary');
  expect(summary).toContain('| **Changed** | Yes |');
  expect(summary).toContain('| **Changed Files Count** | 1 |');
  expect(summary).toContain('**Changed Files:**');
  expect(summary).toContain('`src/index.js`');

  const changedFilesSection = summary.split('**Excluded Files:**')[0];
  expect(changedFilesSection).not.toContain('`src/test.spec.js`');

  expect(summary).toContain('**Excluded Files:**');
  expect(summary).toContain('`src/test.spec.js`');
});

test('writes a Markdown summary with more than 10 excluded files in a details block', async () => {
  // Create initial files
  await createFile('src/index.js', 'code');
  const createPromises: Promise<void>[] = [];
  for (let i = 0; i < 11; i++) {
    createPromises.push(createFile(`src/test-${i}.spec.js`, `test ${i}`));
  }
  await Promise.all(createPromises);
  await $`git add .`;
  await $`git commit -m "Add initial files"`;

  // Modify all files
  await createFile('src/index.js', 'modified code');
  const modifyPromises: Promise<void>[] = [];
  for (let i = 0; i < 11; i++) {
    modifyPromises.push(
      createFile(`src/test-${i}.spec.js`, `modified test ${i}`)
    );
  }
  await Promise.all(modifyPromises);

  // Set environment for summary output with exclusion
  process.env.INPUT_INCLUDE = 'src/**/*';
  process.env.INPUT_EXCLUDE = '**/*.spec.js';
  process.env.INPUT_LIST_FILES = 'none';
  process.env.INPUT_SUMMARY = 'true';
  process.env.GITHUB_OUTPUT = join(testRepo, 'output.txt');
  const summaryPath = join(testRepo, 'summary.md');
  process.env.GITHUB_STEP_SUMMARY = summaryPath;

  // Run the script
  const result = await $`bash ${join(originalCwd, 'check-changes.sh')}`.quiet();

  expect(result.exitCode).toBe(0);

  const summary = await readFile(summaryPath, 'utf-8');
  expect(summary).toContain('<details><summary>Excluded Files (11)</summary>');
  for (let i = 0; i < 11; i++) {
    expect(summary).toContain(`- \`src/test-${i}.spec.js\``);
  }
  expect(summary).toContain('</details>');
  expect(summary).toContain('`src/index.js`');
});
