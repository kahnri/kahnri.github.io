import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const languages = ['tr', 'de', 'en', 'nl', 'ja'];
const errors = [];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '.git' || entry.name === '_site') return [];
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });
}

function relative(file) {
  return path.relative(root, file);
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function fail(message) {
  errors.push(message);
}

const files = walk(root);
const contentFiles = files.filter((file) => /\.(?:html|md)$/.test(file));

const sandbox = { window: {} };
vm.runInNewContext(read(path.join(root, 'assets/i18n.js')), sandbox);
const dictionaries = sandbox.window.I18N_STRINGS;
const dictionaryKeys = new Set(languages.flatMap((language) => Object.keys(dictionaries[language] || {})));

for (const language of languages) {
  if (!dictionaries[language]) {
    fail(`Missing i18n dictionary: ${language}`);
    continue;
  }
  for (const key of dictionaryKeys) {
    if (!(key in dictionaries[language])) fail(`Missing dictionary key ${language}.${key}`);
  }
}

const referencedKeys = new Map();
for (const file of contentFiles) {
  const source = read(file);
  for (const match of source.matchAll(/data-i18n(?:-title|-ph)?=["']([^"']+)["']/g)) {
    if (!referencedKeys.has(match[1])) referencedKeys.set(match[1], new Set());
    referencedKeys.get(match[1]).add(relative(file));
  }

  for (const match of source.matchAll(/<[^>]*\sdata-lang-text(?:\s|=)[^>]*>/gs)) {
    const tag = match[0];
    for (const language of languages) {
      const value = tag.match(new RegExp(`data-lang-text-${language}=(["'])([\\s\\S]*?)\\1`));
      if (!value || !value[2].trim()) {
        fail(`${relative(file)} has an incomplete data-lang-text block for ${language}`);
      }
    }
  }

  for (const match of source.matchAll(/<[^>]*\sdata-lang-aria-label(?:\s|=)[^>]*>/gs)) {
    const tag = match[0];
    for (const language of languages) {
      const value = tag.match(new RegExp(`data-lang-aria-label-${language}=(["'])([\\s\\S]*?)\\1`));
      if (!value || !value[2].trim()) {
        fail(`${relative(file)} has an incomplete data-lang-aria-label block for ${language}`);
      }
    }
  }

  if (source.includes('data-lang-select')) {
    const i18nIndex = source.indexOf('assets/i18n.js');
    const langIndex = source.indexOf('assets/lang.js');
    if (i18nIndex < 0 || langIndex < 0) fail(`${relative(file)} has a language selector without both language scripts`);
    if (i18nIndex > langIndex) fail(`${relative(file)} loads lang.js before i18n.js`);
  }
}

for (const [key, keyFiles] of referencedKeys) {
  for (const language of languages) {
    if (!(key in (dictionaries[language] || {}))) {
      fail(`Referenced key ${key} is missing in ${language} (${[...keyFiles].join(', ')})`);
    }
  }
}

const adminSource = read(path.join(root, 'assets/admin.js'));
const adminKeys = new Set([...adminSource.matchAll(/\bt\(\s*["']([^"']+)["']/g)].map((match) => match[1]));
for (const key of adminKeys) {
  for (const language of languages) {
    if (!(key in (dictionaries[language] || {}))) fail(`Admin message ${key} is missing in ${language}`);
  }
}

for (const file of files.filter((entry) => relative(entry).startsWith('_posts/') && entry.endsWith('.md'))) {
  const source = read(file);
  for (const language of languages) {
    for (const field of ['title', 'excerpt', 'category', 'read_time']) {
      if (!new RegExp(`^${field}_${language}:\\s*.+$`, 'm').test(source)) {
        fail(`${relative(file)} is missing ${field}_${language}`);
      }
    }
    if (!new RegExp(`^${language}: \\|\\n(?:[ \\t]+\\S[\\s\\S]*?)(?=^[a-z]{2}: \\||^---\\s*$)`, 'm').test(source)) {
      fail(`${relative(file)} is missing non-empty ${language} content`);
    }
  }
}

const themeUiPattern = /theme-toggle|data-theme-icon|__themeToggle/;
for (const file of files.filter((entry) => /\.(?:html|js)$/.test(entry))) {
  const source = read(file);
  if (themeUiPattern.test(source)) fail(`${relative(file)} still contains theme-switching UI or code`);
}

if (errors.length) {
  console.error(`Localization check failed with ${errors.length} issue(s):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Localization check passed: ${languages.length} languages, ${dictionaryKeys.size} dictionary keys, ${contentFiles.length} content files.`);
