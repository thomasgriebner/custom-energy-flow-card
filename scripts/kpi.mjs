#!/usr/bin/env node
// scripts/kpi.mjs — Wartbarkeits-KPI-Snapshot für custom-energy-flow-card
// Aufruf: pnpm kpi (JSON nach stdout) | pnpm kpi:snapshot --label X --phase Y
// | pnpm kpi:report (Delta zwischen letzten zwei Snapshots).
// Logging: keine Prefixe (analog smoke-test.mjs); stderr mit kpi.mjs:-Prefix.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import ts from 'typescript';

const SCHEMA_VERSION = '1.0';
const REPO_ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');
const SRC_DIR = join(REPO_ROOT, 'src');
const HISTORY_FILE = join(REPO_ROOT, 'metrics/kpi-history.json');

// LOC-Limits aus conventions §3 — Pfad-Map, Fallback 250.
const FILE_LOC_LIMITS = {
  'src/card.ts': 200,
  'src/editor.ts': 400,
  'src/engine/energy-engine.ts': 300,
};
const DEFAULT_LOC_LIMIT = 250;
const COMPLEXITY_LIMIT = 10;
const FUNCTION_LOC_LIMIT = 50;
const PARAMS_LIMIT = 4; // conv §1.5: >4 = Verstoß; 4 ist KPI-grün (Code-Review-Hinweis OK).
const FAN_IN_LIMIT = 10;
const MAX_NESTING_LIMIT = 4;
const BUNDLE_BUDGET_BYTES = 64 * 1024; // 64 KiB — siehe ADR-0022 (Bump 60→64 KiB)
const COVERAGE_REQUIRED_LAYERS = ['engine', 'config', 'util'];
const COVERAGE_MIN_PCT = 90;

function listSrcFiles() {
  const result = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.ts')) result.push(full);
    }
  };
  walk(SRC_DIR);
  return result.map((p) => relative(REPO_ROOT, p).replace(/\\/g, '/'));
}

// experimentalDecorators: true zwingend für Lit-Card.ts/editor.ts (@customElement/@property).
function createTsProgram(files) {
  return ts.createProgram(
    files.map((p) => join(REPO_ROOT, p)),
    {
      experimentalDecorators: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      allowJs: false,
      noEmit: true,
    },
  );
}

function countLoc(sourceText) {
  let count = 0;
  let inBlockComment = false;
  for (const line of sourceText.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    if (inBlockComment) {
      if (t.includes('*/')) inBlockComment = false;
      continue;
    }
    if (t.startsWith('/*')) {
      if (!t.endsWith('*/')) inBlockComment = true;
      continue;
    }
    if (t.startsWith('//')) continue;
    count++;
  }
  return count;
}

const CYC_KINDS = new Set([
  ts.SyntaxKind.IfStatement,
  ts.SyntaxKind.CaseClause,
  ts.SyntaxKind.ForStatement,
  ts.SyntaxKind.ForInStatement,
  ts.SyntaxKind.ForOfStatement,
  ts.SyntaxKind.WhileStatement,
  ts.SyntaxKind.DoStatement,
  ts.SyntaxKind.CatchClause,
  ts.SyntaxKind.ConditionalExpression,
]);
const CYC_BIN_OPS = new Set([
  ts.SyntaxKind.AmpersandAmpersandToken,
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.QuestionQuestionToken,
]);
function cyclomaticForFunction(funcNode) {
  let complexity = 1;
  const visit = (node) => {
    if (CYC_KINDS.has(node.kind)) complexity++;
    else if (
      node.kind === ts.SyntaxKind.BinaryExpression &&
      CYC_BIN_OPS.has(node.operatorToken.kind)
    )
      complexity++;
    ts.forEachChild(node, visit);
  };
  visit(funcNode);
  return complexity;
}

