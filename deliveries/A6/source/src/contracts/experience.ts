import { z } from "zod";
import { ProjectIdSchema } from "./content";

export const QualityTierSchema = z.enum(["high", "medium", "low", "static"]);
export type QualityTier = z.infer<typeof QualityTierSchema>;
export const PublicRouteSchema = z.enum(["/", "/projects", "/about", "/about#research", "/about#skills", "/contact", "/resume"]);
export type PublicRoute = z.infer<typeof PublicRouteSchema>;
export const CharacterActionSchema = z.enum([
  "coding_idle", "mouse_idle", "notice_visitor", "turn_to_visitor", "greeting_nod",
  "return_to_work", "attention_glance", "breathing_idle",
]);
export type CharacterAction = z.infer<typeof CharacterActionSchema>;
export const CameraIdSchema = z.enum([
  "hallway", "entry", "reveal", "greeting", "home-desktop", "home-mobile", "monitor",
  "pc", "energy", "scanner", "microphone", "about", "contact",
]);
export type CameraId = z.infer<typeof CameraIdSchema>;

export const WorldSnapshotSchema = z.strictObject({
  version: z.literal(1), lampOn: z.boolean(), blindsOpen: z.boolean(), detailFound: z.boolean(),
});
export type WorldSnapshot = z.infer<typeof WorldSnapshotSchema>;
export const PreferencesSchema = z.strictObject({
  version: z.literal(1), introCompleted: z.boolean(), soundEnabled: z.boolean(),
  quality: z.union([QualityTierSchema, z.literal("auto")]), clock24h: z.boolean(),
});
export type Preferences = z.infer<typeof PreferencesSchema>;

export const defaultPreferences: Readonly<Preferences> = Object.freeze(PreferencesSchema.parse({
  version: 1, introCompleted: false, soundEnabled: false, quality: "auto", clock24h: true,
}));

const source = z.enum(["room", "dom"]);
export const ExperienceIntentSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("ENTER"), replay: z.boolean() }),
  z.strictObject({ type: z.literal("SKIP") }),
  z.strictObject({ type: z.literal("GREET") }),
  z.strictObject({ type: z.literal("OPEN_PROJECT"), projectId: ProjectIdSchema, source }),
  z.strictObject({ type: z.literal("NAVIGATE"), path: PublicRouteSchema, source, camera: CameraIdSchema.nullable() }),
  z.strictObject({ type: z.literal("OPEN_PANEL"), panel: z.enum(["launcher", "room-controls", "replay"]) }),
  z.strictObject({ type: z.literal("SET_LAMP"), enabled: z.boolean() }),
  z.strictObject({ type: z.literal("SET_BLINDS"), open: z.boolean() }),
  z.strictObject({ type: z.literal("SET_SOUND"), enabled: z.boolean() }),
  z.strictObject({ type: z.literal("SET_QUALITY"), quality: z.union([QualityTierSchema, z.literal("auto")]) }),
  z.strictObject({ type: z.literal("SET_CLOCK_FORMAT"), clock24h: z.boolean() }),
  z.strictObject({ type: z.literal("SET_PAUSED"), paused: z.boolean() }),
  z.strictObject({ type: z.literal("ESCAPE") }),
  z.strictObject({ type: z.literal("HIDE") }),
  z.strictObject({ type: z.literal("SHOW") }),
  z.strictObject({ type: z.literal("RENDERER_FAILED"), code: z.string().min(1) }),
]);
export type ExperienceIntent = z.infer<typeof ExperienceIntentSchema>;
