"""Offline declared-type/required-field/enum inspection, not full OpenAPI validation."""
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
schema_path = HERE / "request-schema.json"
payload_path = HERE.parent / "apply-20261008T031028142873Z/protection-payload.json"
schema = json.loads(schema_path.read_text(encoding="utf-8"))
payload = json.loads(payload_path.read_text(encoding="utf-8"))
failures, examined = [], []


def inspect(node, value, path):
    examined.append(path)
    if value is None and node.get("nullable"):
        return
    kind = node.get("type")
    matches = {"object": isinstance(value, dict), "array": isinstance(value, list),
               "string": isinstance(value, str), "integer": isinstance(value, int) and not isinstance(value, bool),
               "boolean": isinstance(value, bool), "number": isinstance(value, (int, float)) and not isinstance(value, bool)}
    if kind and not matches.get(kind, False):
        failures.append({"field": path, "reason": "Declared type mismatch", "expectedType": kind})
        return
    if "enum" in node and value not in node["enum"]:
        failures.append({"field": path, "reason": "Enum mismatch"})
    if isinstance(value, dict):
        for name in node.get("required", []):
            if name not in value:
                failures.append({"field": path + "." + name, "reason": "Required property missing"})
        for name, item in value.items():
            if name in node.get("properties", {}):
                inspect(node["properties"][name], item, path + "." + name)
            elif node.get("additionalProperties") is False:
                failures.append({"field": path + "." + name, "reason": "Additional property prohibited"})
    elif isinstance(value, list) and "items" in node:
        for index, item in enumerate(value):
            inspect(node["items"], item, path + f"[{index}]")


inspect(schema, payload, "request")
receipt = {"kind": "Offline declared type/required/enum structural inspection", "fullOpenAPIValidation": False,
           "schemaSha256": hashlib.sha256(schema_path.read_bytes()).hexdigest(),
           "payloadSha256": hashlib.sha256(payload_path.read_bytes()).hexdigest(),
           "examinedPaths": examined, "failures": failures, "status": "PASS" if not failures else "FAIL"}
(HERE / "structural-inspection.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
print(json.dumps(receipt, indent=2))
raise SystemExit(1 if failures else 0)
