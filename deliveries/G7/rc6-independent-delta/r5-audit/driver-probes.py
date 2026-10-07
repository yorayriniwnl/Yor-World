"""Own frozen Python writer/export checks on synthetic isolated sentinels."""
from pathlib import Path
from types import SimpleNamespace
import argparse
import datetime
import hashlib
import importlib.util
import json
import os
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
DRIVER = "deliveries/G7/preparation/tools/candidate-driver.py"

def sha(data):
    return hashlib.sha256(data).hexdigest()

def frozen(source, name):
    return subprocess.check_output(["git", "show", source + ":" + name], cwd=ROOT)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source")
    source = parser.parse_args().source
    driver_bytes = frozen(source, DRIVER)
    policy_bytes = frozen(source, "scripts/release/rc6-policy.json")
    policy = json.loads(policy_bytes)
    cases = []
    scratch = Path(tempfile.mkdtemp(prefix="yor-r5-independent-driver-")).resolve()
    parent = Path(tempfile.gettempdir()).resolve()
    if scratch.parent != parent or not scratch.name.startswith("yor-r5-independent-driver-"):
        raise SystemExit("Unsafe fixture root")
    driver_file = scratch / "candidate-driver.py"
    driver_file.write_bytes(driver_bytes)
    spec = importlib.util.spec_from_file_location("frozen_r5_driver", driver_file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    def write(file, data):
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_bytes(data)

    def make(label):
        base = scratch / label
        repo, checkout = base / "repo", base / "checkout"
        for root in [repo, checkout]:
            write(root / "scripts/release/rc6-policy.json", policy_bytes)
        return repo, checkout, module.Driver(SimpleNamespace(repository=repo, checkout=checkout,
               policy="scripts/release/rc6-policy.json", source=source))

    def rejects(label, operation, watched):
        before = [(path, path.exists(), path.read_bytes() if path.exists() else None) for path in watched]
        rejected, message = False, ""
        try:
            operation()
        except (ValueError, RuntimeError, OSError) as error:
            rejected, message = True, str(error)
        preservation = [{"path": str(path), "beforeSha256": sha(data) if data is not None else None,
                         "afterSha256": sha(path.read_bytes()) if path.exists() else None,
                         "unchanged": exists == path.exists() and (not exists or data == path.read_bytes())}
                        for path, exists, data in before]
        cases.append({"label": label, "rejected": rejected, "message": message, "preservation": preservation,
                      "status": "PASS" if rejected and all(x["unchanged"] for x in preservation) else "FAIL"})

    repo, checkout, driver = make("writer")
    preserved = repo / "deliveries/G7/rc6-candidate-r4/NOT-REAL-PROTECTED.json"
    output = repo / policy["deliveryRoot"] / "hardlinked-output.json"
    write(preserved, b'{"syntheticProtectedSentinel":true}\n')
    output.parent.mkdir(parents=True)
    os.link(preserved, output)
    rejects("Python safe_output hardlink preflight", lambda: module.safe_output(repo, output.relative_to(repo).as_posix()), [preserved, output])
    rejects("Python write_json direct hardlinked output", lambda: module.write_json(output, {"forbidden": True}), [preserved, output])
    stat = output.stat()
    cases[-1]["fileId"] = {"dev": str(stat.st_dev), "ino": str(stat.st_ino), "nlink": stat.st_nlink}
    cases.append({"label": "Python reader digest permits hardlinked input", "status": "PASS" if module.digest(output) == sha(preserved.read_bytes()) else "FAIL"})
    ordinary = repo / policy["deliveryRoot"] / "ordinary.json"
    module.write_json(ordinary, {"syntheticDistinctOutput": True})
    cases.append({"label": "Python ordinary single-link JSON writer remains usable",
                  "status": "PASS" if json.loads(ordinary.read_text())["syntheticDistinctOutput"] is True else "FAIL"})
    rejects("Python case-alias preserved R4 output", lambda: module.safe_output(repo, "DELIVERIES/G7/RC6-CANDIDATE-R4/new/output.json"), [preserved])
    alias = driver.destination / "history-alias"
    if os.name == "nt":
        subprocess.run(["cmd", "/c", "mklink", "/J", str(alias), str(preserved.parent)], check=True, capture_output=True)
    else:
        alias.symlink_to(preserved.parent, target_is_directory=True)
    rejects("Python nested directory alias into protected R4", lambda: module.safe_output(repo, (alias / "new/output.json").relative_to(repo).as_posix()), [preserved])

    repo, checkout, driver = make("export")
    preserved = repo / "deliveries/G7/rc6-candidate-r4/NOT-REAL-PROTECTED.json"
    write(preserved, b"Synthetic preserved export sentinel.\n")
    ordinary = driver.destination / "a-first.json"
    hard = driver.destination / "z-hard.json"
    write(ordinary, b"Original primary ordinary output.\n")
    os.link(preserved, hard)
    write(driver.delivery / "a-first.json", b"Different detached ordinary bytes.\n")
    write(driver.delivery / "z-hard.json", b"Attempted detached hardlink overwrite.\n")
    rejects("Driver export preflights all destinations before any copy", driver.export, [preserved, hard, ordinary])
    hard.unlink()
    driver.export()
    cases.append({"label": "Driver distinct canonical export remains usable",
                  "status": "PASS" if ordinary.read_bytes() == (driver.delivery / "a-first.json").read_bytes()
                  and hard.read_bytes() == (driver.delivery / "z-hard.json").read_bytes()
                  and preserved.read_bytes() == b"Synthetic preserved export sentinel.\n" else "FAIL"})
    result = {"createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
              "reviewer": "/root/r5_independent_audit", "sourceCommit": source, "platform": os.name,
              "executionClass": "Own frozen Python writer/export execution on synthetic isolated fixtures",
              "frozenDriverSha256": sha(driver_bytes), "frozenPolicySha256": sha(policy_bytes),
              "fixturePath": str(scratch), "cases": cases, "actualCandidateOrHistoryWrites": False,
              "productionEvidence": False, "overallStatus": "PASS" if all(x["status"] == "PASS" for x in cases) else "FAIL"}
    (HERE / "driver-probes.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"sourceCommit": source, "cases": [{k: v for k, v in x.items() if k != "preservation"} for x in cases],
                      "overallStatus": result["overallStatus"]}, indent=2))
    # Verify exact absolute target before recursive fixture cleanup.
    if scratch.resolve() != scratch or scratch.parent != parent or not scratch.name.startswith("yor-r5-independent-driver-"):
        raise SystemExit("Unsafe fixture cleanup target")
    shutil.rmtree(scratch)
    if result["overallStatus"] != "PASS":
        raise SystemExit(1)
