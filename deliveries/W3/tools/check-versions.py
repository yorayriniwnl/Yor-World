"""Read official npm metadata. Does not install or edit dependencies."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
import json
import os
import urllib.request
import urllib.error

root = Path(__file__).resolve().parents[1]
package = json.loads((root / 'source/package.json').read_text(encoding='utf-8'))
pins = package['dependencies'] | package['devDependencies'] | {'pnpm': '9.15.9'}
evidence = Path(os.environ.get('W3_PROOF_EVIDENCE', str(root / 'evidence/a1-current'))).resolve()
if not evidence.is_relative_to(root / 'evidence'):
    raise SystemExit('Evidence output must stay under deliveries/W3/evidence/.')
destination = evidence / 'registry-metadata.json'
if destination.exists():
    raise SystemExit('Registry evidence already exists. Set W3_PROOF_EVIDENCE to a fresh evidence directory.')

def get(url):
    try:
        with urllib.request.urlopen(url, timeout=30) as response:
            return {'url': url, 'status': response.status, 'data': json.load(response)}
    except urllib.error.HTTPError as error:
        return {'url': url, 'status': error.code, 'error': error.read().decode()}

def inspect(pair):
    name, version = pair
    exact = get(f'https://registry.npmjs.org/{name}/{version}')
    latest = get(f'https://registry.npmjs.org/{name}/latest')
    record = {'name': name, 'pin': version, 'exact': exact, 'latest': latest}
    print(name, version, 'HTTP', exact['status'], 'latest', latest.get('data', {}).get('version'), flush=True)
    return record

with ThreadPoolExecutor(max_workers=6) as pool:
    packages = list(pool.map(inspect, pins.items()))
result = {'checkedAt': datetime.now(timezone.utc).isoformat(), 'packages': packages,
          'announcedPatches': [get('https://registry.npmjs.org/next/16.3.8'),
                               get('https://registry.npmjs.org/next/15.5.27')]}
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_text(json.dumps(result, indent=2), encoding='utf-8')
print('Announced patches:', [(r['url'], r['status']) for r in result['announcedPatches']])
if any(p['exact']['status'] != 200 or '-' in p['pin'] for p in packages):
    raise SystemExit('A pin is not a verified stable registry version.')
