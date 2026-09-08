'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { TourConfig } from '@/lib/types';
import { TourViewer } from './TourViewer';
import { StartScreen } from './StartScreen';
// Enter-tour water transition is disabled. To re-enable: restore `isEntering`
// state, render <TourEnterTransition> below, and point StartScreen's onStart at
// setIsEntering(true).
// import { TourEnterTransition } from './TourEnterTransition';
import { RoomList } from './RoomList';
import { ControlBar } from './ControlBar';
import { CurrentZoneLabel } from './CurrentZoneLabel';
import { SceneBanner } from './SceneBanner';
import { GuidedTourBar } from './GuidedTourBar';
import { FloorPlan } from './FloorPlan';
import { HotspotStyles } from './HotspotStyles';
import { InfoMarkerPanel } from './InfoMarkerPanel';
import type { InfoMarker } from '@/lib/types';
import { resolveDocumentTitle } from '@/lib/document-title';

export function TourShell({ config }: { config: TourConfig }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isStarted, setIsStarted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentSceneId, setCurrentSceneId] = useState(() => {
    const requested = searchParams.get('scene');
    return requested && config.scenes.some((s) => s.id === requested)
      ? requested
      : config.meta.startScene;
  });
  const [currentZone, setCurrentZone] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);

  interface MarkerState { marker: InfoMarker; x: number; y: number }
  const [hoverMarker, setHoverMarker] = useState<MarkerState | null>(null);
  const [openMarker, setOpenMarker] = useState<MarkerState | null>(null);

  const goBackRef = useRef<() => void>(() => {});
  const selectSceneRef = useRef<((id: string) => void) | null>(null);

  const activeScene = config.scenes.find((s) => s.id === currentSceneId) ?? null;

  useEffect(() => {
    document.title = resolveDocumentTitle({
      tourTitle: config.meta.title,
      activeScene,
      openMarker: openMarker?.marker ?? null,
    });
  }, [activeScene, openMarker, config.meta.title]);

  const handleSceneChange = useCallback((sceneId: string, zone: string) => {
    setCurrentSceneId(sceneId);
    setCurrentZone(config.zones.find((z) => z.id === zone)?.label ?? '');
    setHoverMarker(null);
    setOpenMarker(null);

    router.replace(`${pathname}?scene=${encodeURIComponent(sceneId)}`, { scroll: false });
  }, [config.zones, pathname, router]);

  const handleTransitionStart = useCallback(() => setIsTransitioning(true), []);
  const handleTransitionEnd = useCallback(() => setIsTransitioning(false), []);

  const registerGoBack = useCallback((fn: () => void) => {
    goBackRef.current = fn;
  }, []);

  const registerSelectScene = useCallback((fn: (id: string) => void) => {
    selectSceneRef.current = fn;
  }, []);

  const goToScene = useCallback((id: string) => {
    const scene = config.scenes.find((s) => s.id === id);
    if (!scene) return;
    handleSceneChange(id, scene.zone);
    selectSceneRef.current?.(id);
  }, [config.scenes, handleSceneChange]);

  const { guidedRoute, guidedLabels } = useMemo(() => {
    const steps = config.meta.guidedTour ?? [];
    const seen = new Set<string>();
    const route: string[] = [];
    const labels: Record<string, string> = {};
    for (const step of steps) {
      const id = step.sceneId;
      if (seen.has(id) || !config.scenes.some((s) => s.id === id)) continue;
      seen.add(id);
      route.push(id);
      if (step.label) labels[id] = step.label;
    }
    return { guidedRoute: route, guidedLabels: labels };
  }, [config.meta.guidedTour, config.scenes]);

  return (
    <>
      <HotspotStyles />

      <TourViewer
        config={config}
        initialSceneId={currentSceneId}
        onSceneChange={handleSceneChange}
        onTransitionStart={handleTransitionStart}
        onTransitionEnd={handleTransitionEnd}
        onBackReady={setCanGoBack}
        registerGoBack={registerGoBack}
        registerSelectScene={registerSelectScene}
        isStarted={isStarted}
        onHoverInfoMarker={(state) => {
          if (openMarker) return;
          setHoverMarker(state);
        }}
        onOpenInfoMarker={(state) => {
          setHoverMarker(null);
          setOpenMarker(state);
        }}
      />

      {!isStarted && (
        <StartScreen config={config} onStart={() => setIsStarted(true)} />
      )}

      {isStarted && (
        <>
          {/* Transition overlay — blocks clicks during scene change */}
          <div
            className="absolute inset-0 z-30 pointer-events-none"
            style={{ pointerEvents: isTransitioning ? 'all' : 'none' }}
          />
          <RoomList
            config={config}
            currentSceneId={currentSceneId}
            onSelectScene={goToScene}
          />
          <CurrentZoneLabel label={currentZone} />
          <SceneBanner scene={activeScene} />
          <GuidedTourBar
            route={guidedRoute}
            labels={guidedLabels}
            currentSceneId={currentSceneId}
            onGoToScene={goToScene}
          />
          <ControlBar
            canGoBack={canGoBack}
            onBack={() => goBackRef.current?.()}
          />
          <FloorPlan config={config} currentSceneId={currentSceneId} onGoToScene={goToScene} />
        </>
      )}

      <InfoMarkerPanel
        hoverMarker={hoverMarker}
        openMarker={openMarker}
        themeColor={config.meta.themeColor}
        onClose={() => setOpenMarker(null)}
      />
    </>
  );
}
