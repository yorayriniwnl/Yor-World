from pathlib import Path

content = Path('deliveries/B4/build-resident-production.py').read_text(encoding='utf-8')

# 1. Update paths
old_block = """SCRIPT_DIR = Path(__file__).resolve().parent
OUT = SCRIPT_DIR
EVIDENCE = OUT / "evidence"
EVIDENCE.mkdir(parents=True, exist_ok=True)"""

new_block = """SCRIPT_DIR = Path(__file__).resolve().parent
DELIVERY_DIR = SCRIPT_DIR.parent
OUT = DELIVERY_DIR / "assets"
SOURCE_DIR = OUT / "source"
EVIDENCE = DELIVERY_DIR / "validator-logs"
OUT.mkdir(parents=True, exist_ok=True)
SOURCE_DIR.mkdir(parents=True, exist_ok=True)
EVIDENCE.mkdir(parents=True, exist_ok=True)"""

content = content.replace(old_block, new_block)

# 2. Update blend save paths
content = content.replace('OUT / "resident-production.blend"', 'SOURCE_DIR / "resident-production.blend"')
old_save = 'bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE_DIR / "resident-production.blend"))'
new_save = """bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE_DIR / "resident-production.blend"))
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE_DIR / "fixture-production.blend"))"""
content = content.replace(old_save, new_save)

# 3. Update manifest path
content = content.replace('OUT / "resident-manifest.json"', 'EVIDENCE / "resident-manifest.json"')

# 4. Update render flag so it doesn't do slow offline cycles rendering by default
content = content.replace('if "--no-render" not in sys.argv:', 'if "--render" in sys.argv:')

target = Path('deliveries/FINISH-B1/scripts/build-resident-fixture.py')
target.write_text(content, encoding='utf-8')
print("Successfully generated build-resident-fixture.py! File size:", target.stat().st_size)
