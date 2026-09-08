'use client';

import type { Scene, TourConfig } from '@/lib/types';
import type { TourValidationResult } from '@/lib/studio/tour-validation';
import { InfoMarkerInspector } from './InfoMarkerInspector';
import { LinkInspector } from './LinkInspector';
import { NadirInspector } from './NadirInspector';
import { GuidedTourInspector } from './GuidedTourInspector';
import { FloorPlanInspector } from './FloorPlanInspector';
import { SceneInspector } from './SceneInspector';
import { TransitionInspector } from './TransitionInspector';
import { IncomingLinksPanel } from './IncomingLinksPanel';

interface Props {
  slug: string;
  config: TourConfig;
  activeScene: Scene;
  selectedLinkIndex: number | null;
  validation: TourValidationResult;
  viewState: { yaw: number; pitch: number; zoom: number };
  isPlacingLink: boolean;
  isMovingHotspot: boolean;
  isPlacingInfoMarker: boolean;
  selectedInfoMarkerId: string | null;
  activeTab: 'scene' | 'incoming' | 'tour';
  onConfigChange: (config: TourConfig) => void;
  onSelectLink: (index: number | null) => void;
  onStartPlaceLink: (destinationSceneId: string) => void;
  onStartMoveHotspot: () => void;
  onSelectScene: (sceneId: string) => void;
  onSelectSceneWithArrival: (sceneId: string, arrivalYaw: number, arrivalPitch: number) => void;
  onTabChange: (tab: 'scene' | 'incoming' | 'tour') => void;
  onStartPlaceInfoMarker: () => void;
  onSelectInfoMarker: (id: string | null) => void;
  onMarkerAssetChange: (
    sceneId: string,
    markerId: string,
    field: 'imageUrl' | 'documentUrl',
    url: string,
  ) => void;
}

export function InspectorPanel({
  slug,
  config,
  activeScene,
  selectedLinkIndex,
  validation,
  viewState,
  isPlacingLink,
  isMovingHotspot,
  isPlacingInfoMarker,
  selectedInfoMarkerId,
  activeTab,
  onConfigChange,
  onSelectLink,
  onStartPlaceLink,
  onStartMoveHotspot,
  onSelectScene,
  onSelectSceneWithArrival,
  onTabChange,
  onStartPlaceInfoMarker,
  onSelectInfoMarker,
  onMarkerAssetChange,
}: Props) {
  const incomingCount = config.scenes.reduce(
    (acc, s) => acc + s.links.filter((l) => l.toScene === activeScene.id).length,
    0,
  );

  return (
    <aside className="min-h-0 overflow-y-auto border-l border-white/10 bg-[#10161d]">
      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Inspector</p>
        <h2 className="mt-1 truncate text-sm font-semibold text-slate-100">{activeScene.label}</h2>
      </div>

      <div className="flex border-b border-white/10">
        {(['scene', 'incoming', 'tour'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            className={
              activeTab === tab
                ? 'flex-1 border-b-2 border-cyan-400 py-2 text-xs font-semibold text-cyan-300'
                : 'flex-1 py-2 text-xs text-slate-400 hover:text-slate-200'
            }
          >
            {tab === 'scene' && 'Scene'}
            {tab === 'incoming' && <>Incoming {incomingCount > 0 && `(${incomingCount})`}</>}
            {tab === 'tour' && 'Tour'}
          </button>
        ))}
      </div>

      {activeTab === 'scene' && (
        <>
          <SceneInspector
            config={config}
            scene={activeScene}
            currentYaw={viewState.yaw}
            currentPitch={viewState.pitch}
            onConfigChange={onConfigChange}
          />
          <LinkInspector
            config={config}
            scene={activeScene}
            selectedLinkIndex={selectedLinkIndex}
            currentYaw={viewState.yaw}
            currentPitch={viewState.pitch}
            onConfigChange={onConfigChange}
            onSelectLink={onSelectLink}
            onStartPlaceLink={onStartPlaceLink}
            onStartMoveHotspot={onStartMoveHotspot}
          />
          <InfoMarkerInspector
            slug={slug}
            config={config}
            sceneId={activeScene.id}
            selectedMarkerId={selectedInfoMarkerId}
            currentYaw={viewState.yaw}
            currentPitch={viewState.pitch}
            isPlacingInfoMarker={isPlacingInfoMarker}
            onConfigChange={onConfigChange}
            onSelectMarker={onSelectInfoMarker}
            onStartPlace={onStartPlaceInfoMarker}
            onMarkerAssetChange={onMarkerAssetChange}
          />
          <section className="p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Validation</p>
            <div className="space-y-2">
              {[...validation.errors, ...validation.warnings].map((issue, index) => (
                <div
                  key={`${issue.code}-${index}`}
                  className={
                    issue.level === 'error'
                      ? 'rounded-md border border-red-400/20 bg-red-400/10 p-2 text-xs text-red-100'
                      : 'rounded-md border border-amber-400/20 bg-amber-400/10 p-2 text-xs text-amber-100'
                  }
                >
                  {issue.message}
                </div>
              ))}
              {[...validation.errors, ...validation.warnings].length === 0 && (
                <p className="text-sm text-slate-500">No issues found.</p>
              )}
            </div>
          </section>
        </>
      )}

      {activeTab === 'incoming' && (
        <IncomingLinksPanel
          config={config}
          activeScene={activeScene}
          viewState={viewState}
          onConfigChange={onConfigChange}
          onSelectScene={onSelectScene}
          onSelectSceneWithArrival={onSelectSceneWithArrival}
        />
      )}

      {activeTab === 'tour' && (
        <>
          <TransitionInspector config={config} onConfigChange={onConfigChange} />
          <NadirInspector slug={slug} config={config} onConfigChange={onConfigChange} />
          <GuidedTourInspector config={config} onConfigChange={onConfigChange} />
          <FloorPlanInspector slug={slug} config={config} activeSceneId={activeScene.id} onConfigChange={onConfigChange} />
        </>
      )}

    </aside>
  );
}
