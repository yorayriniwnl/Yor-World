import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { animatedNodes, attributeLayout, eligible, LOW_BATCH_ORIGINAL_LAYER, positiveOrthogonalTransform } from "./LowQualityBatch";

const originalMask = 1 << LOW_BATCH_ORIGINAL_LAYER;
const encoded = new Set(["color", "roughness", "metalness", "emissive", "emissiveIntensity"]);
const inert = new Set(["id", "uuid", "name", "userData", "_listeners"]);
const defaults = new THREE.MeshStandardMaterial();
const knownFields = new Set(Object.keys(defaults));
const overlays = /painting|certificate|clock_display|monitor_screen|decal|label|signature|hidden-yor-mark/i;
const parameterNames = ["color", "yorRoughMetal", "yorEmission"];

function valueSnapshot(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Nonfinite material input");
    return value;
  }
  if (value instanceof THREE.Color) return [value.r, value.g, value.b];
  if (value instanceof THREE.Vector2) return value.toArray();
  if (value instanceof THREE.Euler) return value.toArray();
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.keys(value).sort().map((key) => [key, valueSnapshot((value as Record<string, unknown>)[key])]);
  }
  throw new Error("Unsupported material input");
}

/** Actual linear values, including fields that do not increment Material.version. */
function materialSnapshot(material: THREE.MeshStandardMaterial, includeConstants: boolean): string | null {
  try {
    const values = Object.entries(material).filter(([key]) => !inert.has(key));
    if (values.some(([key]) => !knownFields.has(key))) return null;
    return JSON.stringify(values.filter(([key]) => includeConstants || (!encoded.has(key) && key !== "version"))
      .sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => [key, valueSnapshot(value)]));
  } catch { return null; }
}

function ordinary(material: THREE.Material): material is THREE.MeshStandardMaterial {
  if (material.constructor !== THREE.MeshStandardMaterial) return false;
  const standard = material as THREE.MeshStandardMaterial;
  const customDefines = (standard as THREE.MeshStandardMaterial & { defines?: Record<string, unknown> }).defines;
  const defaultDefines = (defaults as THREE.MeshStandardMaterial & { defines?: Record<string, unknown> }).defines;
  return !standard.vertexColors && standard.depthTest && standard.depthWrite && standard.colorWrite
    && standard.depthFunc === THREE.LessEqualDepth && !standard.polygonOffset && !standard.stencilWrite
    && standard.clippingPlanes === null && JSON.stringify(customDefines) === JSON.stringify(defaultDefines)
    && Object.entries(standard).every(([key, value]) => !key.toLowerCase().endsWith("map") || value === null)
    && [standard.color.r, standard.color.g, standard.color.b, standard.roughness, standard.metalness,
      standard.emissive.r, standard.emissive.g, standard.emissive.b, standard.emissiveIntensity,
      standard.emissive.r * standard.emissiveIntensity, standard.emissive.g * standard.emissiveIntensity,
      standard.emissive.b * standard.emissiveIntensity].every((value) => Number.isFinite(value) && Number.isFinite(Math.fround(value)));
}

function replaceOnce(source: string, anchor: string, replacement: string): string {
  if (source.split(anchor).length !== 2) throw new Error(`Unsupported Three shader anchor: ${anchor}`);
  return source.replace(anchor, replacement);
}

/** No global chunks are changed; reject a different shader contract before admission. */
export function constantMaterialShader(vertex: string, fragment: string): { vertexShader: string; fragmentShader: string } {
  if (THREE.REVISION !== "180") throw new Error("Unsupported Three revision");
  const declarations = "varying vec2 vYorRoughMetal;\nvarying vec3 vYorEmission;\n";
  vertex = replaceOnce(vertex, "#include <common>", `#include <common>\nattribute vec2 yorRoughMetal;\nattribute vec3 yorEmission;\n${declarations}`);
  vertex = replaceOnce(vertex, "#include <color_vertex>", "#include <color_vertex>\nvYorRoughMetal = yorRoughMetal;\nvYorEmission = yorEmission;");
  fragment = replaceOnce(fragment, "#include <common>", `#include <common>\n${declarations}`);
  fragment = replaceOnce(fragment, "vec3 totalEmissiveRadiance = emissive;", "vec3 totalEmissiveRadiance = vYorEmission;");
  fragment = replaceOnce(fragment, "#include <roughnessmap_fragment>", replaceOnce(THREE.ShaderChunk.roughnessmap_fragment,
    "float roughnessFactor = roughness;", "float roughnessFactor = vYorRoughMetal.x;"));
  fragment = replaceOnce(fragment, "#include <metalnessmap_fragment>", replaceOnce(THREE.ShaderChunk.metalnessmap_fragment,
    "float metalnessFactor = metalness;", "float metalnessFactor = vYorRoughMetal.y;"));
  return { vertexShader: vertex, fragmentShader: fragment };
}