const NESTING_KINDS = new Set([
  ts.SyntaxKind.IfStatement,
  ts.SyntaxKind.ForStatement,
  ts.SyntaxKind.ForInStatement,
  ts.SyntaxKind.ForOfStatement,
  ts.SyntaxKind.WhileStatement,
  ts.SyntaxKind.DoStatement,
  ts.SyntaxKind.SwitchStatement,
  ts.SyntaxKind.TryStatement,
]);
function maxNestingForFunction(funcNode) {
  let max = 0;
  const visit = (node, depth) => {
    if (depth > max) max = depth;
    const nd = NESTING_KINDS.has(node.kind) ? depth + 1 : depth;
    ts.forEachChild(node, (c) => visit(c, nd));
  };
  visit(funcNode, 0);
  return max;
}

// TS-API: getStart() braucht sourceFile-Arg, da node.parent nicht durchs Program gesetzt wird.
function functionMetrics(funcNode, sf) {
  const { line: ls } = sf.getLineAndCharacterOfPosition(funcNode.getStart(sf));
  const { line: le } = sf.getLineAndCharacterOfPosition(funcNode.end);
  return {
    name: funcNode.name?.getText(sf) ?? '<anonymous>',
    loc: le - ls + 1,
    cyclomatic: cyclomaticForFunction(funcNode),
    max_nesting: maxNestingForFunction(funcNode),
    params: funcNode.parameters?.length ?? 0,
    line_start: ls + 1,
  };
}

function countEscapeHatches(src) {
  const m = (re) => (src.match(re) || []).length;
  return {
    any: m(/\b(?:as\s+any|:\s*any\b|<\s*any\b|any\s*[,\]\)>])/g),
    as: m(/\bas\s+[A-Z]/g),
    non_null: m(/[a-zA-Z_$\]\)]\s*!\.\s*[a-zA-Z_$]/g),
    eslint_disable: m(/eslint-disable/g),
    ts_directive: m(/@ts-(expect-error|ignore|nocheck)/g),
    todo: m(/\bTODO\b|\bFIXME\b/g),
  };
}

function countCustomElementsAcrossSrc(files) {
  let count = 0;
  for (const path of files) {
    if (path.endsWith('.test.ts')) continue;
    const text = readFileSync(join(REPO_ROOT, path), 'utf8');
    // @customElement(...) — Argument darf String-Literal, Template-Literal oder
    // Identifier sein (z. B. CARD_TYPE oder `${CARD_TYPE}-editor`).
    count += (text.match(/@customElement\s*\(/g) || []).length;
  }
  return count;
}

function extractImports(sf) {
  const imports = [];
  sf.forEachChild((node) => {
    if (ts.isImportDeclaration(node)) {
      const spec = node.moduleSpecifier.getText(sf).replace(/['"]/g, '');
      if (spec.startsWith('.')) imports.push(spec);
    }
  });
  return imports;
}

function extractExports(sf) {
  const exported = [];
  sf.forEachChild((node) => {
    if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const el of node.exportClause.elements) exported.push(el.name.getText(sf));
      return;
    }
    if (!ts.canHaveModifiers(node)) return;
    const hasExport = ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!hasExport) return;
    if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) {
      if (node.name) exported.push(node.name.getText(sf));
    } else if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) exported.push(decl.name.getText(sf));
      }
    }
  });
  return exported;
}

const FUNC_PREDS = [
  ts.isFunctionDeclaration,
  ts.isMethodDeclaration,
  ts.isArrowFunction,
  ts.isFunctionExpression,
];
function analyzeFile(relPath, program) {
  const sf = program.getSourceFile(join(REPO_ROOT, relPath));
  if (!sf) throw new Error(`kpi.mjs: kein SourceFile für ${relPath}`);
  const sourceText = sf.getFullText();
  const functions = [];
  const collect = (node) => {
    if (FUNC_PREDS.some((p) => p(node))) functions.push(functionMetrics(node, sf));
    ts.forEachChild(node, collect);
  };
  collect(sf);
  const imports = extractImports(sf);
  return {
    path: relPath,
    is_test: relPath.endsWith('.test.ts'),
    loc: countLoc(sourceText),
    imports_count: imports.length,
    imports,
    exports: extractExports(sf),
    functions,
    escape_hatches: countEscapeHatches(sourceText),
  };
}

