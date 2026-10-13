/** Pure header policy. No credentials, private configuration or browser state. */
export const frozenModelPaths = [
  "group-a-essential.glb", "group-b-props.glb", "on-demand-projects.glb", "production-room-full.glb",
  "mobile-room-lod.glb", "resident-production.glb", "fixture-production.glb", "interaction-assets.glb", "interaction-assets-mobile.glb",
  "world-art-local-corrections-20261009-r1/group-a-essential.e275dd9b.glb",
  "world-art-local-corrections-20261009-r1/group-b-props.95867245.glb",
  "world-art-local-corrections-20261009-r1/on-demand-projects.b809c043.glb",
  "world-art-local-corrections-20261009-r1/production-room-full.d3ce1bfa.glb",
  "world-art-local-corrections-20261009-r1/mobile-room-lod.d3ce1bfa.glb",
  "world-art-local-corrections-20261009-r1/fixture-production.c7ed9909.glb",
  "world-art-local-corrections-20261009-r1/group-a-essential.e275dd9b077c4edb40124d239b2e127607111a70d90be7b8e9c6763c46d14a6a.glb",
  "world-art-local-corrections-20261009-r1/group-b-props.958672452c20d1b62c523c2c3b3f9f421be5c053d1ce0c4dfc7580693cb38fa0.glb",
  "world-art-local-corrections-20261009-r1/on-demand-projects.b809c0434909aa4d26c2c8924700d38e56cd3bb719a05ddab296e8ea17570fa8.glb",
  "world-art-local-corrections-20261009-r1/production-room-full.d3ce1bfa9b90c4141092e67631ae85855127d3417059d109aeddeabc29ed449a.glb",
  "world-art-local-corrections-20261009-r1/mobile-room-lod.d3ce1bfa9b90c4141092e67631ae85855127d3417059d109aeddeabc29ed449a.glb",
  "world-art-local-corrections-20261009-r1/fixture-production.c7ed99092cfc2d71470065099cec2a0d1dac565e149521dff28c588677cbc3a5.glb",
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
