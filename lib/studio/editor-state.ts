import type { FloorPlanConfig, FloorPlanMarker, GuidedTourStep, InfoMarker, Link, Scene, TourConfig } from '@/lib/types';

export function updateScene(config: TourConfig, sceneId: string, patch: Partial<Scene>): TourConfig {
  return {
    ...config,
    scenes: config.scenes.map((scene) => (
      scene.id === sceneId ? { ...scene, ...patch, id: scene.id } : scene
    )),
  };
}

export function updateLink(
  config: TourConfig,
  sceneId: string,
  linkIndex: number,
  patch: Partial<Link>,
): TourConfig {
  return {
    ...config,
    scenes: config.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene;
      return {
        ...scene,
        links: scene.links.map((link, index) => (
          index === linkIndex ? { ...link, ...patch } : link
        )),
      };
    }),
  };
}

export function addLink(config: TourConfig, sceneId: string, link: Link): TourConfig {
  return {
    ...config,
    scenes: config.scenes.map((scene) => (
      scene.id === sceneId ? { ...scene, links: [...scene.links, link] } : scene
    )),
  };
}

export function removeLink(config: TourConfig, sceneId: string, linkIndex: number): TourConfig {
  return {
    ...config,
    scenes: config.scenes.map((scene) => (
      scene.id === sceneId
        ? { ...scene, links: scene.links.filter((_, index) => index !== linkIndex) }
        : scene
    )),
  };
}

export function setTransition(
  config: TourConfig,
  patch: Partial<TourConfig['meta']['transition']>,
): TourConfig {
  return {
    ...config,
    meta: {
      ...config.meta,
      transition: { ...config.meta.transition, ...patch },
    },
  };
}

export function updateLinkTransitionOverride(
  config: TourConfig,
  sceneId: string,
  linkIndex: number,
  patch: NonNullable<Link['transitionOverride']>,
): TourConfig {
  return {
    ...config,
    scenes: config.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene;
      return {
        ...scene,
        links: scene.links.map((link, index) => {
          if (index !== linkIndex) return link;
          return { ...link, transitionOverride: { ...link.transitionOverride, ...patch } };
        }),
      };
    }),
  };
}

export function setNadir(
  config: TourConfig,
  patch: Partial<TourConfig['meta']['nadir']>,
): TourConfig {
  return {
    ...config,
    meta: {
      ...config.meta,
      nadir: { ...config.meta.nadir, ...patch },
    },
  };
}

export function setGuidedTour(config: TourConfig, steps: GuidedTourStep[]): TourConfig {
  return {
    ...config,
    meta: {
      ...config.meta,
      guidedTour: steps.length > 0 ? steps : undefined,
    },
  };
}

export function addInfoMarker(config: TourConfig, sceneId: string, marker: InfoMarker): TourConfig {
  return {
    ...config,
    scenes: config.scenes.map((scene) =>
      scene.id === sceneId
        ? { ...scene, infoMarkers: [...scene.infoMarkers, marker] }
        : scene,
    ),
  };
}

export function updateInfoMarker(
  config: TourConfig,
  sceneId: string,
  markerId: string,
  patch: Partial<InfoMarker>,
): TourConfig {
  return {
    ...config,
    scenes: config.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene;
      return {
        ...scene,
        infoMarkers: scene.infoMarkers.map((m) =>
          m.id === markerId ? { ...m, ...patch, id: m.id } : m,
        ),
      };
    }),
  };
}

export function removeInfoMarker(config: TourConfig, sceneId: string, markerId: string): TourConfig {
  return {
    ...config,
    scenes: config.scenes.map((scene) =>
      scene.id === sceneId
        ? { ...scene, infoMarkers: scene.infoMarkers.filter((m) => m.id !== markerId) }
        : scene,
    ),
  };
}

export function renameScene(config: TourConfig, sceneId: string, label: string): TourConfig {
  return updateScene(config, sceneId, { label });
}

