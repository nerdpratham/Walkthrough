import { z } from 'zod';

const LinkPrioritySchema = z.enum(['primary', 'secondary', 'hidden']);
const LinkStyleSchema = z.enum(['chevron', 'dot', 'floor-circle']);

export const EffectSchema = z.enum(['crossfade', 'walk-in', 'fly-in', 'radial-fade', 'vertical-wipe', 'none']);
export type EffectName = z.infer<typeof EffectSchema>;

const TransitionOverrideSchema = z.object({
  effect: EffectSchema.optional(),
  speedMs: z.number().min(0).max(5000).optional(),
  zoomLevel: z.number().min(0).max(100).optional(),
  blendMs: z.number().min(0).max(1500).optional(),
}).optional();

const TransitionSchema = z.object({
  effect: z.union([
    z.literal('fade').transform((): EffectName => 'crossfade'),
    EffectSchema,
  ]).default('crossfade'),
  speedMs: z.number().min(0).max(5000).default(900),
  rotation: z.boolean().default(true),
  zoomToHotspot: z.boolean().default(true),
  zoomLevel: z.number().min(0).max(100).default(55),
  blendMs: z.number().min(0).max(1500).default(360),
  lockInput: z.boolean().default(true),
});

const NadirSchema = z.object({
  enabled: z.boolean().default(false),
  image: z.string().optional(),
  size: z.number().min(64).max(1200).default(360),
  opacity: z.number().min(0).max(1).default(0.9),
});

const LinkSchema = z.object({
  toScene: z.string(),
  hotspotYaw: z.number(),
  hotspotPitch: z.number(),
  arrivalYaw: z.number(),
  arrivalPitch: z.number().default(0),
  priority: LinkPrioritySchema.default('primary'),
  style: LinkStyleSchema.default('dot'),
  label: z.string().optional(),
  transitionOverride: TransitionOverrideSchema,
});

export const InfoMarkerSchema = z.object({
  id: z.string(),
  yaw: z.number(),
  pitch: z.number(),
  enabled: z.boolean().default(true),
  title: z.string().optional(),
  tabTitle: z.string().optional(),
  body: z.string().optional(),
  imageUrl: z.string().optional(),
  imageDisplay: z.enum(['lightbox', 'inline']).default('lightbox'),
  showLabel: z.boolean().default(false),
  documentUrl: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaUrl: z.string().optional(),
});

const SceneSchema = z.object({
  id: z.string(),
  label: z.string(),
  caption: z.string().optional(),
  zone: z.string(),
  panorama: z.string(),
  defaultYaw: z.number().default(0),
  defaultPitch: z.number().default(0),
  links: z.array(LinkSchema).default([]),
  infoMarkers: z.array(InfoMarkerSchema).default([]),
});

const ZoneSchema = z.object({
  id: z.string(),
  label: z.string(),
});

const FloorPlanMarkerSchema = z.object({
  sceneId: z.string(),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  label: z.string().optional(),
  size: z.number().min(8).max(48).default(20),
});

const FloorPlanConfigSchema = z.object({
  image: z.string(),
  markers: z.array(FloorPlanMarkerSchema).default([]),
});

const ThemeSchema = z.object({
  accentColor:    z.string().optional(),
  overlayOpacity: z.number().min(0).max(1).default(0.88),
  uiDensity:      z.enum(['compact', 'default']).default('default'),
  logoPosition:   z.enum(['bottom-left', 'top-left', 'top-center']).default('bottom-left'),
});

const MetaSchema = z.object({
  title: z.string(),
  site: z.string(),
  startScene: z.string(),
  description: z.string().optional(),
  exploreUrl: z.string().optional(),
  exploreLabel: z.string().optional(),
  logo: z.string().optional(),
  themeColor: z.string().optional(),
  theme: ThemeSchema.optional(),
  floorPlan: z.union([z.literal(false), FloorPlanConfigSchema]).optional().default(false),
  guidedTour: z.array(z.union([
    z.string().transform((id): { sceneId: string; label?: string } => ({ sceneId: id })),
    z.object({ sceneId: z.string(), label: z.string().optional() }),
  ])).optional(),
  defaultHotspotStyle: LinkStyleSchema.optional(),
  transition: TransitionSchema.default({
    effect: 'crossfade',
    speedMs: 900,
    rotation: true,
    zoomToHotspot: true,
    zoomLevel: 55,
    blendMs: 360,
    lockInput: true,
  }),
  nadir: NadirSchema.default({
    enabled: false,
    size: 360,
    opacity: 0.9,
  }),
});

export const TourConfigSchema = z.object({
  meta: MetaSchema,
  zones: z.array(ZoneSchema),
  scenes: z.array(SceneSchema),
});

export type TourConfig = z.infer<typeof TourConfigSchema>;
export type ThemeConfig = z.infer<typeof ThemeSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type Link = z.infer<typeof LinkSchema>;
export type Zone = z.infer<typeof ZoneSchema>;
export type LinkPriority = z.infer<typeof LinkPrioritySchema>;
export type LinkStyle = z.infer<typeof LinkStyleSchema>;
export type InfoMarker = z.infer<typeof InfoMarkerSchema>;
export type FloorPlanMarker = z.infer<typeof FloorPlanMarkerSchema>;
export type FloorPlanConfig = z.infer<typeof FloorPlanConfigSchema>;
export type GuidedTourStep = { sceneId: string; label?: string };