function layerForPath(p) {
  if (p.startsWith('src/engine/')) return 'engine';
  if (p.startsWith('src/config/')) return 'config';
  if (p.startsWith('src/render/')) return 'render';
  if (p.startsWith('src/util/')) return 'util';
  if (p.startsWith('src/ha/')) return 'ha';
  if (p.startsWith('src/i18n/')) return 'i18n';
  return 'card_editor';
}

function resolveImport(fromPath, spec) {
  let r = join(dirname(fromPath), spec).replace(/\\/g, '/');
  if (!r.endsWith('.ts')) r += '.ts';
  return r;
}

function buildImportGraph(analyses) {
  const fanIn = new Map();
  for (const a of analyses) fanIn.set(a.path, 0);
  for (const a of analyses) {
    for (const spec of a.imports) {
      const r = resolveImport(a.path, spec);
      if (fanIn.has(r)) fanIn.set(r, fanIn.get(r) + 1);
    }
  }
  return fanIn;
}

// Heuristik: importierte Datei => alle Exports gelten als verwendet
// (False-Negative bei selektiven Imports — akzeptiert v1.0).
// Allowlist: src/index.ts (HACS-Entry) + card/editor.ts (Custom-Element-Boot).
function findDeadExports(analyses) {
  const skip = new Set(['src/index.ts', 'src/card.ts', 'src/editor.ts']);
  const imported = new Set();
  for (const a of analyses) for (const s of a.imports) imported.add(resolveImport(a.path, s));
  const dead = [];
  for (const a of analyses) {
    if (a.is_test || skip.has(a.path)) continue;
    if (!imported.has(a.path) && a.exports.length > 0) {
      dead.push({ path: a.path, exports: a.exports });
    }
  }
  return dead;
}

function findIntraLayerCycles(analyses) {
  const cycles = [];
  const byLayer = new Map();
  for (const a of analyses) {
    const layer = layerForPath(a.path);
    if (!byLayer.has(layer)) byLayer.set(layer, []);
    byLayer.get(layer).push(a);
  }
  for (const [layer, files] of byLayer) {
    const adj = new Map();
    const inLayer = new Set(files.map((f) => f.path));
    for (const f of files) {
      const edges = [];
      for (const spec of f.imports) {
        const r = resolveImport(f.path, spec);
        if (inLayer.has(r) && r !== f.path) edges.push(r);
      }
      adj.set(f.path, edges);
    }
    const visited = new Set();
    const stack = new Set();
    const dfs = (node, path) => {
      if (stack.has(node)) {
        cycles.push([layer, path.slice(path.indexOf(node)).concat(node)]);
        return;
      }
      if (visited.has(node)) return;
      visited.add(node);
      stack.add(node);
      for (const next of adj.get(node) || []) dfs(next, path.concat(node));
      stack.delete(node);
    };
    for (const f of files) if (!visited.has(f.path)) dfs(f.path, []);
  }
  return cycles;
}

function readCoverage() {
  const path = join(REPO_ROOT, 'coverage/coverage-summary.json');
  if (!existsSync(path)) {
    console.error('kpi.mjs: coverage/coverage-summary.json fehlt (pnpm test:coverage?), pct=null');
    return { total: null, per_layer: {} };
  }
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  const total = raw.total?.lines?.pct ?? null;
  const sum = {};
  const cnt = {};
  for (const [filePath, stats] of Object.entries(raw)) {
    if (filePath === 'total') continue;
    const rel = relative(REPO_ROOT, filePath).replace(/\\/g, '/');
    if (!rel.startsWith('src/')) continue;
    const layer = layerForPath(rel);
    const pct = stats.lines?.pct ?? 0;
    sum[layer] = (sum[layer] || 0) + pct;
    cnt[layer] = (cnt[layer] || 0) + 1;
  }
  const per_layer = {};
  for (const layer of Object.keys(sum)) {
    per_layer[layer] = cnt[layer] > 0 ? +(sum[layer] / cnt[layer]).toFixed(1) : null;
  }
  return { total, per_layer };
}