function attributes(geometry: THREE.BufferGeometry): THREE.BufferAttribute[] {
  return [geometry.index, ...Object.keys(geometry.attributes).sort().map((name) => geometry.getAttribute(name))]
    .filter((attribute): attribute is THREE.BufferAttribute => !!attribute) as THREE.BufferAttribute[];
}

interface Source {
  mesh: THREE.Mesh; geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial;
  state: string; layout: string; buffers: THREE.BufferAttribute[]; arrays: ArrayLike<number>[]; versions: number[];
  parent: THREE.Object3D | null; layer: number; batched: boolean; retired: boolean; frustumCulled: boolean;
  working: THREE.BufferGeometry; matrix: THREE.Matrix4; sphere: THREE.Sphere; bounds: string;
  vertexStart: number; indexStart: number; indexCount: number;
}
interface Entry { mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>; sources: Source[]; indices: number[]; selection: string }

function bounds(geometry: THREE.BufferGeometry): string {
  return JSON.stringify([geometry.boundingBox?.min.toArray(), geometry.boundingBox?.max.toArray(),
    geometry.boundingSphere?.center.toArray(), geometry.boundingSphere?.radius]);
}

/** Exact constant PBR inputs on copied rigid triangles. Runtime owns one native
 * camera/sort/PCF renderer; other arrangements remain on their native path.
 */
export class ConstantMaterialBatch {
  private readonly entries: Entry[] = [];
  private readonly targets: Set<THREE.Object3D>;
  private disposed = false;
  public readonly claimed = new Set<THREE.Mesh>();

  constructor(private readonly scene: THREE.Scene, private readonly camera: THREE.Camera, private readonly renderer: THREE.WebGLRenderer) {
    this.targets = animatedNodes(scene, true);
    if (!this.supported()) return;
    try {
      constantMaterialShader(THREE.ShaderLib.standard.vertexShader, THREE.ShaderLib.standard.fragmentShader);
      scene.updateWorldMatrix(true, true);
      const groups = new Map<string, THREE.Mesh[]>();
      scene.traverse((object) => {
        if (!(object as THREE.Mesh).isMesh) return;
        const mesh = object as THREE.Mesh;
        if (!this.admissible(mesh)) return;
        const material = mesh.material as THREE.MeshStandardMaterial;
        const state = materialSnapshot(material, false);
        if (state === null) return;
        const key = JSON.stringify([state, attributeLayout(mesh.geometry), mesh.castShadow, mesh.receiveShadow, mesh.frustumCulled, mesh.layers.mask]);
        const group = groups.get(key) ?? [];
        group.push(mesh); groups.set(key, group);
      });
      for (const meshes of groups.values()) {
        // Existing same-material batching is already exact and avoids a custom shader.
        if (new Set(meshes.map((mesh) => mesh.material)).size < 2) continue;
        meshes.sort((a, b) => (a.material as THREE.MeshStandardMaterial).uuid.localeCompare((b.material as THREE.MeshStandardMaterial).uuid) || a.id - b.id);
        this.create(meshes);
      }
      // Compile before hiding sources. Explicit link status also works when the
      // renderer has disabled optional shader diagnostics. r180 is pinned above.
      for (const entry of this.entries) {
        renderer.compile(entry.mesh, camera, scene);
        const programs = (renderer.properties.get(entry.mesh.material) as { programs?: Map<string, { program: WebGLProgram }> } | undefined)?.programs;
        if (!programs?.size || [...programs.values()].some(({ program }) => !renderer.getContext().getProgramParameter(program, renderer.getContext().LINK_STATUS))) {
          throw new Error("Constant material program did not link");
        }
      }
      this.update();
    } catch {
      // Construction is atomic, including allocations made before a later failure.
      this.dispose();
    }
  }

