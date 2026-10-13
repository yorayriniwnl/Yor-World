const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync, execFileSync } = require('node:child_process');

const repo = process.cwd();
const A1 = {
  commit: '76d679dcb98064152021830b98f16eb456b3ae19',
  branch: 'codex/finish-29-a1-r5-r7-20261011',
  base: 'f62a43c5e71c00dcb89e28275ea81d842167db80',
  pkg: 'deliveries/FINISH-A1/r5-07',
  expectedTree: '6bb0a24c3ec9b716a4728b88fc0e07d5df440cd6',
  expectedSubtree: '61026e89795d28aa212ee2e03c8edc05b2aea97a',
  expectedBaseApp: '42ea29ec235225046a75959eb19eb386ac2f821d',
  expectedSourceApp: '1bcaa9acde89fdb9541c3f2abde913a4ed2d2ec3',
  expectedReplayApp: 'ba8f952edc34e94393c48b25779071daab9a9812',
  expectedManifestSha256: '5c42034d1ceb9cf938d7a536a436b3b53cee8094c48e3e934c419dad0fafa420',
  expectedPatchSha256: 'aa9b91f613a0f1b98e6da7735ec0513d10d0e1c2e78512fff63ecc19ee717dd8',
  outputRoot: 'deliveries/completion-audits/FINISH-A1/finish-09/20261011T231434Z-a1-r5-r7-parent-local-technical-recheck-03-ad5e3362'
};
const C1 = {
  commit: '3dda9a616033375768f3d5f60f8c653d504f7c8c',
  branch: 'codex/finish-30-c1-r9-20261011',
  base: 'c398876583bc337c069414b79364e3fdea745879',
  pkg: 'deliveries/FINISH-C1-R9',
  priorPkg: 'deliveries/FINISH-C1-R8',
  expectedTree: '5a38d405499737ff40b0141a64845c244a9e4813',
  expectedSubtree: 'aa097f12adff2dbac2c88d6300c949f37bf34251',
  expectedBaseTree: '798de513703f3d7e76f8d82edb85257d32894681',
  expectedBaseSubtree: 'da822d0362e06e92497001583afb7405b7ccd472',
  expectedRootApp: '42ea29ec235225046a75959eb19eb386ac2f821d',
  expectedManifestSha256: '31903805363ed7d56521d334893d40d99079a716e1b374ac2a4c1895ecaff465',
  outputRoot: 'deliveries/completion-audits/FINISH-C1/finish-16/20261011T231434Z-c1-r9-parent-local-technical-recheck-03-ad5e3362'
};
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
function run(args, opts = {}) {
  const r = spawnSync('git', args, { cwd: repo, encoding: null, maxBuffer: 256 * 1024 * 1024, ...opts });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed (${r.status}): ${Buffer.from(r.stderr || '').toString('utf8')}`);
  return Buffer.from(r.stdout || '');
}
const str = (args, opts = {}) => run(args, opts).toString('utf8').trimEnd();
function oidAt(commit, file) { return str(['rev-parse', `${commit}:${file}`]).trim(); }
function rawBlob(oid) { return run(['cat-file', 'blob', oid]); }
function rawAt(commit, file) { return rawBlob(oidAt(commit, file)); }
function jsonAt(commit, file) { return JSON.parse(rawAt(commit, file).toString('utf8')); }
function treeEntries(commit, prefix) {
  const out = str(['ls-tree', '-r', '-l', commit, '--', prefix]);
  if (!out) return [];
  return out.split(/\r?\n/).filter(Boolean).map(line => {
    const tab = line.indexOf('\t');
    const head = line.slice(0, tab).split(/\s+/);
    const fullPath = line.slice(tab + 1);
    return { mode: head[0], type: head[1], oid: head[2], size: Number(head[3]), path: fullPath.slice(prefix.length + 1) };
  });
}
function resultCheck(id, ok, detail) { return { id, status: ok ? 'PASS' : 'FAIL', detail }; }
function verifyManifest(commit, pkg, expectedSha, expectedCount, expectedBytes) {
  const checks = [];
  const manifestPath = `${pkg}/output-hashes.json`;
  const manifestBytes = rawAt(commit, manifestPath);
  const manifestSha = sha(manifestBytes);
  const m = JSON.parse(manifestBytes.toString('utf8'));
  const rows = m.files || m.outputs;
  const actual = treeEntries(commit, pkg).filter(x => x.path !== 'output-hashes.json');
  const actualByPath = new Map(actual.map(x => [x.path, x]));
  const mismatches = [];
  for (const row of rows) {
    const file = `${pkg}/${row.path}`;
    let bytes;
    try { bytes = rawAt(commit, file); }
    catch (e) { mismatches.push({ path: row.path, problem: `missing blob: ${e.message}` }); continue; }
    const gotSha = sha(bytes);
    if (bytes.length !== row.bytes || gotSha !== row.sha256) mismatches.push({ path: row.path, expectedBytes: row.bytes, actualBytes: bytes.length, expectedSha256: row.sha256, actualSha256: gotSha });
  }
  const listed = rows.map(x => x.path).sort();
  const actualNames = actual.map(x => x.path).sort();
  const samePaths = JSON.stringify(listed) === JSON.stringify(actualNames);
  const total = rows.reduce((n, x) => n + x.bytes, 0);
  checks.push(resultCheck('manifest-sha256', manifestSha === expectedSha, { expected: expectedSha, actual: manifestSha }));
  checks.push(resultCheck('manifest-row-count', rows.length === expectedCount, { expected: expectedCount, actual: rows.length }));
  checks.push(resultCheck('manifest-total-bytes', total === expectedBytes, { expected: expectedBytes, actual: total }));
  checks.push(resultCheck('manifest-vs-git-tree-path-set', samePaths, { manifestRows: listed.length, treeFiles: actualNames.length, missingFromTree: listed.filter(x => !actualNames.includes(x)), unlistedTreeFiles: actualNames.filter(x => !listed.includes(x)) }));
  checks.push(resultCheck('raw-git-blob-hashes-and-sizes', mismatches.length === 0, { verifiedRows: rows.length - mismatches.length, totalRows: rows.length, mismatches }));
  return { manifestSha256: manifestSha, rowCount: rows.length, totalBytes: total, checks };
}
function remoteOid(branch) {
  const out = str(['ls-remote', 'origin', `refs/heads/${branch}`]);
  return out ? out.split(/\s+/)[0] : null;
}
function headTree(commit) { return str(['rev-parse', `${commit}^{tree}`]).trim(); }
function parent(commit) { return str(['rev-parse', `${commit}^`]).trim(); }
function subtree(commit, p) { return str(['rev-parse', `${commit}:${p}`]).trim(); }

function auditA1() {
  const checks = [];
  const tree = headTree(A1.commit);
  const rootApp = subtree(A1.commit, 'app');
  const pkgTree = subtree(A1.commit, A1.pkg);
  const sourceTree = subtree(A1.commit, `${A1.pkg}/source/app`);
  const remote = remoteOid(A1.branch);
  checks.push(resultCheck('candidate-commit-tree', tree === A1.expectedTree, { expected: A1.expectedTree, actual: tree }));
  checks.push(resultCheck('candidate-parent-is-exact-base', parent(A1.commit) === A1.base, { expected: A1.base, actual: parent(A1.commit) }));
  checks.push(resultCheck('remote-branch-points-to-candidate', remote === A1.commit, { expected: A1.commit, actual: remote }));
  checks.push(resultCheck('candidate-root-app-unchanged', rootApp === A1.expectedBaseApp, { expected: A1.expectedBaseApp, actual: rootApp }));
  checks.push(resultCheck('candidate-package-subtree', pkgTree === A1.expectedSubtree, { expected: A1.expectedSubtree, actual: pkgTree }));
  checks.push(resultCheck('packaged-source-app-subtree', sourceTree === A1.expectedSourceApp, { expected: A1.expectedSourceApp, actual: sourceTree }));
  const manifest = verifyManifest(A1.commit, A1.pkg, A1.expectedManifestSha256, 79, 1695825);
  checks.push(...manifest.checks);
  const patch = rawAt(A1.commit, `${A1.pkg}/source.patch`);
  const patchSha = sha(patch);
  const patchText = new TextDecoder('utf-8', { fatal: true }).decode(patch);
  const noBom = !(patch.length >= 3 && patch[0] === 0xef && patch[1] === 0xbb && patch[2] === 0xbf);
  checks.push(resultCheck('patch-sha256-and-utf8', patchSha === A1.expectedPatchSha256 && noBom, { expectedSha256: A1.expectedPatchSha256, actualSha256: patchSha, validUtf8: true, bom: !noBom }));
  const patchPaths = [...patchText.matchAll(/^diff --git a\/(.+) b\/(.+)$/gm)].map(m => m[1]);
  const changedText = rawAt(A1.commit, `${A1.pkg}/changed-paths.txt`).toString('utf8').trim();
  const changedPaths = changedText.split(/\r?\n/).filter(Boolean).sort();
  checks.push(resultCheck('patch-vs-changed-paths', JSON.stringify([...patchPaths].sort()) === JSON.stringify(changedPaths), { patchCount: patchPaths.length, inventoryCount: changedPaths.length, patchPaths: [...patchPaths].sort(), inventoryPaths: changedPaths }));
  const contract = fs.readFileSync(path.join(repo, 'docs/planning/reconciliation-packets/finish-contracts-r2/02-platform-schema-recovery.md'), 'utf8');
  const section = contract.split('### FINISH-A1:')[1]?.split('### FINISH-A2:')[0] || '';
  const allow = [...section.matchAll(/^\|\s*`([^`]+)`\s*\|/gm)].map(m => m[1]).filter(p => p.startsWith('src/') || p.startsWith('tests/')).sort();
  const patchAppPaths = patchPaths.map(p => p.startsWith('app/') ? p.slice(4) : `INVALID:${p}`).sort();
  const unauthorized = patchAppPaths.filter(p => !allow.includes(p));
  checks.push(resultCheck('frozen-26-path-allowlist', allow.length === 26 && patchPaths.length === 25 && unauthorized.length === 0, { allowlistCount: allow.length, changedCount: patchPaths.length, unauthorized, unusedAllowed: allow.filter(p => !patchAppPaths.includes(p)) }));
  const input = jsonAt(A1.commit, `${A1.pkg}/input-hashes.json`);
  const reused = input.diagnosticReferenceOnly?.reusedPaths || [];
  const inputMismatches = [];
  for (const row of reused) {
    try {
      const referencePath = 'deliveries/FINISH-A1/r5-05/source/' + row.path;
      const bytes = rawAt(input.diagnosticReferenceOnly.commit, referencePath);
      if (bytes.length !== row.bytes || sha(bytes) !== row.sha256) inputMismatches.push({ path: row.path, expectedBytes: row.bytes, actualBytes: bytes.length, expected: row.sha256, actual: sha(bytes) });
    } catch (e) { inputMismatches.push({ path: row.path, error: e.message }); }
  }
  checks.push(resultCheck('diagnostic-prior-candidate-input-receipts', inputMismatches.length === 0, { sourceCommit: input.diagnosticReferenceOnly?.commit, rows: reused.length, mismatches: inputMismatches }));
  const diff = str(['diff', '--name-only', A1.base, A1.commit]).split(/\r?\n/).filter(Boolean);
  const unrelated = diff.filter(p => !p.startsWith(`${A1.pkg}/`));
  checks.push(resultCheck('delivery-commit-is-package-only', unrelated.length === 0 && diff.length === treeEntries(A1.commit, A1.pkg).length, { diffPathCount: diff.length, packagePathCount: treeEntries(A1.commit, A1.pkg).length, outsidePackage: unrelated }));
  const index = path.join(repo, A1.outputRoot, '.work', 'a1-replay-rerun.index');
  if (fs.existsSync(index)) throw new Error(`alternate replay index already exists: ${index}`);
  const env = { ...process.env, GIT_INDEX_FILE: index };
  run(['read-tree', A1.base], { env });
  const checkApply = spawnSync('git', ['apply', '--cached', '--check'], { cwd: repo, env, input: patch, encoding: null, maxBuffer: 16 * 1024 * 1024 });
  const checkApplyText = Buffer.concat([Buffer.from(checkApply.stdout || ''), Buffer.from(checkApply.stderr || '')]).toString('utf8');
  checks.push(resultCheck('exact-base-patch-apply-check', checkApply.status === 0, { exitCode: checkApply.status, output: checkApplyText }));
  let replayTree = null;
  let replayApp = null;
  let sourceMismatch = [];
  if (checkApply.status === 0) {
    const apply = spawnSync('git', ['apply', '--cached'], { cwd: repo, env, input: patch, encoding: null, maxBuffer: 16 * 1024 * 1024 });
    if (apply.status === 0) {
      replayTree = str(['write-tree'], { env }).trim();
      replayApp = subtree(replayTree, 'app');
      const sourceEntries = treeEntries(A1.commit, `${A1.pkg}/source/app`);
      for (const entry of sourceEntries) {
        const sourceBytes = rawBlob(entry.oid);
        const replayPath = `app/${entry.path}`;
        try {
          const replayBytes = rawAt(replayTree, replayPath);
          if (!sourceBytes.equals(replayBytes)) sourceMismatch.push(replayPath);
        } catch (_) { sourceMismatch.push(replayPath); }
      }
      checks.push(resultCheck('replayed-app-tree', replayApp === A1.expectedReplayApp, { expected: A1.expectedReplayApp, actual: replayApp, fullReplayTree: replayTree }));
      checks.push(resultCheck('packaged-source-replacements-match-replay', sourceMismatch.length === 0 && sourceEntries.length === 25, { sourceFiles: sourceEntries.length, mismatches: sourceMismatch }));
    } else {
      checks.push(resultCheck('exact-base-patch-replay', false, { exitCode: apply.status, output: Buffer.concat([Buffer.from(apply.stdout || ''), Buffer.from(apply.stderr || '')]).toString('utf8') }));
    }
  }
  return {
    candidate: 'FINISH-A1 R5-R7',
    binding: { branch: A1.branch, remoteCommit: remote, commit: A1.commit, parent: parent(A1.commit), fullTree: tree, packageTree: pkgTree, rootAppTree: rootApp, sourceAppTree: sourceTree, expectedReplayAppTree: A1.expectedReplayApp, actualReplayAppTree: replayApp, base: A1.base },
    outputManifest: manifest,
    patch: { sha256: patchSha, bytes: patch.length, changedPathCount: patchPaths.length },
    checks,
    passed: checks.every(x => x.status === 'PASS')
  };
}