function readBundleBytes() {
  const path = join(REPO_ROOT, 'dist/custom-energy-flow-card.js');
  if (!existsSync(path)) {
    console.error(
      'kpi.mjs: dist/custom-energy-flow-card.js fehlt (pnpm build?), bundle_bytes=null',
    );
    return null;
  }
  return statSync(path).size;
}

function readDependencies() {
  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));
  return {
    runtime: Object.keys(pkg.dependencies || {}).length,
    dev: Object.keys(pkg.devDependencies || {}).length,
  };
}

function detectViolations(snapshot) {
  const v = {
    loc_exceeds_limit: [],
    complexity_above_10: [],
    function_loc_above_50: [],
    params_above_4: [],
    fan_in_above_10: [],
    max_nesting_above_4: [],
    coverage_below_90_pure_layers: [],
    bundle_above_budget:
      snapshot.totals.bundle_bytes != null && snapshot.totals.bundle_bytes > BUNDLE_BUDGET_BYTES,
    custom_elements_not_2: snapshot.totals.custom_elements_count !== 2,
    any_in_pure_layers: [],
    non_null_in_pure_layers: [],
    missing_tests_pure_layers: [],
    import_cycles: snapshot.import_cycles || [],
    dead_exports: snapshot.dead_exports || [],
  };
  for (const f of snapshot.files) {
    if (f.is_test) continue;
    const limit = FILE_LOC_LIMITS[f.path] ?? DEFAULT_LOC_LIMIT;
    if (f.loc > limit) v.loc_exceeds_limit.push({ path: f.path, loc: f.loc, limit });
    if (f.fan_in > FAN_IN_LIMIT) v.fan_in_above_10.push({ path: f.path, value: f.fan_in });
    for (const fn of f.functions) {
      const fnRef = { path: f.path, function: fn.name };
      if (fn.cyclomatic > COMPLEXITY_LIMIT)
        v.complexity_above_10.push({ ...fnRef, value: fn.cyclomatic });
      if (fn.loc > FUNCTION_LOC_LIMIT) v.function_loc_above_50.push({ ...fnRef, value: fn.loc });
      if (fn.params > PARAMS_LIMIT) v.params_above_4.push({ ...fnRef, value: fn.params });
      if (fn.max_nesting > MAX_NESTING_LIMIT)
        v.max_nesting_above_4.push({ ...fnRef, value: fn.max_nesting });
    }
    const layer = layerForPath(f.path);
    if (COVERAGE_REQUIRED_LAYERS.includes(layer)) {
      if (f.escape_hatches.any > 0)
        v.any_in_pure_layers.push({ path: f.path, count: f.escape_hatches.any });
      if (f.escape_hatches.non_null > 0)
        v.non_null_in_pure_layers.push({ path: f.path, count: f.escape_hatches.non_null });
      const expectedTest = f.path.replace(/\.ts$/, '.test.ts');
      if (!snapshot.files.find((g) => g.path === expectedTest))
        v.missing_tests_pure_layers.push(f.path);
    }
  }
  for (const [layer, l] of Object.entries(snapshot.layers)) {
    if (
      COVERAGE_REQUIRED_LAYERS.includes(layer) &&
      l.coverage_pct != null &&
      l.coverage_pct < COVERAGE_MIN_PCT
    )
      v.coverage_below_90_pure_layers.push({ layer, pct: l.coverage_pct });
  }
  return v;
}

function gitInfo() {
  try {
    return {
      commit: execSync('git rev-parse HEAD', { cwd: REPO_ROOT }).toString().trim(),
      branch: execSync('git branch --show-current', { cwd: REPO_ROOT }).toString().trim(),
    };
  } catch {
    console.error('kpi.mjs: git nicht verfügbar oder nicht in Repo');
    return { commit: 'unknown', branch: 'unknown' };
  }
}