  private supported(): boolean {
    const perspectiveCamera = this.camera instanceof THREE.PerspectiveCamera;
    return this.scene.constructor === THREE.Scene && perspectiveCamera
      && this.camera.layers.mask === 1 && this.renderer.sortObjects && this.scene.overrideMaterial === null
      && (!this.renderer.shadowMap.enabled || (this.renderer.shadowMap.type === THREE.PCFShadowMap
        || this.renderer.shadowMap.type === THREE.PCFSoftShadowMap));
  }

  private admissible(mesh: THREE.Mesh): boolean {
    if (!eligible(mesh, this.targets, true) || Array.isArray(mesh.material) || !ordinary(mesh.material)
      || !attributeLayout(mesh.geometry) || parameterNames.some((name) => !!mesh.geometry.getAttribute(name))
      || !mesh.geometry.getAttribute("normal") || Object.values(mesh.geometry.attributes).some((attribute) => (attribute as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute)) return false;
    for (let node: THREE.Object3D | null = mesh; node; node = node.parent) if (overlays.test(node.name)) return false;
    return true;
  }

  private create(meshes: THREE.Mesh[]): void {
    const inverse = this.scene.matrixWorld.clone().invert();
    const sources: Source[] = [];
    let geometry: THREE.BufferGeometry | null = null;
    let material: THREE.MeshStandardMaterial | null = null;
    try {
      let vertexStart = 0, indexStart = 0;
      for (const mesh of meshes) {
        const sourceMaterial = mesh.material as THREE.MeshStandardMaterial;
        const working = mesh.geometry.clone();
        const matrix = new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld);
        const buffers = attributes(mesh.geometry);
        const source: Source = { mesh, geometry: mesh.geometry, material: sourceMaterial, state: materialSnapshot(sourceMaterial, true)!,
          layout: attributeLayout(mesh.geometry)!, buffers, arrays: buffers.map((buffer) => buffer.array), versions: buffers.map((buffer) => buffer.version),
          parent: mesh.parent, layer: mesh.layers.mask, batched: false, retired: false, frustumCulled: mesh.frustumCulled,
          working, matrix, sphere: new THREE.Sphere(), bounds: bounds(mesh.geometry), vertexStart, indexStart,
          indexCount: mesh.geometry.index?.count ?? mesh.geometry.getAttribute("position").count };
        sources.push(source);
        if (!positiveOrthogonalTransform(matrix)) throw new Error("Unsupported batch-relative transform");
        working.computeBoundingSphere(); source.sphere.copy(working.boundingSphere!);
        working.applyMatrix4(matrix);
        const count = working.getAttribute("position").count;
        const values = [sourceMaterial.color.toArray(), [sourceMaterial.roughness, sourceMaterial.metalness],
          sourceMaterial.emissive.toArray().map((value) => value * sourceMaterial.emissiveIntensity)];
        values.forEach((value, i) => {
          const array = new Float32Array(count * value.length);
          for (let vertex = 0; vertex < count; vertex++) array.set(value, vertex * value.length);
          working.setAttribute(parameterNames[i]!, new THREE.BufferAttribute(array, value.length));
        });
        vertexStart += count; indexStart += source.indexCount;
      }
      geometry = mergeGeometries(sources.map((source) => source.working), false);
      if (!geometry) throw new Error("Unsupported merge layout");
      if (!geometry.index) geometry.setIndex(Array.from({ length: vertexStart }, (_, index) => index));
      material = sources[0]!.material.clone();
      material.allowOverride = sources[0]!.material.allowOverride;
      material.color.setRGB(1, 1, 1); material.vertexColors = true;
      material.emissive.setRGB(0, 0, 0); material.emissiveIntensity = 1;
      material.onBeforeCompile = (shader) => Object.assign(shader, constantMaterialShader(shader.vertexShader, shader.fragmentShader));
      material.customProgramCacheKey = () => "yor-constant-standard-r180-v1";
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = "rigid-world-constant-material-batch";
      mesh.castShadow = meshes[0]!.castShadow; mesh.receiveShadow = meshes[0]!.receiveShadow;
      mesh.frustumCulled = false; mesh.layers.mask = meshes[0]!.layers.mask;
      mesh.raycast = () => {};
      this.entries.push({ mesh, sources, indices: Array.from(geometry.index!.array), selection: "" });
      this.scene.add(mesh);
      sources.forEach((source) => this.claimed.add(source.mesh));
    } catch (error) {
      sources.forEach((source) => source.working.dispose()); geometry?.dispose(); material?.dispose();
      throw error;
    }
  }