export function moveScene(config: TourConfig, fromIndex: number, toIndex: number): TourConfig {
  if (fromIndex === toIndex) return config;
  const scenes = [...config.scenes];
  const [moved] = scenes.splice(fromIndex, 1);
  scenes.splice(toIndex, 0, moved);
  return { ...config, scenes };
}

/**
 * Removes a scene and any links in other scenes that pointed to it, so no
 * dangling references are left. If the removed scene was the start scene, the
 * first remaining scene takes over (or none, leaving the tour empty).
 */
export function removeScene(config: TourConfig, sceneId: string): TourConfig {
  const scenes = config.scenes
    .filter((scene) => scene.id !== sceneId)
    .map((scene) => {
      const links = scene.links.filter((link) => link.toScene !== sceneId);
      return links.length === scene.links.length ? scene : { ...scene, links };
    });

  const startScene = config.meta.startScene === sceneId
    ? scenes[0]?.id ?? ''
    : config.meta.startScene;

  return { ...config, scenes, meta: { ...config.meta, startScene } };
}

/**
 * Appends a scene for each uploaded panorama filename that isn't already in the
 * tour. New scenes go to the first zone, are labelled from the filename, and
 * carry no links or markers. If the tour had no startScene, the first scene
 * becomes it. Uploading is the only way to add scenes, so this is the bridge
 * from a blank tour to an editable one.
 */
export function addScenesFromPanoramas(
  config: TourConfig,
  slug: string,
  filenames: string[],
): TourConfig {
  const usedPanoramas = new Set(config.scenes.map((s) => s.panorama));
  const usedIds = new Set(config.scenes.map((s) => s.id));
  const zone = config.zones[0]?.id ?? 'main';

  const newScenes: Scene[] = [];
  for (const filename of filenames) {
    // Files keep their original names (spaces, case), so the URL path must be
    // encoded — the label below stays human-readable.
    const panorama = `/tours/${slug}/panoramas/${encodeURIComponent(filename)}`;
    if (usedPanoramas.has(panorama)) continue;

    const base = filename.replace(/\.[^.]+$/, '');
    let id = base;
    let n = 2;
    while (usedIds.has(id)) id = `${base}-${n++}`;

    usedIds.add(id);
    usedPanoramas.add(panorama);
    newScenes.push({
      id,
      label: base,
      zone,
      panorama,
      defaultYaw: 0,
      defaultPitch: 0,
      links: [],
      infoMarkers: [],
    });
  }

  if (newScenes.length === 0) return config;

  const scenes = [...config.scenes, ...newScenes];
  return {
    ...config,
    scenes,
    meta: { ...config.meta, startScene: config.meta.startScene || scenes[0].id },
  };
}

export function setFloorPlan(config: TourConfig, patch: Partial<FloorPlanConfig>): TourConfig {
  const base: FloorPlanConfig = config.meta.floorPlan || { image: '', markers: [] };
  const next: FloorPlanConfig = { ...base, ...patch };
  return {
    ...config,
    meta: { ...config.meta, floorPlan: next.image ? next : false },
  };
}

export function addFloorPlanMarker(config: TourConfig, marker: FloorPlanMarker): TourConfig {
  const fp = config.meta.floorPlan;
  if (!fp) return config;
  return {
    ...config,
    meta: { ...config.meta, floorPlan: { ...fp, markers: [...fp.markers, marker] } },
  };
}

export function updateFloorPlanMarker(
  config: TourConfig,
  index: number,
  patch: Partial<FloorPlanMarker>,
): TourConfig {
  const fp = config.meta.floorPlan;
  if (!fp) return config;
  return {
    ...config,
    meta: {
      ...config.meta,
      floorPlan: {
        ...fp,
        markers: fp.markers.map((marker, i) => (i === index ? { ...marker, ...patch } : marker)),
      },
    },
  };
}

export function removeFloorPlanMarker(config: TourConfig, index: number): TourConfig {
  const fp = config.meta.floorPlan;
  if (!fp) return config;
  return {
    ...config,
    meta: { ...config.meta, floorPlan: { ...fp, markers: fp.markers.filter((_, i) => i !== index) } },
  };
}