function buildSnapshot(label, phase) {
  const files = listSrcFiles();
  const program = createTsProgram(files);
  const analyses = files.map((p) => analyzeFile(p, program));
  const fanIn = buildImportGraph(analyses);
  for (const a of analyses) a.fan_in = fanIn.get(a.path) || 0;

  const cycles = findIntraLayerCycles(analyses);
  const dead = findDeadExports(analyses);
  const coverage = readCoverage();
  const bundleBytes = readBundleBytes();
  const deps = readDependencies();
  const customElementsCount = countCustomElementsAcrossSrc(files);

  const layers = {};
  for (const a of analyses) {
    if (a.is_test) continue;
    const layer = layerForPath(a.path);
    if (!layers[layer])
      layers[layer] = { files: 0, loc: 0, complexity_sum: 0, escape_hatches_sum: 0 };
    layers[layer].files++;
    layers[layer].loc += a.loc;
    for (const fn of a.functions) layers[layer].complexity_sum += fn.cyclomatic;
    const eh = a.escape_hatches;
    layers[layer].escape_hatches_sum +=
      eh.any + eh.as + eh.non_null + eh.eslint_disable + eh.ts_directive + eh.todo;
  }
  for (const layer of Object.keys(layers)) {
    const l = layers[layer];
    l.complexity_avg = l.files > 0 ? +(l.complexity_sum / l.files).toFixed(1) : 0;
    l.coverage_pct = coverage.per_layer[layer] ?? null;
  }

  const sourceFiles = analyses.filter((a) => !a.is_test);
  const sumEh = (k) => sourceFiles.reduce((s, a) => s + a.escape_hatches[k], 0);
  const totals = {
    loc: sourceFiles.reduce((s, a) => s + a.loc, 0),
    files: sourceFiles.length,
    coverage_pct: coverage.total,
    bundle_bytes: bundleBytes,
    any_count: sumEh('any'),
    as_count: sumEh('as'),
    non_null_count: sumEh('non_null'),
    eslint_disable_count: sumEh('eslint_disable'),
    ts_directive_count: sumEh('ts_directive'),
    todo_count: sumEh('todo'),
    custom_elements_count: customElementsCount,
    dependencies: deps,
  };

  const { commit, branch } = gitInfo();
  const snapshot = {
    version: SCHEMA_VERSION,
    timestamp: new Date().toISOString(),
    commit,
    branch,
    plan_id: label.replace(/^(pre|post|manual)-/, ''),
    phase,
    label,
    totals,
    layers,
    files: analyses.map((a) => ({
      path: a.path,
      layer: layerForPath(a.path),
      is_test: a.is_test,
      loc: a.loc,
      imports_count: a.imports_count,
      fan_in: a.fan_in,
      exports: a.exports,
      functions: a.functions,
      escape_hatches: a.escape_hatches,
    })),
    import_cycles: cycles,
    dead_exports: dead,
  };
  snapshot.violations = detectViolations(snapshot);
  return snapshot;
}

function loadHistory() {
  if (!existsSync(HISTORY_FILE)) return [];
  return JSON.parse(readFileSync(HISTORY_FILE, 'utf8'));
}
function appendSnapshot(snapshot) {
  const history = loadHistory();
  history.push(snapshot);
  writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2) + '\n', 'utf8');
}

