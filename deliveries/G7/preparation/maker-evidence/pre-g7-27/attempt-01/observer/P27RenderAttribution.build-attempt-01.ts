import * as THREE from "three";

type AttributionRecord = {
  callId: number;
  frameId: number;
  pass: "main" | "shadow";
  rendererCallDelta: number;
  rendererTriangleDelta: number;
  object: Record<string, unknown>;
  geometry: Record<string, unknown>;
  group: Record<string, unknown> | null;
  material: Record<string, unknown>;
  currentProgram: Record<string, unknown> | null;
  batchInstances: Array<Record<string, unknown>>;
  apiCalls: Array<Record<string, unknown>>;
};

function objectPath(object: THREE.Object3D): string {
  const names: string[] = [];
  for (let node: THREE.Object3D | null = object; node; node = node.parent) {
    names.push(node.name || node.type);
  }
  return names.reverse().join("/");
}

function hierarchy(object: THREE.Object3D) {
  const rows: Array<Record<string, unknown>> = [];
  let effectivelyVisible = true;
  for (let node: THREE.Object3D | null = object; node; node = node.parent) {
    effectivelyVisible &&= node.visible;
    rows.push({
      path: objectPath(node),
      name: node.name,
      type: node.type,
      visible: node.visible,
      layers: node.layers.mask,
      renderOrder: node.renderOrder,
    });
  }
  return { effectivelyVisible, rows };
}

function materialDetails(materialValue: THREE.Material | THREE.Material[]) {
  const materials = Array.isArray(materialValue) ? materialValue : [materialValue];
  return materials.map((material) => {
    const values = material as THREE.Material & Record<string, unknown>;
    const textureSlots = Object.entries(values)
      .filter(([, value]) => Boolean(value && typeof value === "object" && (value as { isTexture?: boolean }).isTexture))
      .map(([slot, value]) => {
        const texture = value as THREE.Texture;
        return {
          slot,
          uuid: texture.uuid,
          sourceUuid: texture.source?.uuid ?? null,
          mapping: texture.mapping,
          channel: texture.channel,
          colorSpace: texture.colorSpace,
          flipY: texture.flipY,
          wrapS: texture.wrapS,
          wrapT: texture.wrapT,
          magFilter: texture.magFilter,
          minFilter: texture.minFilter,
          anisotropy: texture.anisotropy,
          offset: texture.offset.toArray(),
          repeat: texture.repeat.toArray(),
          center: texture.center.toArray(),
          rotation: texture.rotation,
          matrixAutoUpdate: texture.matrixAutoUpdate,
          matrix: texture.matrix.toArray(),
        };
      });
    const standard = material as THREE.MeshStandardMaterial;
    const physical = material as THREE.MeshPhysicalMaterial;
    return {
      id: material.id,
      uuid: material.uuid,
      name: material.name,
      type: material.type,
      visible: material.visible,
      side: material.side,
      shadowSide: material.shadowSide,
      transparent: material.transparent,
      opacity: material.opacity,
      blending: material.blending,
      alphaTest: material.alphaTest,
      alphaHash: material.alphaHash,
      alphaToCoverage: material.alphaToCoverage,
      transmission: physical.transmission ?? 0,
      roughness: standard.roughness ?? null,
      metalness: standard.metalness ?? null,
      color: standard.color?.getHexString() ?? null,
      emissive: standard.emissive?.getHexString() ?? null,
      customProgramCacheKey: material.customProgramCacheKey(),
      hasCustomOnBeforeCompile: material.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile,
      textureSlots,
    };
  });
}

function geometryDetails(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute("position");
  return {
    uuid: geometry.uuid,
    name: geometry.name,
    type: geometry.type,
    indexCount: geometry.index?.count ?? null,
    positionCount: position?.count ?? null,
    drawRange: { start: geometry.drawRange.start, count: geometry.drawRange.count },
    groups: geometry.groups.map((group) => ({
      start: group.start,
      count: group.count,
      materialIndex: group.materialIndex,
    })),
  };
}

const dynamicNamePattern = /^(resident|chair-root|chair-base|body-turn|door-hinge|painting-pivot|blind_slat_\d+|hidden-yor-mark)$/;
const animatedTargetCache = new WeakMap<object, Set<THREE.Object3D>>();

