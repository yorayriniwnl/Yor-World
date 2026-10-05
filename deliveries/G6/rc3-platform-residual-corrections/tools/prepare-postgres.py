"""Prepare an isolated loopback PostgreSQL fixture from publisher binaries; no service install."""
import datetime, hashlib, json, pathlib, subprocess, urllib.request, zipfile

root = pathlib.Path(__file__).resolve().parent.parent
fixture = pathlib.Path("C:/Users/yoray/AppData/Local/Temp/yw-pg-residual")
fixture.mkdir(parents=True, exist_ok=True)
archive = fixture / "postgresql-17.11-windows.zip"
publisher = "https://www.enterprisedb.com/download-postgresql-binaries"
url = "https://sbp.enterprisedb.com/getfile.jsp?fileid=1260616"
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
if not archive.exists():
    with urllib.request.urlopen(url, timeout=60) as response, archive.open("wb") as output:
        final_url = response.url
        while chunk := response.read(1024 * 1024):
            output.write(chunk)
else:
    final_url = "Previously downloaded publisher archive"
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
extracted = 0
with zipfile.ZipFile(archive) as package:
    for member in package.infolist():
        name = member.filename.replace("\\", "/")
        if not name.startswith(("pgsql/bin/", "pgsql/lib/", "pgsql/share/")):
            continue
        target = (fixture / name).resolve()
        if fixture.resolve() not in target.parents:
            raise RuntimeError("Archive target outside isolated fixture")
        if not target.exists():
            package.extract(member, fixture)
        extracted += 1
bin_path = fixture / "pgsql/bin"
log_entries = []
def run(label, argv):
    proc = subprocess.run([str(value) for value in argv], stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        creationflags=subprocess.CREATE_NO_WINDOW)
    output = proc.stdout.decode("utf-8", errors="replace")
    (root / "evidence" / f"postgres-{label}.log").write_bytes(proc.stdout)
    log_entries.append({"label": label, "command": [str(value) for value in argv], "exitCode": proc.returncode,
                       "log": f"postgres-{label}.log"})
    if proc.returncode:
        raise RuntimeError(f"PostgreSQL fixture {label} failed; see retained log")
    return output.strip()
(root / "evidence").mkdir(parents=True, exist_ok=True)
version = run("version", [bin_path / "postgres.exe", "--version"])
data = fixture / "data"
if not (data / "PG_VERSION").exists():
    run("initdb", [bin_path / "initdb.exe", "-D", data, "-U", "yw_residual", "-A", "trust", "--encoding=UTF8", "--locale=C"])
run("start", [bin_path / "pg_ctl.exe", "-D", data, "-l", fixture / "server.log", "-w", "-o", "-h 127.0.0.1 -p 55437 -F", "start"])
receipt = {"startedAtUtc": started, "endedAtUtc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "publisherPage": publisher, "downloadUrl": url, "resolvedDownloadUrl": final_url,
    "archiveBytes": archive.stat().st_size, "downloadSha256": digest, "extractedEntries": extracted,
    "fixture": str(fixture), "version": version, "commands": log_entries,
    "connection": "postgresql://yw_residual@127.0.0.1:55437/postgres",
    "scope": "Temporary loopback synthetic database; no Windows service, global PATH change, hosting or production data"}
(root / "evidence/postgres-fixture-identity.json").write_text(json.dumps(receipt, indent=2)+"\n", encoding="utf-8")
print(json.dumps(receipt), flush=True)