function renderDeltaReport(pre, post) {
  const delta = (a, b) => {
    if (a == null || b == null) return '(n/a)';
    const d = b - a;
    return `(${d > 0 ? '+' : ''}${d})`;
  };
  const row = (lbl, a, b, withDelta = true, suf = '') =>
    `  ${lbl.padEnd(20)}${a ?? 'n/a'} → ${b ?? 'n/a'}${suf}${withDelta ? '  ' + delta(a, b) : ''}`;
  const t = (k) => post.totals[k];
  const p = (k) => pre.totals[k];
  const ehKeys = [
    'any_count',
    'as_count',
    'non_null_count',
    'eslint_disable_count',
    'ts_directive_count',
    'todo_count',
  ];
  const ceOk = post.totals.custom_elements_count === 2 ? 'OK' : 'FEHLER';
  const lines = [
    `=== KPI Delta: ${pre.label} → ${post.label} ===`,
    `(commit ${pre.commit.slice(0, 8)} → ${post.commit.slice(0, 8)}, branch ${post.branch})`,
    '',
    'Totals:',
    row('LOC:', p('loc'), t('loc')),
    row('Files:', p('files'), t('files')),
    row('Coverage:', p('coverage_pct'), t('coverage_pct'), false),
    row('Bundle:', p('bundle_bytes'), t('bundle_bytes'), false, ' B'),
    ...ehKeys.map((k) => row(k, p(k), t(k))),
    `  custom_elements:    ${post.totals.custom_elements_count} (${ceOk})`,
    row(
      'deps (runtime):',
      pre.totals.dependencies.runtime,
      post.totals.dependencies.runtime,
      false,
    ),
    row('deps (dev):', pre.totals.dependencies.dev, post.totals.dependencies.dev, false),
    '',
    'Layer-Coverage:',
  ];
  for (const layer of Object.keys(post.layers)) {
    const a = (pre.layers[layer] || {}).coverage_pct;
    const b = post.layers[layer].coverage_pct;
    if (a != null || b != null) lines.push(`  ${layer.padEnd(12)}${a ?? 'n/a'} → ${b ?? 'n/a'}`);
  }
  lines.push('', 'Threshold-Verstöße — Delta pre → post:');
  for (const key of Object.keys(post.violations).filter((k) => Array.isArray(post.violations[k]))) {
    const preList = pre.violations[key] || [];
    const postList = post.violations[key] || [];
    const violationKey = (item) => {
      if (typeof item === 'string') return item;
      const parts = [item.path];
      if (item.function) parts.push(item.function);
      if (item.from && item.to) return `${item.from}->${item.to}`;
      return parts.join('::') || JSON.stringify(item);
    };
    const preMap = new Map(preList.map((item) => [violationKey(item), item]));
    const postMap = new Map(postList.map((item) => [violationKey(item), item]));
    for (const [k, item] of postMap) {
      const preItem = preMap.get(k);
      if (preItem == null) {
        lines.push(`  - ${key}: NEW ${JSON.stringify(item)}`);
      } else if (
        typeof item === 'object' &&
        item.value != null &&
        typeof preItem === 'object' &&
        preItem.value != null &&
        item.value !== preItem.value
      ) {
        const dir = item.value > preItem.value ? 'REGRESSED' : 'IMPROVED';
        lines.push(`  - ${key}: ${dir} ${k} (${preItem.value} → ${item.value})`);
      }
    }
    for (const [k, preItem] of preMap) {
      if (!postMap.has(k)) lines.push(`  - ${key}: RESOLVED ${JSON.stringify(preItem)}`);
    }
  }
  const n = loadHistory().length;
  lines.push('', `Historie-Position: post-Snapshot ist Eintrag ${n}/${n}`);
  return lines.join('\n');
}

// ─── CLI ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const mode = args.includes('--snapshot')
  ? 'snapshot'
  : args.includes('--report')
    ? 'report'
    : 'print';
const flagValue = (name) => {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
};

if (mode === 'snapshot') {
  const label = flagValue('--label') || `manual-${new Date().toISOString().slice(0, 10)}`;
  const phase = flagValue('--phase') || 'manual';
  if (!['pre', 'post', 'manual'].includes(phase)) {
    console.error(`kpi.mjs: --phase muss pre|post|manual sein, war "${phase}"`);
    process.exit(2);
  }
  appendSnapshot(buildSnapshot(label, phase));
  console.log(`✓ Snapshot "${label}" (phase=${phase}) appendet`);
} else if (mode === 'report') {
  const history = loadHistory();
  if (history.length < 2) {
    console.error('kpi.mjs: Mindestens 2 Snapshots in History für Delta-Report nötig');
    process.exit(2);
  }
  const [pre, post] = history.slice(-2);
  console.log(renderDeltaReport(pre, post));
} else {
  console.log(JSON.stringify(buildSnapshot('stdout', 'manual'), null, 2));
}
