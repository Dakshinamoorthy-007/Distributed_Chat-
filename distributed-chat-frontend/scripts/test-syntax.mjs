import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const files = await walk(srcRoot);
let failed = false;
for (const file of files) {
  const source = await fs.readFile(file, 'utf8');
  const result = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler
    }
  });
  const errors = (result.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  if (errors.length) {
    failed = true;
    console.error(`FAIL ${path.relative(process.cwd(), file)}`);
    for (const error of errors) console.error(ts.flattenDiagnosticMessageText(error.messageText, '\n'));
  } else {
    console.log(`PASS ${path.relative(process.cwd(), file)}`);
  }
}

if (!files.length || failed) process.exitCode = 1;