  public update(): void {
    if (this.disposed) return;
    const supported = this.supported();
    this.scene.updateWorldMatrix(true, true); this.camera.updateWorldMatrix(true, false);
    const inverse = this.scene.matrixWorld.clone().invert();
    const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse));
    for (const entry of this.entries) {
      const selected: Source[] = [];
      for (const source of entry.sources) {
        const { mesh } = source;
        if (mesh.layers.mask !== (source.batched ? originalMask : source.layer)) { source.layer = mesh.layers.mask; source.retired = true; }
        mesh.layers.mask = source.layer; source.batched = false;
        let ancestor: THREE.Object3D | null = mesh;
        while (ancestor && ancestor !== this.scene) ancestor = ancestor.parent;
        const current = attributes(mesh.geometry);
        const matrix = new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld);
        const valid = supported && !source.retired && ancestor === this.scene && mesh.parent === source.parent
          && mesh.geometry === source.geometry && mesh.material === source.material
          && mesh.castShadow === entry.mesh.castShadow && mesh.receiveShadow === entry.mesh.receiveShadow && mesh.frustumCulled === source.frustumCulled
          && materialSnapshot(source.material, true) === source.state && attributeLayout(mesh.geometry) === source.layout
          && current.length === source.buffers.length && current.every((buffer, i) => buffer === source.buffers[i] && buffer.array === source.arrays[i] && buffer.version === source.versions[i])
          && bounds(mesh.geometry) === source.bounds && positiveOrthogonalTransform(matrix) && this.admissible(mesh);
        if (!valid) { source.retired = true; continue; }
        if (!matrix.equals(source.matrix)) {
          // Copy only original attributes; retain the added constant parameters.
          const transformed = source.geometry.clone().applyMatrix4(matrix);
          for (const name of Object.keys(source.geometry.attributes)) {
            const target = entry.mesh.geometry.getAttribute(name) as THREE.BufferAttribute;
            target.array.set(transformed.getAttribute(name).array, source.vertexStart * target.itemSize); target.needsUpdate = true;
          }
          transformed.dispose(); source.matrix.copy(matrix);
        }
        mesh.layers.mask = originalMask; source.batched = true;
        if (mesh.castShadow || !mesh.frustumCulled || frustum.intersectsSphere(source.sphere.clone().applyMatrix4(mesh.matrixWorld))) selected.push(source);
      }
      entry.mesh.visible = selected.length > 0;
      const selection = selected.map((source) => source.indexStart).join(",");
      if (selection === entry.selection) continue;
      entry.selection = selection;
      const index = entry.mesh.geometry.index!;
      let count = 0;
      for (const source of selected) { index.array.set(entry.indices.slice(source.indexStart, source.indexStart + source.indexCount), count); count += source.indexCount; }
      index.needsUpdate = true; entry.mesh.geometry.setDrawRange(0, count);
    }
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const { mesh, sources } of this.entries) {
      for (const source of sources) {
        if (source.batched && source.mesh.layers.mask === originalMask) source.mesh.layers.mask = source.layer;
        source.working.dispose();
      }
      mesh.removeFromParent(); mesh.geometry.dispose(); mesh.material.dispose();
    }
    this.entries.length = 0; this.claimed.clear();
  }
}
