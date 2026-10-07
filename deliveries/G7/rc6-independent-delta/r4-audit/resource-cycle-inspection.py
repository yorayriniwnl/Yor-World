"""Parse retained maker disposal evidence; do not execute a browser or claim heap/GPU absence."""
from pathlib import Path
import datetime
import hashlib
import json

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
file = ROOT / "deliveries/G7/rc6-candidate-r4/evidence/performance/enter-exit-stability.json"
raw = file.read_bytes()
data = json.loads(raw)
cycles = []
for cycle in data["cycles"]:
    active = cycle["activeDiagnostics"]
    after = cycle["afterExit"]
    passed = (active["renderedFrames"] > 0 and active["renderCalls"] > 0 and active["renderedTriangles"] > 0
              and cycle["canvasCount"] == 0 and after["canvasConnected"] is False
              and after["renderedFrames"] == cycle["stoppedFrames"] and after["contextLost"] is True)
    cycles.append({"cycle": cycle["cycle"], "activeRenderedFrames": active["renderedFrames"],
                   "activeCalls": active["renderCalls"], "activeTriangles": active["renderedTriangles"],
                   "stoppedFrames": cycle["stoppedFrames"], "afterExit": after,
                   "status": "PASS" if passed else "FAIL"})
receipt = {"observedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
           "source": "30240b672ae31537d8090b11b60f8bf808a27670", "buildId": data["buildId"],
           "rawEvidenceSha256": hashlib.sha256(raw).hexdigest(),
           "executionClass": "Own parsing of retained maker browser evidence; no own browser execution",
           "cycles": cycles, "heapLeakAbsence": "UNKNOWN", "gpuMemoryLeakAbsence": "UNKNOWN",
           "overallStatus": "PASS" if len(cycles) == 4 and all(item["status"] == "PASS" for item in cycles) else "FAIL"}
(HERE / "resource-cycle-inspection.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8", newline="\n")
print(json.dumps(receipt, indent=2))
if receipt["overallStatus"] != "PASS":
    raise SystemExit(1)
