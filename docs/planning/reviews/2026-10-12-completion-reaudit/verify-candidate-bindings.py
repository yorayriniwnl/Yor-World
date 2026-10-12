import hashlib, json, subprocess

def run(repo, *args):
    return subprocess.run(["git", "-C", repo, *args], check=True, stdout=subprocess.PIPE).stdout

def verify(repo, commit, root, expected_base, manifest_name, item_key, excluded_key=None):
    raw_manifest = run(repo, "show", commit + ":" + root + manifest_name)
    manifest = json.loads(raw_manifest)
    items = manifest[item_key]
    errors = []
    for item in items:
        raw = run(repo, "cat-file", "blob", commit + ":" + root + item["path"])
        if len(raw) != item["bytes"] or hashlib.sha256(raw).hexdigest() != item["sha256"]:
            errors.append(item["path"])
    paths = run(repo, "ls-tree", "-r", "--name-only", commit, root).decode().splitlines()
    excluded = manifest.get(excluded_key, []) if excluded_key else []
    expected = {root + item["path"] for item in items} | {root + name for name in excluded}
    if manifest_name not in excluded:
        expected.add(root + manifest_name)
    changed = run(repo, "diff-tree", "--no-commit-id", "--name-only", "-r", commit).decode().splitlines()
    parent = run(repo, "rev-parse", commit + "^").decode().strip()
    app_tree = run(repo, "rev-parse", commit + ":app").decode().strip()
    base_app_tree = run(repo, "rev-parse", expected_base + ":app").decode().strip()
    return {
        "commit": commit,
        "tree": run(repo, "rev-parse", commit + "^{tree}").decode().strip(),
        "parent": parent,
        "expectedBase": expected_base,
        "exactBase": parent == expected_base,
        "appTree": app_tree,
        "baseAppTree": base_app_tree,
        "appUnchanged": app_tree == base_app_tree,
        "manifestSha256": hashlib.sha256(raw_manifest).hexdigest(),
        "manifestEntries": len(items),
        "manifestBytes": manifest.get("totalBytes", manifest.get("totalBytes", sum(x["bytes"] for x in items))),
        "manifestMismatches": errors,
        "packagePathCount": len(paths),
        "packageSetExact": set(paths) == expected,
        "unexpectedPackagePaths": sorted(set(paths) - expected),
        "missingPackagePaths": sorted(expected - set(paths)),
        "commitChangedPathCount": len(changed),
        "changesOutsideDelivery": [path for path in changed if not path.startswith(root)],
    }

result = {
    "reviewType": "parent-local raw Git package rebind; not external audit or acceptance",
    "candidates": {
        "A1-R8": verify(r"F:\\Yor-World-A1-R8", "e377e06c514819ee6dbd82da2216c95813bedd2f", "deliveries/FINISH-A1-R8/", "76d679dcb98064152021830b98f16eb456b3ae19", "output-hashes.json", "files"),
        "B1-R6": verify(r"F:\\Yor-World-B1-R6", "e8ea9187c1b6cd47b66ce7de9ad520daf9bd6baf", "deliveries/FINISH-B1-R6/", "a5ebcc88170703751a5f504f67aed637d2f7d8e9", "output-hashes.json", "files", "selfExcluded"),
        "C1-R9": verify(r"F:\\Yor-World-Gov-Exec", "3dda9a616033375768f3d5f60f8c653d504f7c8c", "deliveries/FINISH-C1-R9/", "c398876583bc337c069414b79364e3fdea745879", "output-hashes.json", "outputs"),
    }
}
for name, check in result["candidates"].items():
    check["status"] = "PASS" if check["exactBase"] and check["appUnchanged"] and not check["manifestMismatches"] and check["packageSetExact"] and not check["changesOutsideDelivery"] else "FAIL"
with open(r"F:\\Yor-World-Gov-Exec\\docs\\planning\\reviews\\2026-10-12-completion-reaudit\\candidate-integrity.json", "w", encoding="utf-8") as stream:
    json.dump(result, stream, indent=2)
    stream.write("\n")
print(json.dumps(result, indent=2))
