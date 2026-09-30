import struct
import json
from pathlib import Path

def inspect_glb(path):
    data = Path(path).read_bytes()
    chunk_len, chunk_type = struct.unpack_from('<I4s', data, 12)
    json_bytes = data[20:20+chunk_len]
    gltf = json.loads(json_bytes.decode('utf-8'))
    return gltf

w1 = inspect_glb('deliveries/W1/revisions/W1-F1-r2/room-blockout.glb')
w2_av = inspect_glb('deliveries/W2/avatar-proof.glb')
w2_fix = inspect_glb('deliveries/W2/fixture-proof.glb')

print('--- W1 RESIDENT / CHAIR NODES ---')
for i, n in enumerate(w1.get('nodes', [])):
    name = n.get('name', '')
    if 'resident' in name.lower() or 'chair' in name.lower():
        print(f"[{i}] {name} (translation: {n.get('translation')}, children: {n.get('children', [])})")

print('\n--- W2 AVATAR NODES ---')
for i, n in enumerate(w2_av.get('nodes', [])):
    print(f"[{i}] {n.get('name', '')} (translation: {n.get('translation')}, children: {n.get('children', [])})")

print('\n--- W2 FIXTURE ROOTS ---')
for root_idx in w2_fix.get('scenes', [{}])[0].get('nodes', []):
    node = w2_fix.get('nodes', [])[root_idx]
    print(f"Root [{root_idx}] {node.get('name', '')} (translation: {node.get('translation')}, children: {len(node.get('children', []))} children)")
