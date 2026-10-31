#!/usr/bin/env node
/**
 * build_amplify.mjs - Builds a static, self-contained AWS Amplify Hosting bundle (dist/)
 * for the Point-of-Care Clinical Decision Support Workstation.
 *
 * Output directory: dist/
 * - dist/index.html             (loads /standalone-engine.js + /app.js)
 * - dist/style.css              (workstation stylesheet)
 * - dist/app.js                 (point-of-care UI controller)
 * - dist/standalone-engine.js   (bundled HL7 CQL 1.5 engine, ELM libraries, schemas, EHR & PDF extractor)
 * - dist/api/sample-pdf/*.pdf   (static sample synoptic PDFs for 1-click viewing)
 * - dist/sample_data/**         (47 synthetic FHIR R4 regression bundles + PDFs)
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PUBLIC_DIR = path.join(ROOT, 'public');
const SAMPLE_DATA_DIR = path.join(ROOT, 'sample_data');

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('1. Cleaning dist/ directory...');
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

console.log('2. Bundling HL7 CQL 1.5 engine + ELM libraries + FHIR R4 services into dist/standalone-engine.js...');
const localRolldown = path.resolve(ROOT, '../ncg-cql-authoring-mvp-v2/node_modules/.bin/rolldown');
const shimEntry = path.join(ROOT, 'scripts/browser_api_shim.js');
const bundleOut = path.join(DIST, 'standalone-engine.js');

if (fs.existsSync(localRolldown)) {
  execFileSync(
    localRolldown,
    [shimEntry, '--format', 'iife', '--platform', 'browser', '--minify', '--file', bundleOut],
    { stdio: 'inherit', cwd: ROOT }
  );
} else {
  execFileSync(
    'npx',
    ['--yes', 'rolldown', shimEntry, '--format', 'iife', '--platform', 'browser', '--minify', '--file', bundleOut],
    { stdio: 'inherit', cwd: ROOT }
  );
}

// Prepend lightweight browser shim for CJS modules (xml2js / cql-exec-fhir) that call require('events'|'timers'|'stream'|'fs')
const browserRequireShim = [
  'var require=(function(g){',
  'if(typeof g.require==="function")return g.require;',
  'class EE{',
  '  on(e,fn){(this._e||(this._e={}))[e]=(this._e[e]||[]);this._e[e].push(fn);return this}',
  '  addListener(e,fn){return this.on(e,fn)}',
  '  once(e,fn){const w=(...a)=>{this.removeListener(e,w);fn.apply(this,a)};return this.on(e,w)}',
  '  removeListener(e,fn){if(this._e&&this._e[e])this._e[e]=this._e[e].filter(f=>f!==fn);return this}',
  '  off(e,fn){return this.removeListener(e,fn)}',
  '  removeAllListeners(e){if(this._e){if(e)delete this._e[e];else this._e={}}return this}',
  '  emit(e,...a){const l=this._e&&this._e[e];if(!l||!l.length)return false;for(const fn of [...l])fn.apply(this,a);return true}',
  '}',
  'EE.EventEmitter=EE;',
  'const shims={',
  '  events:EE,',
  '  timers:{setImmediate:(fn,...a)=>setTimeout(fn,0,...a),clearImmediate:id=>clearTimeout(id)},',
  '  stream:{Stream:EE,Readable:EE,Writable:EE,Duplex:EE,Transform:EE,PassThrough:EE},',
  '  fs:{existsSync:()=>false,readFileSync:()=>"",readdirSync:()=>[]},',
  '  path:{join:(...p)=>p.join("/"),resolve:(...p)=>p.join("/"),dirname:p=>p,basename:p=>p}',
  '};',
  'g.require=function(id){return shims[id]||{}};',
  'return g.require;',
  '})(typeof globalThis!=="undefined"?globalThis:window);',
].join('');
const bundledCode = fs.readFileSync(bundleOut, 'utf8');
fs.writeFileSync(bundleOut, `${browserRequireShim}\n${bundledCode}`, 'utf8');

console.log('3. Copying static UI assets (index.html, style.css, app.js)...');
fs.copyFileSync(path.join(PUBLIC_DIR, 'style.css'), path.join(DIST, 'style.css'));
fs.copyFileSync(path.join(PUBLIC_DIR, 'app.js'), path.join(DIST, 'app.js'));

const rawIndexHtml = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
const amplifyIndexHtml = rawIndexHtml.replace(
  '<script src="/app.js"></script>',
  '<script src="/standalone-engine.js"></script>\n  <script src="/app.js"></script>'
);
fs.writeFileSync(path.join(DIST, 'index.html'), amplifyIndexHtml, 'utf8');

console.log('4. Copying sample PDFs and synthetic FHIR R4 bundles into dist/...');
const pdfDestApi = path.join(DIST, 'api/sample-pdf');
const pdfDestSample = path.join(DIST, 'sample_data');
fs.mkdirSync(pdfDestApi, { recursive: true });
fs.mkdirSync(pdfDestSample, { recursive: true });

for (const file of fs.readdirSync(SAMPLE_DATA_DIR)) {
  if (file.endsWith('.pdf')) {
    fs.copyFileSync(path.join(SAMPLE_DATA_DIR, file), path.join(pdfDestApi, file));
    fs.copyFileSync(path.join(SAMPLE_DATA_DIR, file), path.join(pdfDestSample, file));
  }
}

copyDirRecursive(
  path.join(SAMPLE_DATA_DIR, 'fhir_bundles'),
  path.join(DIST, 'sample_data/fhir_bundles')
);

const stat = fs.statSync(bundleOut);
console.log(`✓ Built dist/standalone-engine.js (${(stat.size / 1024).toFixed(1)} KB)`);
console.log('✓ AWS Amplify static bundle ready in dist/');