function auditC1() {
  const checks = [];
  const tree = headTree(C1.commit);
  const rootApp = subtree(C1.commit, 'app');
  const pkgTree = subtree(C1.commit, C1.pkg);
  const priorTree = headTree(C1.base);
  const priorPkgTree = subtree(C1.base, C1.priorPkg);
  const remote = remoteOid(C1.branch);
  checks.push(resultCheck('candidate-commit-tree', tree === C1.expectedTree, { expected: C1.expectedTree, actual: tree }));
  checks.push(resultCheck('candidate-parent-is-exact-r8', parent(C1.commit) === C1.base, { expected: C1.base, actual: parent(C1.commit) }));
  checks.push(resultCheck('remote-branch-points-to-candidate', remote === C1.commit, { expected: C1.commit, actual: remote }));
  checks.push(resultCheck('candidate-root-app-unchanged', rootApp === C1.expectedRootApp, { expected: C1.expectedRootApp, actual: rootApp }));
  checks.push(resultCheck('r9-package-subtree', pkgTree === C1.expectedSubtree, { expected: C1.expectedSubtree, actual: pkgTree }));
  checks.push(resultCheck('r8-input-tree-and-subtree', priorTree === C1.expectedBaseTree && priorPkgTree === C1.expectedBaseSubtree, { expectedTree: C1.expectedBaseTree, actualTree: priorTree, expectedSubtree: C1.expectedBaseSubtree, actualSubtree: priorPkgTree }));
  const manifest = verifyManifest(C1.commit, C1.pkg, C1.expectedManifestSha256, 26, 145757);
  const priorManifest = verifyManifest(C1.base, C1.priorPkg, null, 22, 140981);
  // R8 is a predecessor package; its own manifest hash is not an R9 acceptance gate.
  priorManifest.checks = priorManifest.checks.filter(x => x.id !== 'manifest-sha256');
  checks.push(...manifest.checks);
  checks.push(...priorManifest.checks.map(x => ({ ...x, id: `r8-${x.id}` })));
  const r8Entries = treeEntries(C1.base, C1.priorPkg);
  const r9Entries = treeEntries(C1.commit, C1.pkg);
  const r8By = new Map(r8Entries.map(x => [x.path, x]));
  const r9By = new Map(r9Entries.map(x => [x.path, x]));
  const actualDelta = [];
  for (const [p, e9] of r9By) {
    const e8 = r8By.get(p);
    if (!e8) actualDelta.push(p);
    else if (!rawBlob(e8.oid).equals(rawBlob(e9.oid))) actualDelta.push(p);
  }
  for (const p of r8By.keys()) if (!r9By.has(p)) actualDelta.push(`DELETED:${p}`);
  actualDelta.sort();
  const declaredDoc = jsonAt(C1.commit, `${C1.pkg}/changed-paths.json`);
  const declared = [...declaredDoc.changedPaths].sort();
  checks.push(resultCheck('r9-vs-r8-changed-path-inventory', JSON.stringify(actualDelta) === JSON.stringify(declared), { declared, actualDelta, r8FileCount: r8Entries.length, r9FileCount: r9Entries.length }));
  const r8Matrix = jsonAt(C1.base, `${C1.priorPkg}/requirement-matrix.json`);
  const r9Matrix = jsonAt(C1.commit, `${C1.pkg}/requirement-matrix.json`);
  const r8Rows = new Map(r8Matrix.results.map(x => [x.id, x]));
  const r9Rows = new Map(r9Matrix.results.map(x => [x.id, x]));
  const statusDiff = [];
  const rowDiff = [];
  for (const [id, row9] of r9Rows) {
    const row8 = r8Rows.get(id);
    if (!row8) { rowDiff.push({ id, problem: 'missing in R8' }); continue; }
    if (row8.status !== row9.status) statusDiff.push({ id, r8: row8.status, r9: row9.status });
    const a = { ...row8 };
    if (id === 'E-02-05') a.evidence = row9.evidence;
    if (JSON.stringify(a) !== JSON.stringify(row9)) rowDiff.push({ id, problem: 'unexpected non-pointer matrix change' });
  }
  const e205 = r9Rows.get('E-02-05');
  const e205Expected = ['evidence/cli-negative-false-pass.json'];
  checks.push(resultCheck('matrix-statuses-and-claims', statusDiff.length === 0 && rowDiff.length === 0 && r8Rows.size === r9Rows.size && r8Matrix.candidateCommit === r9Matrix.candidateCommit && r8Matrix.packet === r9Matrix.packet, { rowCountR8: r8Rows.size, rowCountR9: r9Rows.size, statusDiff, rowDiff, e205Evidence: e205?.evidence }));
  checks.push(resultCheck('e205-only-json-evidence', JSON.stringify(e205?.evidence) === JSON.stringify(e205Expected), { expected: e205Expected, actual: e205?.evidence }));
  const r9Names = new Set(r9Entries.map(x => x.path));
  const unresolved = [];
  for (const row of r9Matrix.results) for (const rel of row.evidence || []) if (!r9Names.has(rel)) unresolved.push({ id: row.id, evidence: rel });
  checks.push(resultCheck('all-matrix-evidence-paths-resolve', unresolved.length === 0, { referencesChecked: r9Matrix.results.reduce((n, row) => n + (row.evidence || []).length, 0), unresolved }));
  const r8Script = rawAt(C1.base, `${C1.priorPkg}/scripts/finalize.py`).toString('utf8');
  const r9Script = rawAt(C1.commit, `${C1.pkg}/scripts/finalize.py`).toString('utf8');
  const r8RowsText = r8Script.split(/\r?\n/).filter(line => line.includes('"id": "E-02-05"'));
  const r9RowsText = r9Script.split(/\r?\n/).filter(line => line.includes('"id": "E-02-05"'));
  const r9Template = r9RowsText.join('\n');
  const templateOk = r8RowsText.length === 1 && r9RowsText.length === 1 && r8RowsText[0].includes('evidence/cli-negative-false-pass.log') && r9Template.includes('"evidence": ["evidence/cli-negative-false-pass.json"]') && !r9Template.includes('cli-negative-false-pass.log');
  const r8Lines = r8Script.split(/\r?\n/), r9Lines = r9Script.split(/\r?\n/);
  const otherScriptChanges = [];
  const r8Norm = r8Lines.map(l => l.replace(', "evidence/cli-negative-false-pass.log"', ''));
  if (JSON.stringify(r8Norm) !== JSON.stringify(r9Lines)) otherScriptChanges.push('R8 finalizer differs from R9 beyond the authorized .log evidence token');
  checks.push(resultCheck('finalizer-template-only-e205-pointer-change', templateOk && otherScriptChanges.length === 0, { r8Template: r8RowsText, r9Template: r9RowsText, otherScriptChanges }));
  const falseReceipt = jsonAt(C1.commit, `${C1.pkg}/evidence/cli-negative-false-pass.json`);
  let stdoutParsed = null; try { stdoutParsed = JSON.parse(falseReceipt.stdout); } catch (_) {}
  const before = falseReceipt.originalReceiptSha256BeforeAndAfter?.before;
  const after = falseReceipt.originalReceiptSha256BeforeAndAfter?.after;
  const falseOk = falseReceipt.status === 'PASS' && falseReceipt.exitCode === 1 && falseReceipt.parsedResult?.status === 'FAIL' && JSON.stringify(stdoutParsed) === JSON.stringify(falseReceipt.parsedResult) && falseReceipt.stderr === '' && before === after && falseReceipt.mutation?.disposableCopyOnly === true && falseReceipt.command?.includes('--check-output-manifest');
  checks.push(resultCheck('false-pass-receipt', falseOk, { case: falseReceipt.case, status: falseReceipt.status, childExit: falseReceipt.exitCode, parsedStatus: falseReceipt.parsedResult?.status, stdoutMatches: JSON.stringify(stdoutParsed) === JSON.stringify(falseReceipt.parsedResult), stderrEmpty: falseReceipt.stderr === '', originalReceiptUnchanged: before === after, disposableCopyOnly: falseReceipt.mutation?.disposableCopyOnly, command: falseReceipt.command }));
  const commitDiff = str(['diff', '--name-only', C1.base, C1.commit]).split(/\r?\n/).filter(Boolean);
  const nonR9 = commitDiff.filter(p => !p.startsWith(`${C1.pkg}/`));
  checks.push(resultCheck('delivery-commit-adds-only-r9-root', nonR9.length === 0 && commitDiff.every(p => p.startsWith(`${C1.pkg}/`)), { changedPathCount: commitDiff.length, outsideR9: nonR9 }));
  return {
    candidate: 'FINISH-C1 R9',
    binding: { branch: C1.branch, remoteCommit: remote, commit: C1.commit, parent: parent(C1.commit), fullTree: tree, packageTree: pkgTree, rootAppTree: rootApp, r8Input: C1.base, r8Tree: priorTree, r8PackageTree: priorPkgTree },
    outputManifest: manifest,
    predecessorManifest: priorManifest,
    changedPathInventory: { declared, actual: actualDelta },
    checks,
    passed: checks.every(x => x.status === 'PASS')
  };
}

const a1 = auditA1();
const c1 = auditC1();
const result = { schemaVersion: 1, auditType: 'Parent-local exact-candidate technical recheck; not external GPT Plus #2', generatedAt: new Date().toISOString(), a1, c1 };
const a1Out = path.join(repo, A1.outputRoot, 'evidence', 'raw-git-verification.json');
const c1Out = path.join(repo, C1.outputRoot, 'evidence', 'raw-git-verification.json');
fs.writeFileSync(a1Out, JSON.stringify({ ...result, c1: undefined }, null, 2) + '\n', 'utf8');
fs.writeFileSync(c1Out, JSON.stringify({ ...result, a1: undefined }, null, 2) + '\n', 'utf8');
process.stdout.write(JSON.stringify({ a1: { passed: a1.passed, checks: a1.checks.map(x => ({ id: x.id, status: x.status })), binding: a1.binding, manifest: a1.outputManifest }, c1: { passed: c1.passed, checks: c1.checks.map(x => ({ id: x.id, status: x.status })), binding: c1.binding, manifest: c1.outputManifest, priorManifest: c1.predecessorManifest, changed: c1.changedPathInventory } }, null, 2) + '\n');
if (!a1.passed || !c1.passed) process.exitCode = 1;