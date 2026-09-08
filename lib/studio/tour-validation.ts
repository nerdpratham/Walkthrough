import type { TourConfig } from '@/lib/types';

export type TourValidationLevel = 'error' | 'warning';

export interface TourValidationIssue {
  level: TourValidationLevel;
  code: string;
  message: string;
  sceneId?: string;
  linkIndex?: number;
}

export interface TourValidationResult {
  errors: TourValidationIssue[];
  warnings: TourValidationIssue[];
}

function addIssue(issues: TourValidationIssue[], issue: TourValidationIssue) {
  issues.push(issue);
}

export function validateTourDraft(config: TourConfig): TourValidationResult {
  const errors: TourValidationIssue[] = [];
  const warnings: TourValidationIssue[] = [];
  const zoneIds = new Set(config.zones.map((zone) => zone.id));
  const sceneIds = new Set(config.scenes.map((scene) => scene.id));

  if (!sceneIds.has(config.meta.startScene)) {
    addIssue(errors, {
      level: 'error',
      code: 'missing-start-scene',
      message: `Start scene "${config.meta.startScene}" does not exist.`,
    });
  }

  for (const scene of config.scenes) {
    if (!zoneIds.has(scene.zone)) {
      addIssue(errors, {
        level: 'error',
        code: 'missing-zone',
        message: `Scene "${scene.label}" uses missing zone "${scene.zone}".`,
        sceneId: scene.id,
      });
    }

    const visibleLinks = scene.links.filter((link) => link.priority !== 'hidden');
    if (visibleLinks.length > 4) {
      addIssue(warnings, {
        level: 'warning',
        code: 'too-many-visible-links',
        message: `Scene "${scene.label}" has ${visibleLinks.length} visible links.`,
        sceneId: scene.id,
      });
    }

    const sortedYawLinks = visibleLinks
      .map((link, index) => ({ yaw: link.hotspotYaw, index }))
      .sort((a, b) => a.yaw - b.yaw);

    for (let i = 1; i < sortedYawLinks.length; i += 1) {
      if (Math.abs(sortedYawLinks[i].yaw - sortedYawLinks[i - 1].yaw) < 12) {
        addIssue(warnings, {
          level: 'warning',
          code: 'clustered-visible-links',
          message: `Scene "${scene.label}" has visible links closer than 12 degrees.`,
          sceneId: scene.id,
          linkIndex: sortedYawLinks[i].index,
        });
      }
    }

    scene.links.forEach((link, linkIndex) => {
      if (!sceneIds.has(link.toScene)) {
        addIssue(errors, {
          level: 'error',
          code: 'broken-link-target',
          message: `Link points to missing scene "${link.toScene}".`,
          sceneId: scene.id,
          linkIndex,
        });
      }
    });
  }

  const allLinks = config.scenes.flatMap((scene) => scene.links);
  const allArrivalYawZero = allLinks.length > 0 && allLinks.every((link) => link.arrivalYaw === 0);

  if (allArrivalYawZero) {
    addIssue(warnings, {
      level: 'warning',
      code: 'all-arrival-yaw-zero',
      message: 'All arrivalYaw values are 0. Direction-aware arrival is not calibrated yet.',
    });
  }

  return { errors, warnings };
}
