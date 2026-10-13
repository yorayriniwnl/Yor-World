"""Independent adversarial entry-point probes; all mutations stay in this audit's fixtures."""
from pathlib import Path
import hashlib, json, subprocess, sys

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[4]
SOURCE = 'a' * 40
SCRIPT = ROOT / 'deliveries/G7/preparation/tools/assemble-evidence.py'
RESULTS = []

def fixture(name):
    root = OUT / 'fixtures' / name
    root.mkdir(parents=True, exist_ok=False)
    subprocess.run(['git', 'init', '--quiet', str(root)], check=True)
    delivery = root / 'deliveries/G7/rc6-candidate-r7'
    (delivery / 'evidence').mkdir(parents=True)
    (root / 'scripts/release').mkdir(parents=True)
    policy = {'deliveryRoot': 'deliveries/G7/rc6-candidate-r7', 'releaseId': 'v1.0.0-rc6',
              'bundle': {'path': 'deliveries/G7/rc6-candidate-r6/frozen.bundle.tar.gz'}, 'requiredChecks': ['lint']}
    (root / 'scripts/release/rc6-policy.json').write_text(json.dumps(policy))
    record = {'id':'lint', 'sourceCommit':SOURCE, 'evidencePath':'deliveries/G7/rc6-candidate-r7/evidence/missing.log',
              'evidenceSha256':'0'*64, 'attempt':1, 'command':['false'], 'exitCode':99, 'durationSeconds':1}
    (delivery / 'evidence/execution.jsonl').write_text(json.dumps(record)+'\n')
    (delivery / 'release-manifest.json').write_text(json.dumps({'evidenceHashes':[], 'requiredChecks':[]}))
    return root, delivery

def run(name, root, delivery, protected=None):
    before = protected.read_bytes() if protected else None
    args=[sys.executable,'-B',str(SCRIPT),'--repository',str(root),'--source',SOURCE,'--inventory-only']
    result=subprocess.run(args, capture_output=True, text=True)
    RESULTS.append({'case':name,'command':args,'exitCode':result.returncode,'stdout':result.stdout,'stderr':result.stderr,
        'commandsCreated':(delivery/'commands-and-exit-codes.md').exists(),
        'checksumCreated':(delivery/'SHA256SUMS.txt').exists(),
        'protectedChanged': protected.read_bytes()!=before if protected else None})

root, delivery=fixture('invalid-policy-and-execution')
run('inventory-only accepts preserved archive policy plus failed nonexistent-hash execution',root,delivery)
root, delivery=fixture('missing-manifest')
(delivery/'release-manifest.json').unlink()
run('inventory-only mutates before missing manifest rejection',root,delivery)
root, delivery=fixture('late-output-hardlink')
protected=root/'deliveries/G7/rc6-candidate-r6/sentinel.txt'
protected.parent.mkdir(parents=True)
protected.write_text('immutable fixture\n')
(delivery/'SHA256SUMS.txt').hardlink_to(protected)
run('late output hardlink rejects only after earlier output mutations',root,delivery,protected)
(OUT/'assembler-probes.json').write_text(json.dumps({'scriptSha256':hashlib.sha256(SCRIPT.read_bytes()).hexdigest(),'results':RESULTS},indent=2)+'\n')
print(json.dumps(RESULTS,indent=2))
