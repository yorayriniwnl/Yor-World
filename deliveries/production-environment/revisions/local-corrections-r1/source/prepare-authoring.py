"""Copy historical inputs into the explicitly assigned successor; never run old builders."""
from pathlib import Path
import hashlib
import json

REVISION_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = REVISION_ROOT.parents[3]

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

inputs = []
for rel, target in [
    ("deliveries/production-environment/source/build-environment.py", "environment/build-environment.py"),
    ("deliveries/B4/source/build-resident-production.py", "resident-fixture/build-resident-production.py"),
]:
    src = REPO_ROOT / rel
    dst = REVISION_ROOT / "source" / target
    if dst.exists():
        raise RuntimeError(f"Refusing to overwrite prepared source: {dst}")
    dst.parent.mkdir(parents=True, exist_ok=True)
    code = src.read_text(encoding="utf-8")
    inputs.append({"path": rel, "sha256": sha(src), "bytes": src.stat().st_size})
    if "environment/" in target:
        code = code.replace("Author: Gemini #2 (World / Art Maker)", "Historical input author: Gemini #2; successor executor: local Codex remediation_art_maker")
        code = code.replace("DELIVERY_DIR = SCRIPT_DIR.parent", "DELIVERY_DIR = SCRIPT_DIR.parents[1]\nATTEMPT = sys.argv[sys.argv.index('--attempt') + 1] if '--attempt' in sys.argv else 'build-attempt-01'\nATTEMPT_DIR = DELIVERY_DIR / 'evidence' / ATTEMPT\nif ATTEMPT_DIR.exists():\n    raise RuntimeError('Attempt already exists; preserve it and choose a new --attempt')\nATTEMPT_DIR.mkdir(parents=True)\nsys.path.insert(0, str(SCRIPT_DIR.parent))\nfrom art_refinements import refine_environment, record_scene")
        code = code.replace('RUNTIME_DIR = DELIVERY_DIR / "runtime"', 'RUNTIME_DIR = ATTEMPT_DIR / "runtime"')
        code = code.replace('RENDERS_DIR = DELIVERY_DIR / "renders"', 'RENDERS_DIR = ATTEMPT_DIR / "renders"')
        code = code.replace('EVIDENCE_DIR = DELIVERY_DIR / "evidence"', 'EVIDENCE_DIR = ATTEMPT_DIR')
        code = code.replace('    child.parent = parent\n    child.matrix_parent_inverse = parent.matrix_world.inverted()', '    world = child.matrix_world.copy()\n    child.parent = parent\n    child.matrix_parent_inverse.identity()\n    child.matrix_world = world')
        code = code.replace('        obj.parent = parent', '        set_parent_keep_world(obj, parent)')
        code = code.replace('        empty.parent = parent', '        set_parent_keep_world(empty, parent)')
        code = code.replace('    # 3. Setup Cameras\n', '    refine_environment(bpy, materials, r2b, add_box, add_cylinder, add_sphere, set_parent_keep_world)\n    record_scene(bpy, EVIDENCE_DIR / "authored-scene.json", b2r)\n\n    # 3. Setup Cameras\n')
        code = code.replace('blend_path = SCRIPT_DIR / "production-environment.blend"', 'blend_path = ATTEMPT_DIR / "production-environment.blend"')
        code = code.replace('    render_camera_passes(cameras, RENDERS_DIR)', '    if "--no-render" not in sys.argv:\n        render_camera_passes(cameras, RENDERS_DIR)')
    else:
        code = code.replace('OUT = SCRIPT_DIR\nEVIDENCE = OUT / "evidence"\nEVIDENCE.mkdir(parents=True, exist_ok=True)', 'REVISION_ROOT = SCRIPT_DIR.parents[1]\nATTEMPT = sys.argv[sys.argv.index("--attempt") + 1] if "--attempt" in sys.argv else "fixture-attempt-01"\nEVIDENCE = REVISION_ROOT / "evidence" / ATTEMPT\nif EVIDENCE.exists():\n    raise RuntimeError("Attempt already exists; preserve it and choose a new --attempt")\nEVIDENCE.mkdir(parents=True)\nOUT = EVIDENCE / "runtime"\nOUT.mkdir()\nsys.path.insert(0, str(SCRIPT_DIR.parent))\nfrom art_refinements import refine_fixture, record_scene')
        code = code.replace('# --- Author Keyframe Animations for all 8 Clips ---', 'refine_fixture(bpy, blue, ivory, dark, chair_root, chair_base, chair_parts, base_parts, fixture_objects, make_box, make_cylinder)\n\n# --- Author Keyframe Animations for all 8 Clips ---')
        code = code.replace('export_gltf(OUT / "resident-production.glb", [rig, body])', '# Resident bytes intentionally retained from the historical public asset; no re-export.')
        code = code.replace('export_gltf(OUT / "fixture-production.glb", fixture_objects)', 'export_gltf(OUT / "fixture-production.glb", fixture_objects)\nrecord_scene(bpy, EVIDENCE / "authored-scene.json", lambda x, y, z: (x, z, -y))')
        resident_block = '        "resident-production.glb": {\n            "bytes": (OUT / "resident-production.glb").stat().st_size,\n            "sha256": hashlib.sha256((OUT / "resident-production.glb").read_bytes()).hexdigest(),\n        },\n'
        if resident_block not in code:
            raise RuntimeError("Resident export manifest block not found")
        code = code.replace(resident_block, '')
    dst.write_text(code, encoding="utf-8", newline="\n")

for src in sorted((REPO_ROOT / "deliveries/production-environment/source/textures").glob("*.png")):
    dst = REVISION_ROOT / "source/environment/textures" / src.name
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_bytes(src.read_bytes())
    inputs.append({"path": src.relative_to(REPO_ROOT).as_posix(), "sha256": sha(src), "bytes": src.stat().st_size})

for rel in ["references/images/main-reference.png", "references/manifest.json", "docs/planning/reconciliation-packets/2026-10-09-local-corrections-03.md", "docs/planning/art-and-experience.md", "docs/planning/validation-and-production.md"]:
    src = REPO_ROOT / rel
    inputs.append({"path": rel, "sha256": sha(src), "bytes": src.stat().st_size})
(REVISION_ROOT / "input-register.json").write_text(json.dumps({"executor": "local Codex /root/remediation_art_maker", "inputs": inputs}, indent=2) + "\n", encoding="utf-8", newline="\n")
print("Prepared new owned authoring revision; historical builders were only read.")