function dynamicReason(object: THREE.Object3D, scene: THREE.Object3D): string | null {
  for (let node: THREE.Object3D | null = object; node; node = node.parent) {
    if (dynamicNamePattern.test(node.name)) return "dynamic-name:" + node.name;
  }
  let targets = animatedTargetCache.get(scene);
  if (!targets) {
    targets = new Set<THREE.Object3D>();
    scene.traverse((root) => {
      for (const clip of root.animations) {
        for (const track of clip.tracks) {
          try {
            const parsed = THREE.PropertyBinding.parseTrackName(track.name);
            const target = THREE.PropertyBinding.findNode(root, parsed.nodeName);
            targets.add(target instanceof THREE.Object3D ? target : root);
          } catch {
            targets.add(root);
          }
        }
      }
    });
    animatedTargetCache.set(scene, targets);
  }
  for (let node: THREE.Object3D | null = object; node; node = node.parent) {
    if (targets.has(node)) return "animated:" + (node.name || node.type);
  }
  return null;
}

function batchSources(
  runtime: unknown,
  object: THREE.Object3D,
  captureMaterials: (material: THREE.Material | THREE.Material[]) => string[],
  captureGeometry: (geometry: THREE.BufferGeometry) => string,
  exclusionReasonForPath: (path: string) => string | null,
) {
  const runtimeFields = runtime as Record<string, unknown>;
  const batcher = (runtimeFields.lowQualityBatch ?? runtimeFields.staticSceneBatch ?? runtimeFields.sceneBatch) as
    | { entries?: Array<{ batch: THREE.Object3D; originals?: Array<Record<string, unknown>>; material?: THREE.Material }> }
    | null
    | undefined;
  const entry = batcher?.entries?.find((candidate) => candidate.batch === object);
  if (!entry) return [];
  const batch = object as THREE.Object3D & {
    _multiDrawCount?: number;
    _indirectTexture?: { image?: { data?: ArrayLike<number> } };
    _multiDrawStarts?: ArrayLike<number>;
    _multiDrawCounts?: ArrayLike<number>;
    _instanceInfo?: Array<{ geometryIndex: number }>;
    _geometryInfo?: Array<{ start: number; count: number }>;
  };
  const indirect = batch._indirectTexture?.image?.data;
  const drawCount = Math.min(batch._multiDrawCount ?? 0, indirect?.length ?? 0);
  const originals = entry.originals ?? [];
  return Array.from({ length: drawCount }, (_, drawIndex) => {
    const instanceId = Number(indirect?.[drawIndex] ?? -1);
    const source = originals.find((candidate) => candidate.instanceId === instanceId);
    const sourceMesh = source?.mesh as THREE.Mesh | undefined;
    const geometryIndex = batch._instanceInfo?.[instanceId]?.geometryIndex ?? null;
    const geometryInfo = geometryIndex === null ? null : batch._geometryInfo?.[geometryIndex] ?? null;
    const visibleTest = sourceMesh ? hierarchy(sourceMesh) : null;
    return {
      drawIndex,
      instanceId,
      startBytes: batch._multiDrawStarts?.[drawIndex] ?? null,
      elementCount: batch._multiDrawCounts?.[drawIndex] ?? null,
      geometryIndex,
      geometryRange: geometryInfo ? { start: geometryInfo.start, count: geometryInfo.count } : null,
      sourcePath: sourceMesh ? objectPath(sourceMesh) : null,
      sourceName: sourceMesh?.name ?? null,
      sourceVisible: sourceMesh?.visible ?? null,
      sourceEffectivelyVisible: visibleTest?.effectivelyVisible ?? null,
      sourceLayers: sourceMesh?.layers.mask ?? null,
      sourceCastShadow: sourceMesh?.castShadow ?? null,
      sourceDynamic: source?.dynamic ?? null,
      sourceDynamicReason: sourceMesh ? dynamicReason(sourceMesh, (runtime as Record<string, unknown>).scene as THREE.Object3D) : null,
      sourceInBatch: source?.inBatch ?? null,
      sourceExclusionReason: sourceMesh ? exclusionReasonForPath(objectPath(sourceMesh)) : null,
      sourceMaterialIds: sourceMesh ? captureMaterials(sourceMesh.material) : [],
      sourceGeometryUuid: sourceMesh ? captureGeometry(sourceMesh.geometry) : null,
      sourceGeometryGroups: sourceMesh?.geometry.groups.map((group) => ({
        start: group.start,
        count: group.count,
        materialIndex: group.materialIndex,
      })) ?? null,
    };
  });
}

