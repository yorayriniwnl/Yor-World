"""
Automated glTF 2.0 Asset Exporter for YOR WORLD FINISH-B1-R2
Executes reproducible exports of all conforming art assets using Blender 5.2.2 LTS.
"""

import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
SCRIPT_DIR = Path(__file__).resolve().parent
DELIVERY_DIR = SCRIPT_DIR.parent.parent

BLENDER_EXE = r"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"

def run_blender_script(script_path):
    print(f"Running Blender on {script_path.name}...")
    cmd = [BLENDER_EXE, "--background", "--python", str(script_path)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"FAILED: {script_path.name}\n{result.stderr}")
        return False
    print(f"SUCCESS: {script_path.name}")
    return True

def main():
    print("=" * 80)
    print("FINISH-B1-R2 ASSET EXPORT SUITE")
    print("=" * 80)

    # 1. Generate procedural textures
    gen_tex = SCRIPT_DIR / "generate-textures.py"
    if gen_tex.exists():
        print("Generating procedural textures...")
        subprocess.run([sys.executable, str(gen_tex)], check=True)

    # 2. Build resident and fixture
    build_rf = SCRIPT_DIR / "build-resident-fixture.py"
    if not run_blender_script(build_rf):
        sys.exit(1)

    # 3. Build room environment, group b, and on demand projects
    build_env = SCRIPT_DIR / "build-environment.py"
    if not run_blender_script(build_env):
        sys.exit(1)

    print("All FINISH-B1-R2 assets successfully exported!")

if __name__ == "__main__":
    main()
