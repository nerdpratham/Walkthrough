import type { EffectName, Scene, TourConfig } from './types';

export interface PsvLink {
  nodeId: string;
  position: { yaw: string; pitch: string };
  data: {
    arrivalYaw: number;
    arrivalPitch: number;
    priority: string;
    style: string;
    label?: string;
    transitionOverride: { effect?: EffectName; speedMs?: number; zoomLevel?: number; blendMs?: number } | null;
  };
}

export interface PsvNode {
  id: string;
  panorama: string;
  name: string;
  links: PsvLink[];
  markers?: unknown[];
  data: { zone: string; defaultYaw: number; defaultPitch: number };
}

function createNadirMarkers(config: TourConfig): unknown[] {
  const nadir = config.meta.nadir;
  if (!nadir.enabled || !nadir.image) return [];

  return [{
    id: 'nadir-patch',
    imageLayer: nadir.image,
    position: { yaw: '0deg', pitch: '-90deg' },
    size: { width: nadir.size, height: nadir.size },
    opacity: nadir.opacity,
  }];
}

function createInfoMarkers(scene: Scene): unknown[] {
  return scene.infoMarkers
    .filter((m) => m.enabled)
    .map((m) => {
      const showLabel = m.showLabel && m.title;
      const safeTitle = m.title
        ? m.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
        : '';
      return {
        id: `info-${m.id}`,
        position: { yaw: `${m.yaw}deg`, pitch: `${m.pitch}deg` },
        html: showLabel
          ? `<div class="info-marker-wrap"><div class="info-marker-btn">i</div><span class="info-marker-lbl">${safeTitle}</span></div>`
          : '<div class="info-marker-btn">i</div>',
        anchor: showLabel ? 'center top' : 'center center',
        tooltip: false,
        data: { infoMarker: m },
      };
    });
}

export function toPsvNodes(config: TourConfig): PsvNode[] {
  const nadirMarkers = createNadirMarkers(config);

  return config.scenes.map((scene) => ({
    id: scene.id,
    panorama: scene.panorama,
    name: scene.label,
    links: scene.links
      .filter((link) => link.priority !== 'hidden')
      .map((link) => ({
        nodeId: link.toScene,
        position: {
          yaw: `${link.hotspotYaw}deg`,
          pitch: `${link.hotspotPitch}deg`,
        },
        data: {
          arrivalYaw: link.arrivalYaw,
          arrivalPitch: link.arrivalPitch ?? 0,
          priority: link.priority,
          style: link.style ?? config.meta.defaultHotspotStyle ?? 'dot',
          label: link.label,
          transitionOverride: link.transitionOverride ?? null,
        },
      })),
    markers: [...nadirMarkers, ...createInfoMarkers(scene)],
    data: {
      zone: scene.zone,
      defaultYaw: scene.defaultYaw,
      defaultPitch: scene.defaultPitch,
    },
  }));
}