function apiElementCount(args: unknown[], method: string) {
  const arraySum = (arrayValue: unknown, start: number, count: number) => {
    const array = arrayValue as ArrayLike<number> | null;
    if (!array) return null;
    let total = 0;
    for (let index = start; index < start + count; index += 1) total += Number(array[index] ?? 0);
    return total;
  };
  if (method === "drawElements") return Number(args[1] ?? 0);
  if (method === "drawArrays") return Number(args[2] ?? 0);
  if (method === "drawElementsInstanced" || method === "drawArraysInstanced") {
    return Number(args[1] ?? 0) * Number(args[4] ?? 0);
  }
  if (method === "multiDrawArraysWEBGL") {
    return arraySum(args[3], Number(args[4] ?? 0), Number(args[5] ?? 0));
  }
  if (method === "multiDrawElementsWEBGL") {
    return arraySum(args[1], Number(args[2] ?? 0), Number(args[6] ?? 0));
  }
  if (method === "multiDrawArraysInstancedWEBGL") {
    return arraySum(args[3], Number(args[4] ?? 0), Number(args[7] ?? 0));
  }
  if (method === "multiDrawElementsInstancedWEBGL") {
    return arraySum(args[1], Number(args[2] ?? 0), Number(args[8] ?? 0));
  }
  return null;
}

