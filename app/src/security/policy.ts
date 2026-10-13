/** Pure header policy. No credentials, private configuration or browser state. */
export const frozenModelPaths = [
  "fixture-production.glb",
  "group-a-essential.glb",
  "group-b-props.glb",
  "interaction-assets-mobile.glb",
  "interaction-assets.glb",
  "mobile-room-lod.glb",
  "on-demand-projects.glb",
  "production-room-full.glb",
  "resident-production.glb",
  "world-art-local-corrections-20261009-r1/fixture-production.c7ed99092cfc2d71470065099cec2a0d1dac565e149521dff28c588677cbc3a5.glb",
  "world-art-local-corrections-20261009-r1/group-a-essential.0e1ec002af40fe7a6c6e791873613587d7556d0801c4af723b0f71c70514c08d.glb",
  "world-art-local-corrections-20261009-r1/group-b-props.ed82bf5c7842f4789e1ec4a0ba0f33dd3db6c620f5ea2fadb0a929386e761512.glb",
  "world-art-local-corrections-20261009-r1/mobile-room-lod.0d89de4d97d94220a16cd67d028e42896424a698c4f8787f1aeaea728d8c8ecb.glb",
  "world-art-local-corrections-20261009-r1/on-demand-projects.ad50321289ebc3502f71b28259041d2eb0395dfccd493301515bab3d21362e75.glb",
  "world-art-local-corrections-20261009-r1/production-room-full.2b4c1d18b81874630da5c32836b0e37ec1ff9f25147ccb92aba1d22f62e46a6e.glb",
].map((name) => "/models/" + name);

export const apiContentSecurityPolicy = "default-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none';";

function configuredHttpsOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash
      || !["", "/"].includes(url.pathname) || !/^[a-z0-9.-]+$/i.test(url.hostname) || !publicHostname(url.hostname)) return undefined;
    return url.origin;
  } catch { return undefined; }
}

function publicHostname(hostname: string): boolean {
  return hostname !== "localhost" && !hostname.endsWith(".localhost") && !hostname.endsWith(".local")
    && hostname.includes(".") && !/^\d+\.\d+\.\d+\.\d+$/.test(hostname) && !hostname.includes(":");
}

export function transportPolicy(requestUrl: URL, publicBaseUrl: string | undefined): { hsts: boolean; upgrade: boolean } {
  if (!publicHostname(requestUrl.hostname)) return { hsts: false, upgrade: false };
  const hsts = requestUrl.protocol === "https:";
  const configured = configuredHttpsOrigin(publicBaseUrl);
  return { hsts, upgrade: hsts || Boolean(configured && new URL(configured).host === requestUrl.host) };
}

export function contentSecurityPolicy(options: {
  nonce: string; development: boolean; supabaseUrl?: string | undefined; upgrade: boolean;
}): string {
  if (!/^[A-Za-z0-9+/]{20,128}={0,2}$/.test(options.nonce)) throw new Error("Invalid generated CSP nonce");
  const authOrigin = configuredHttpsOrigin(options.supabaseUrl);
  // GLTFLoader/ImageBitmapLoader fetch embedded texture data through blob/data URLs.
  const connect = ["'self'", "blob:", "data:"];
  if (authOrigin) connect.push(authOrigin, authOrigin.replace(/^https:/, "wss:"));
  if (options.development) connect.push("ws:");
  const rules = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${options.nonce}' 'strict-dynamic'${options.development ? " 'unsafe-eval'" : ""}`,
    "script-src-attr 'none'",
    `style-src 'self' ${options.development ? "'unsafe-inline'" : `'nonce-${options.nonce}'`}`,
    // React world/admin components use style attributes. Inline scripts remain blocked.
    "style-src-attr 'unsafe-inline'",
    `img-src 'self' blob: data:${authOrigin ? " " + authOrigin : ""}`,
    "font-src 'self' data:",
    "media-src 'self' blob: data:",
    "worker-src 'self' blob:",
    `connect-src ${connect.join(" ")}`,
    "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'", "frame-src 'none'",
  ];
  if (options.upgrade) rules.push("upgrade-insecure-requests");
  return rules.join("; ") + ";";
}

export function isDocumentPath(pathname: string): boolean {
  return !/^\/(?:api(?:\/|$)|_next(?:\/|$)|models(?:\/|$)|images(?:\/|$)|textures(?:\/|$)|fonts(?:\/|$)|assets(?:\/|$))/.test(pathname)
    && !["/favicon.ico", "/robots.txt", "/sitemap.xml"].includes(pathname);
}
