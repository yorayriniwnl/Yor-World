"""
YOR WORLD - W1-F1-r2 glTF Export Inspection Script
Script: inspect-export.py
Author: W1 Room/Blockout Maker (Gemini-1)
Purpose: Read room-blockout.glb, compute evaluated world transformations for all nodes,
         and compare against native Blender world positions to verify exact spatial agreement.
"""

import json
import struct
import math
import os
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent
GLB_PATH = OUT.parent / "room-blockout.glb"
NATIVE_JSON = OUT / "native-inspection.json"

def read_glb_json(path):
    with open(path, "rb") as f:
        magic, ver, length = struct.unpack("<4sII", f.read(12))
        chunk_len, chunk_type = struct.unpack("<I4s", f.read(8))
        return json.loads(f.read(chunk_len).decode("utf-8"))

def multiply_matrices(a, b):
    # 4x4 matrix multiplication (column-major flat 16 arrays)
    out = [0.0] * 16
    for c in range(4):
        for r in range(4):
            val = 0.0
            for i in range(4):
                val += a[i * 4 + r] * b[c * 4 + i]
            out[c * 4 + r] = val
    return out

def get_node_matrix(node):
    if "matrix" in node:
        return node["matrix"]
    t = node.get("translation", [0.0, 0.0, 0.0])
    r = node.get("rotation", [0.0, 0.0, 0.0, 1.0]) # [x, y, z, w]
    s = node.get("scale", [1.0, 1.0, 1.0])

    qx, qy, qz, qw = r[0], r[1], r[2], r[3]
    m00 = (1.0 - 2.0 * (qy*qy + qz*qz)) * s[0]
    m01 = (2.0 * (qx*qy + qz*qw)) * s[0]
    m02 = (2.0 * (qx*qz - qy*qw)) * s[0]
    m03 = 0.0

    m10 = (2.0 * (qx*qy - qz*qw)) * s[1]
    m11 = (1.0 - 2.0 * (qx*qx + qz*qz)) * s[1]
    m12 = (2.0 * (qy*qz + qx*qw)) * s[1]
    m13 = 0.0

    m20 = (2.0 * (qx*qz + qy*qw)) * s[2]
    m21 = (2.0 * (qy*qz - qx*qw)) * s[2]
    m22 = (1.0 - 2.0 * (qx*qx + qy*qy)) * s[2]
    m23 = 0.0

    m30 = t[0]
    m31 = t[1]
    m32 = t[2]
    m33 = 1.0

    return [m00, m01, m02, m03,
            m10, m11, m12, m13,
            m20, m21, m22, m23,
            m30, m31, m32, m33]

def identity_matrix():
    return [1.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.0, 0.0, 0.0, 1.0]

def main():
    glb_data = read_glb_json(GLB_PATH)
    nodes = glb_data.get("nodes", [])

    # Find parent of each node
    parent_map = {}
    for i, n in enumerate(nodes):
        for child_idx in n.get("children", []):
            parent_map[child_idx] = i

    # Compute evaluated world matrix for each node
    world_matrices = {}
    def get_world_matrix(idx):
        if idx in world_matrices:
            return world_matrices[idx]
        local_mat = get_node_matrix(nodes[idx])
        p = parent_map.get(idx)
        if p is not None:
            p_mat = get_world_matrix(p)
            w_mat = multiply_matrices(p_mat, local_mat)
        else:
            w_mat = local_mat
        world_matrices[idx] = w_mat
        return w_mat

    for i in range(len(nodes)):
        get_world_matrix(i)

    # In glTF, standard coordinate system is Right-handed: +X Right, +Y Up, +Z Front/Toward viewer.
    # In YOR WORLD runtime: +X Right, +Y Up, +Z Front (doorway at +1.8, rear wall at -1.8).
    # glTF and runtime coordinate systems are both Y-up right-handed!
    node_summaries = []
    for i, n in enumerate(nodes):
        name = n.get("name", f"node_{i}")
        w_mat = world_matrices[i]
        world_pos = [round(w_mat[12], 4), round(w_mat[13], 4), round(w_mat[14], 4)]
        local_trans = n.get("translation", [0.0, 0.0, 0.0])
        p_idx = parent_map.get(i)
        p_name = nodes[p_idx].get("name") if p_idx is not None else None
        node_summaries.append({
            "index": i,
            "name": name,
            "parent": p_name,
            "localTranslation": [round(x, 4) for x in local_trans],
            "evaluatedWorldPosition": world_pos
        })

    # Compare against native inspection if available
    comparison = []
    if NATIVE_JSON.exists():
        native_data = json.loads(NATIVE_JSON.read_text(encoding="utf-8"))
        native_map = {o["name"]: o["runtimeWorldPosition"] for o in native_data.get("objects", [])}
        for ns in node_summaries:
            name = ns["name"]
            if name in native_map:
                n_pos = [round(x, 4) for x in native_map[name]]
                e_pos = ns["evaluatedWorldPosition"]
                diff = [round(abs(e_pos[k] - n_pos[k]), 4) for k in range(3)]
                max_diff = max(diff)
                match = max_diff < 0.005 # 5mm tolerance for floating point / matrix conversion
                comparison.append({
                    "name": name,
                    "nativeWorld": n_pos,
                    "gltfWorld": e_pos,
                    "diff": diff,
                    "match": match
                })

    all_match = all(c["match"] for c in comparison) if comparison else False
    report = {
        "glbPath": str(GLB_PATH),
        "totalNodes": len(nodes),
        "totalMeshes": len(glb_data.get("meshes", [])),
        "totalMaterials": len(glb_data.get("materials", [])),
        "totalCameras": len(glb_data.get("cameras", [])),
        "agreementWithNative": all_match,
        "nodes": node_summaries,
        "nativeComparisonSample": [c for c in comparison if any(k in c["name"] for k in [
            "door", "hinge", "leaf", "handle", "pc", "headset", "pegboard", "controller",
            "mic", "chair", "resident", "plant", "monitor", "desk"
        ])]
    }

    out_file = OUT / "export-inspection.json"
    out_file.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote glTF export inspection data to {out_file}")
    print(f"Native vs glTF agreement: {'PASS' if all_match else 'CHECK_DIFFS'}")

if __name__ == "__main__":
    main()
