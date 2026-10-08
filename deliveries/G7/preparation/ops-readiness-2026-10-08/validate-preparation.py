"""Read-only bounded document/identity checks; no production validation."""
import hashlib
import json
import pathlib
import re
import subprocess
from datetime import datetime, timezone

root = pathlib.Path.cwd()
out = root / 'deliveries/G7/preparation/ops-readiness-2026-10-08'
docs = ['docs/operations/release-checklist.md', 'docs/operations/restore-record.md', 'docs/operations/production-execution-runbook.md']
inputs = ['START_HERE.md', 'docs/planning/delegation-and-work-orders.md', 'docs/planning/reconciliation-packets/2026-10-08-g7-ops-01.md', 'docs/planning/current-status.json', 'docs/planning/reviews/2026-10-08-rc6-r1.md', 'docs/operations/pre-g7-prerequisites.md', 'docs/planning/releases/2026-10-02-g7-production-release-protocol.md', 'deliveries/G7/preparation/tools/README.md', 'docs/operations/manual-device-checklist-template.md', 'app/package.json', 'app/pnpm-lock.yaml', 'app/.env.example', 'app/playwright.config.ts', 'app/src/server/operations/backup-restore.ts', 'app/src/server/database.ts', 'app/src/server/jobs/runner.ts', 'app/src/app/api/internal/jobs/[job]/route.ts', 'app/src/server/contact/email-adapter.ts', 'app/src/server/auth/require-owner.ts', 'app/src/server/auth/clients.ts', 'app/src/app/api/admin/media/route.ts', 'app/supabase/migrations/20261001000000_a3_owner_auth_rls.sql', 'app/supabase/migrations/20261001000001_a4_publication_media.sql', 'app/supabase/migrations/20261005000000_github_refresh_state.sql', 'app/supabase/operations/harden-publication-grants.sql']
def git(*args):
    return subprocess.check_output(['git', *args], cwd=root).decode('utf-8').replace('\r\n', '\n')
def sha(path):
    return hashlib.sha256((root / path).read_bytes()).hexdigest()
marker = '## Historical RC1 rehearsal'
previous = git('show', 'HEAD:docs/operations/restore-record.md')
current = (root / 'docs/operations/restore-record.md').read_text(encoding='utf-8')
historical_same = previous[previous.index(marker):] == current[current.index(marker):]
links = []
for doc in docs:
    content = (root / doc).read_text(encoding='utf-8')
    for target in re.findall(r'\]\(([^)]+)\)', content):
        if not target.startswith(('https://', 'http://')):
            path = (root / doc).parent / target.split('#')[0]
            links.append({'document': doc, 'target': target, 'exists': path.exists()})
receipt = {
    'category': 'LOCAL PREPARATION ONLY',
    'executedAt': datetime.now(timezone.utc).isoformat(),
    'headAtValidation': git('rev-parse', 'HEAD').strip(),
    'headAppTree': git('rev-parse', 'HEAD:app').strip(),
    'acceptedAppDelta': git('diff', '--name-only', '8e5b954e147a87e36a6869d9940c40f3d4c123f0', '--', 'app').splitlines(),
    'historicalRC1TextUnchanged': historical_same,
    'localLinks': links,
    'inputHashes': {path: sha(path) for path in inputs},
    'documentHashes': {path: sha(path) for path in docs},
    'acceptanceClaim': False,
}
(out / 'validation.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
print(json.dumps({key: value for key, value in receipt.items() if key not in ['inputHashes', 'documentHashes', 'localLinks']}, indent=2))
print('localLinks:', len(links), 'missing:', sum(not item['exists'] for item in links))
if not historical_same or any(not item['exists'] for item in links) or receipt['acceptedAppDelta']:
    raise SystemExit(1)
