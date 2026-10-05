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
parser.add_argument('--release-id', choices=['v1.0.0-rc4', 'v1.0.0-rc5'], default='v1.0.0-rc5')
args = parser.parse_args()
assert len(args.head) == 40 and all(c in '0123456789abcdef' for c in args.head)
assert len(args.source) == 40 and all(c in '0123456789abcdef' for c in args.source)
api = 'https://api.github.com/repos/yorayriniwnl/Yor-World'
token = None

def get(url):
    global token
    headers = {'Accept': 'application/vnd.github+json', 'User-Agent': 'yor-world-rc5-evidence', 'X-GitHub-Api-Version': '2022-11-28'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        if error.code not in (401, 403, 429) or token:
            raise
        credential = subprocess.run(['git', 'credential', 'fill'], input='protocol=https\nhost=github.com\n\n', text=True, capture_output=True, check=True)
        fields = dict(line.split('=', 1) for line in credential.stdout.splitlines() if '=' in line)
        token = fields.get('password')
        if not token:
            raise RuntimeError('Public API unavailable and no existing Git credential found.') from error
        return get(url)

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
    required = quality_steps if name == 'CI / Release Quality Gate' else ['Verify reference manifest hashes', 'Verify live status surfaces agree']
    steps = [step for job in jobs for step in job['steps']]
    item['requiredSkippedSteps'] = [step['name'] for step in steps if step['name'] in required and step.get('conclusion') == 'skipped']
    item['missingSuccessfulRequiredSteps'] = [expected for expected in required if not any(step['name'] == expected and step.get('conclusion') == 'success' for step in steps)]
    observed.append(item)
data = {'releaseId': args.release_id, 'sourceCommit': args.source, 'recordedCandidateHead': args.head, 'observedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'workflows': observed}
green = all(item.get('conclusion') == 'success' and item.get('jobs') and all(job['conclusion'] == 'success' and job['headSha'] == args.head for job in item['jobs']) and not item.get('requiredSkippedSteps') and not item.get('missingSuccessfulRequiredSteps') for item in observed)
data['overallStatus'] = 'PASS' if green else 'PENDING' if any(item['status'] != 'completed' for item in observed) else 'FAIL'
target = pathlib.Path(args.output)
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(data, indent=2) + '\n', encoding='utf-8', newline='\n')
print(json.dumps({'head': args.head, 'overallStatus': data['overallStatus'], 'workflows': [{key: item.get(key) for key in ['workflow', 'runId', 'status', 'conclusion', 'requiredSkippedSteps', 'missingSuccessfulRequiredSteps']} for item in observed]}, indent=2))
