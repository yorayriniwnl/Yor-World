"""Read exact-HEAD Actions proof; use existing Git credentials only in memory."""
import argparse
import datetime
import json
import pathlib
import subprocess
import urllib.error
import urllib.request

parser = argparse.ArgumentParser()
parser.add_argument('--head', required=True)
parser.add_argument('--output', required=True)
parser.add_argument('--source', required=True)
parser.add_argument('--release-id', choices=['v1.0.0-rc6'], default='v1.0.0-rc6')
args = parser.parse_args()
assert len(args.head) == 40 and all(c in '0123456789abcdef' for c in args.head)
assert len(args.source) == 40 and all(c in '0123456789abcdef' for c in args.source)
root = pathlib.Path(__file__).resolve().parents[4]
for revision in [args.head, args.source]:
    resolved = subprocess.check_output(['git', 'rev-parse', '--verify', revision + '^{commit}'], cwd=root, text=True).strip()
    if resolved != revision:
        raise RuntimeError('Revision did not resolve to its exact requested commit')
subprocess.run(['git', 'merge-base', '--is-ancestor', args.source, args.head], cwd=root, check=True)
changed = subprocess.check_output(['git', 'diff', '--name-only', args.source, args.head, '--', 'app', 'scripts/release', '.github/workflows'], cwd=root, text=True).strip()
if changed:
    raise RuntimeError('Candidate implementation changed after sourceCommit')
api = 'https://api.github.com/repos/yorayriniwnl/Yor-World'
import importlib.util
spec = importlib.util.spec_from_file_location("rc6_github_fetch", pathlib.Path(__file__).with_name("fetch-github.py"))
fetch = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fetch)
client = fetch.GitHubClient(128 * 1024 * 1024)

def get(url):
    if not url.startswith("https://api.github.com/repos/yorayriniwnl/Yor-World/"):
        raise fetch.FetchError("Unexpected Actions API origin")
    return client.api(url.removeprefix("https://api.github.com"))

quality_steps = [
    '1. Frozen canonical dependency install', '2. Lint canonical application',
    '3. Typecheck canonical application', '4. Unified unit tests',
    '5. Unified backend/runtime integration tests', '6. Khronos frozen canonical asset validation',
    '7. Full-stack production build', '8. Full unified Playwright E2E',
    '9. Automated accessibility', '10. Fresh canonical performance browser measurements',
    '11. Actual production route/module composition', '12. Fresh canonical performance budgets',
    '13. Exact committed ' + args.release_id.removeprefix('v1.0.0-').upper() + ' manifest/archive validation',
]
observed = []
runs = get(api + '/actions/runs?head_sha=' + args.head + '&per_page=30')
for name in ['Repository integrity', 'CI / Release Quality Gate']:
    matches = [run for run in runs['workflow_runs'] if run['head_sha'] == args.head and run['name'] == name and run['event'] == 'push']
    if not matches:
        observed.append({'workflow': name, 'status': 'not-yet-observed'})
        continue
    run = max(matches, key=lambda value: (value['run_attempt'], value['id']))
    item = {'workflow': name, 'runId': run['id'], 'runAttempt': run['run_attempt'], 'headSha': run['head_sha'], 'event': run['event'], 'status': run['status'], 'conclusion': run['conclusion'], 'url': run['html_url'], 'createdAt': run['created_at'], 'updatedAt': run['updated_at']}
    jobs = get(run['jobs_url'] + '?per_page=100')['jobs']
    item['jobs'] = [{'jobId': job['id'], 'name': job['name'], 'headSha': job['head_sha'], 'status': job['status'], 'conclusion': job['conclusion'], 'url': job['html_url'], 'steps': [{key: step.get(key) for key in ['number', 'name', 'status', 'conclusion', 'started_at', 'completed_at']} for step in job['steps']]} for job in jobs]
    required = quality_steps if name == 'CI / Release Quality Gate' else ['Verify reference manifest hashes', 'Verify live status surfaces agree', 'Verify accepted output protection']
    steps = [step for job in jobs for step in job['steps']]
    item['requiredSkippedSteps'] = [step['name'] for step in steps if step['name'] in required and step.get('conclusion') == 'skipped']
    item['missingSuccessfulRequiredSteps'] = [expected for expected in required if not any(step['name'] == expected and step.get('conclusion') == 'success' for step in steps)]
    observed.append(item)
data = {'releaseId': args.release_id, 'sourceCommit': args.source, 'recordedCandidateHead': args.head, 'observedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'workflows': observed}
green = all(item.get('conclusion') == 'success' and item.get('jobs') and all(job['conclusion'] == 'success' and job['headSha'] == args.head for job in item['jobs']) and not item.get('requiredSkippedSteps') and not item.get('missingSuccessfulRequiredSteps') for item in observed)
data['overallStatus'] = 'PASS' if green else 'PENDING' if any(item['status'] != 'completed' for item in observed) else 'FAIL'
target = pathlib.Path(args.output)
policy = json.loads((root / 'scripts/release/rc6-policy.json').read_text(encoding='utf-8'))
allowed = root / policy['deliveryRoot']
if not target.resolve().is_relative_to(allowed.resolve()):
    raise fetch.FetchError('Observer output must stay in the current successor evidence root')
fetch.ensure_no_symlinks(target)
fetch.save_json(target, data)
print(json.dumps({'head': args.head, 'overallStatus': data['overallStatus'], 'workflows': [{key: item.get(key) for key in ['workflow', 'runId', 'status', 'conclusion', 'requiredSkippedSteps', 'missingSuccessfulRequiredSteps']} for item in observed]}, indent=2))