export function installP27RenderAttribution(runtime: unknown, renderer: THREE.WebGLRenderer): void {
  if (typeof window === "undefined" || !new URLSearchParams(window.location.search).has("p27-render-attribution")) return;

  const target = renderer as unknown as Record<string, any>;
  const gl = renderer.getContext() as unknown as Record<string, any>;
  const materialCatalog: Record<string, Record<string, unknown>> = {};
  const geometryCatalog: Record<string, Record<string, unknown>> = {};
  const getBatchDiagnostics = () => {
    const fields = runtime as Record<string, unknown>;
    const batcher = (fields.lowQualityBatch ?? fields.staticSceneBatch ?? fields.sceneBatch) as
      | { getDiagnostics?: () => { excludedMeshes?: Array<{ path: string; reason: string }> } }
      | null
      | undefined;
    return batcher?.getDiagnostics?.() ?? null;
  };
  const exclusionReasonForPath = (path: string) =>
    getBatchDiagnostics()?.excludedMeshes?.find((item) => item.path === path)?.reason ?? null;
  const captureMaterials = (value: THREE.Material | THREE.Material[]) => {
    const details = materialDetails(value) as Array<Record<string, unknown>>;
    for (const detail of details) materialCatalog[String(detail.uuid)] = detail;
    return details.map((detail) => String(detail.uuid));
  };
  const captureGeometry = (geometry: THREE.BufferGeometry) => {
    const detail = geometryDetails(geometry) as Record<string, unknown>;
    geometryCatalog[String(detail.uuid)] = detail;
    return String(detail.uuid);
  };
  const trace: {
    schemaVersion: number;
    rendererVersion: string;
    multiDrawSupported: boolean;
    warnings: string[];
    latestFrame: Record<string, unknown> | null;
    initialQualityTier: string | null;
    tierHistory: Array<{ frameId: number; tier: string | null }>;
    activeRecord: AttributionRecord | null;
    frameId: number;
    callId: number;
    dispose: () => void;
  } = {
    schemaVersion: 1,
    rendererVersion: THREE.REVISION,
    multiDrawSupported: false,
    warnings: [],
    latestFrame: null,
    initialQualityTier: String((runtime as Record<string, unknown>).qualityTier ?? "unknown"),
    tierHistory: [],
    activeRecord: null,
    frameId: 0,
    callId: 0,
    dispose: () => {},
  };

  const originals: Array<() => void> = [];
  const programIds = new WeakMap<object, number>();
  let nextProgramId = 0;
  const patchMethod = (owner: Record<string, any>, method: string, kind: "draw" | "multiDraw") => {
    const original = owner[method];
    if (typeof original !== "function") return;
    const wrapped = function (this: unknown, ...args: unknown[]) {
      const active = trace.activeRecord;
      const invocation = {
        method,
        kind,
        subdrawCount: kind === "multiDraw"
          ? Number(args[method.includes("Instanced") ? 7 : method.includes("ElementsWEBGL") ? 6 : 5] ?? 0)
          : 1,
        elementCount: apiElementCount(args, method),
      };
      if (active) active.apiCalls.push(invocation);
      return original.apply(owner, args);
    };
    try {
      Object.defineProperty(owner, method, { configurable: true, writable: true, value: wrapped });
      originals.push(() => Object.defineProperty(owner, method, { configurable: true, writable: true, value: original }));
    } catch (error) {
      trace.warnings.push("Unable to wrap " + method + ": " + String(error));
    }
  };

  for (const method of [
    "drawElements",
    "drawArrays",
    "drawElementsInstanced",
    "drawArraysInstanced",
  ]) patchMethod(gl, method, "draw");

  const multiDraw = gl.getExtension?.("WEBGL_multi_draw") as Record<string, any> | null;
  trace.multiDrawSupported = Boolean(multiDraw);
  if (multiDraw) {
    for (const method of [
      "multiDrawArraysWEBGL",
      "multiDrawElementsWEBGL",
      "multiDrawArraysInstancedWEBGL",
      "multiDrawElementsInstancedWEBGL",
    ]) patchMethod(multiDraw, method, "multiDraw");
  }

  const originalDirect = target.renderBufferDirect;
  const originalRender = target.render;
  target.renderBufferDirect = function (
    camera: THREE.Camera,
    scene: THREE.Scene | null,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    object: THREE.Object3D,
    group: { start: number; count: number; materialIndex: number } | null,
  ) {
    const callsBefore = renderer.info.render.calls;
    const trianglesBefore = renderer.info.render.triangles;
    const directObject = object as THREE.Object3D & { isBatchedMesh?: boolean };
    const objectVisibility = hierarchy(object);
    const path = objectPath(object);
    const record: AttributionRecord = {
      callId: ++trace.callId,
      frameId: trace.frameId,
      pass: scene === null ? "shadow" : "main",
      rendererCallDelta: 0,
      rendererTriangleDelta: 0,
      object: {
        uuid: object.uuid,
        id: object.id,
        name: object.name,
        type: object.type,
        path,
        isBatchedMesh: Boolean(directObject.isBatchedMesh),
        visible: object.visible,
        effectivelyVisible: objectVisibility.effectivelyVisible,
        hierarchy: objectVisibility.rows,
        castShadow: (object as THREE.Mesh).castShadow ?? false,
        receiveShadow: (object as THREE.Mesh).receiveShadow ?? false,
        layers: object.layers.mask,
        renderOrder: object.renderOrder,
        cameraLayers: camera.layers.mask,
        frustumCulled: (object as THREE.Mesh).frustumCulled ?? false,
        cameraType: camera.type,
        cameraUuid: camera.uuid,
        cameraName: camera.name,
        dynamicReason: dynamicReason(object, (runtime as Record<string, unknown>).scene as THREE.Object3D),
        batchingExclusionReason: directObject.isBatchedMesh ? null : exclusionReasonForPath(path),
      },
      geometry: { uuid: captureGeometry(geometry) },
      group: group ? {
        start: group.start,
        count: group.count,
        materialIndex: group.materialIndex,
      } : null,
      material: {
        materialIds: captureMaterials(material),
      },
      currentProgram: null,
      batchInstances: batchSources(runtime, object, captureMaterials, captureGeometry, exclusionReasonForPath),
      apiCalls: [],
    };
    const previous = trace.activeRecord;
    trace.activeRecord = record;
    try {
      return originalDirect.call(this, camera, scene, geometry, material, object, group);
    } finally {
      record.rendererCallDelta = renderer.info.render.calls - callsBefore;
      record.rendererTriangleDelta = renderer.info.render.triangles - trianglesBefore;
      try {
        const currentProgram = gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram | null;
        if (currentProgram) {
          let programId = programIds.get(currentProgram);
          if (!programId) {
            programId = ++nextProgramId;
            programIds.set(currentProgram, programId);
          }
          const programs = renderer.info.programs as unknown as Array<Record<string, unknown>> | null;
          const programInfo = programs?.find((entry) => entry.program === currentProgram) ?? null;
          record.currentProgram = {
            id: programId,
            cacheKey: programInfo?.cacheKey ?? null,
            name: programInfo?.name ?? null,
          };
        }
      } catch (error) {
        trace.warnings.push("Program identity lookup failed: " + String(error));
      }
      const previousFrameRows = (trace as unknown as { currentRows?: AttributionRecord[] }).currentRows;
      previousFrameRows?.push(record);
      trace.activeRecord = previous;
    }
  };

  target.render = function (scene: THREE.Scene, camera: THREE.Camera) {
    const frameId = ++trace.frameId;
    const tier = String((runtime as Record<string, unknown>).qualityTier ?? "unknown");
    if (trace.tierHistory.length === 0 || trace.tierHistory[trace.tierHistory.length - 1]?.tier !== tier) trace.tierHistory.push({ frameId, tier });
    const rows: AttributionRecord[] = [];
    (trace as unknown as { currentRows?: AttributionRecord[] }).currentRows = rows;
    const result = originalRender.call(this, scene, camera);
    const mainRows = rows.filter((row) => row.pass === "main");
    const shadowRows = rows.filter((row) => row.pass === "shadow");
    trace.latestFrame = {
      frameId,
      qualityTier: (runtime as Record<string, unknown>)["qualityTier"] ?? null,
      initialQualityTier: trace.initialQualityTier,
      tierHistory: [...trace.tierHistory],
      mainRenderBufferDirectInvocations: mainRows.length,
      shadowRenderBufferDirectInvocations: shadowRows.length,
      mainRendererInfoCalls: mainRows.reduce((sum, row) => sum + row.rendererCallDelta, 0),
      shadowRendererInfoCalls: shadowRows.reduce((sum, row) => sum + row.rendererCallDelta, 0),
      mainRendererInfoTriangles: mainRows.reduce((sum, row) => sum + row.rendererTriangleDelta, 0),
      shadowRendererInfoTriangles: shadowRows.reduce((sum, row) => sum + row.rendererTriangleDelta, 0),
      inclusiveRendererInfoTriangles: rows.reduce((sum, row) => sum + row.rendererTriangleDelta, 0),
      mainWebGlDrawApiCalls: mainRows.reduce((sum, row) => sum + row.apiCalls.filter((call) => call.kind === "draw").length, 0),
      shadowWebGlDrawApiCalls: shadowRows.reduce((sum, row) => sum + row.apiCalls.filter((call) => call.kind === "draw").length, 0),
      mainMultiDrawInvocations: mainRows.reduce((sum, row) => sum + row.apiCalls.filter((call) => call.kind === "multiDraw").length, 0),
      shadowMultiDrawInvocations: shadowRows.reduce((sum, row) => sum + row.apiCalls.filter((call) => call.kind === "multiDraw").length, 0),
      inclusiveRendererInfoCalls: rows.reduce((sum, row) => sum + row.rendererCallDelta, 0),
      materialCatalog,
      geometryCatalog,
      compiledProgramCatalog: ((renderer.info.programs ?? []) as unknown as Array<Record<string, unknown>>).map((program) => ({
        cacheKey: program.cacheKey ?? null,
        name: program.name ?? null,
        usedTimes: program.usedTimes ?? null,
      })),
      calls: rows,
    };
    return result;
  };

  trace.dispose = () => {
    target.renderBufferDirect = originalDirect;
    target.render = originalRender;
    originals.reverse().forEach((restore) => restore());
  };
  (window as Window & { __P27_RENDER_ATTRIBUTION__?: unknown }).__P27_RENDER_ATTRIBUTION__ = trace;
}

