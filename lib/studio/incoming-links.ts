import type { Link, Scene, TourConfig } from '@/lib/types';

export interface IncomingLink {
  scene: Scene;
  link: Link;
  index: number;
}

export function getIncomingLinks(config: TourConfig, sceneId: string): IncomingLink[] {
  return config.scenes.flatMap((scene) =>
    scene.links
      .map((link, index) => ({ scene, link, index }))
      .filter(({ link }) => link.toScene === sceneId),
  );
}
