'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Link, TourConfig } from '@/lib/types';
import { addInfoMarker, addLink, addScenesFromPanoramas, removeInfoMarker, removeLink, removeScene, updateInfoMarker, updateLink, updateScene } from '@/lib/studio/editor-state';
import { validateTourDraft } from '@/lib/studio/tour-validation';
import { CalibrationStrip } from './CalibrationStrip';
import { PanoramaUploader } from './PanoramaUploader';
import { InspectorPanel } from './InspectorPanel';
import { SceneNavigator } from './SceneNavigator';
import { StudioTopBar } from './StudioTopBar';
import { StudioViewer } from './StudioViewer';

interface Props {
  slug: string;
  initialConfig: TourConfig;
}

export function StudioEditorShell({ slug, initialConfig }: Props) {
  const [draft, setDraft] = useState(initialConfig);
  const draftRef = useRef(draft);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [activeSceneId, setActiveSceneId] = useState(initialConfig.meta.startScene);
  const [selectedLinkIndex, setSelectedLinkIndex] = useState<number | null>(null);
  const [viewState, setViewState] = useState({ yaw: 0, pitch: 0, zoom: 0 });

  const navigateWithArrivalRef = useRef<((sceneId: string, arrivalYaw: number, arrivalPitch: number) => void) | null>(null);

  const historyRef = useRef<{ past: TourConfig[]; future: TourConfig[] }>({ past: [], future: [] });
  const [historyCount, setHistoryCount] = useState(0);

  const applyChange = useCallback((next: TourConfig) => {
    historyRef.current.past.push(draft);
    historyRef.current.future = [];
    if (historyRef.current.past.length > 50) historyRef.current.past.shift();
    setHistoryCount(historyRef.current.past.length);
    setDraft(next);
  }, [draft]);
  const applyChangeRef = useRef(applyChange);
  useLayoutEffect(() => {
    draftRef.current = draft;
    applyChangeRef.current = applyChange;
  }, [draft, applyChange]);

  const undo = useCallback(() => {
    const prev = historyRef.current.past.pop();
    if (!prev) return;
    historyRef.current.future.push(draft);
    setHistoryCount(historyRef.current.past.length);
    setDraft(prev);
  }, [draft]);

  const redo = useCallback(() => {
    const next = historyRef.current.future.pop();
    if (!next) return;
    historyRef.current.past.push(draft);
    setHistoryCount(historyRef.current.past.length);
    setDraft(next);
  }, [draft]);

  const [isPlacingLink, setIsPlacingLink] = useState(false);
  const [isMovingHotspot, setIsMovingHotspot] = useState(false);
  const [pendingLinkDestination, setPendingLinkDestination] = useState<string | null>(null);
  const [isPlacingInfoMarker, setIsPlacingInfoMarker] = useState(false);
  const [selectedInfoMarkerId, setSelectedInfoMarkerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'scene' | 'incoming' | 'tour'>('scene');

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'failed' | 'dev-only'>('idle');

  const persistConfig = useCallback(async (config: TourConfig) => {
    setSaveStatus('saving');
    try {
      const response = await fetch(`/api/studio/tours/${slug}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (response.status === 403) { setSaveStatus('dev-only'); return; }
      if (!response.ok) { setSaveStatus('failed'); return; }
      setSaveStatus('saved');
    } catch {
      setSaveStatus('failed');
    }
  }, [slug]);

  const saveConfig = useCallback(() => persistConfig(draft), [persistConfig, draft]);

  const router = useRouter();

  // Uploading panoramas adds a scene per new image and persists immediately,
  // so freshly uploaded scenes can't be lost by forgetting to save.
  const handlePanoramasUploaded = useCallback((filenames: string[]) => {
    // Never persist a blank name — fall back to "New Tour".
    const titled = draft.meta.title.trim()
      ? draft
      : { ...draft, meta: { ...draft.meta, title: 'New Tour' } };
    const next = addScenesFromPanoramas(titled, slug, filenames);
    if (next === titled) return;
    applyChange(next);
    setActiveSceneId((prev) =>
      next.scenes.some((s) => s.id === prev) ? prev : next.meta.startScene || next.scenes[0]?.id || prev,
    );
    void persistConfig(next);
  }, [draft, slug, applyChange, persistConfig]);

  // Lightweight name setter for the new-tour field — no undo entry per keystroke.
  const setTourTitle = useCallback((title: string) => {
    setDraft((d) => ({ ...d, meta: { ...d.meta, title } }));
  }, []);

  const handleDeleteScene = useCallback((sceneId: string) => {
    const next = removeScene(draft, sceneId);
    applyChange(next);
    setActiveSceneId((prev) =>
      prev === sceneId ? next.meta.startScene || next.scenes[0]?.id || '' : prev,
    );
  }, [draft, applyChange]);

  const handleTitleChange = useCallback((title: string) => {
    applyChange({ ...draft, meta: { ...draft.meta, title } });
    // Persist the rename right away, like the homepage — metadata shouldn't
    // wait for a full Save the way in-progress scene/hotspot edits do.
    void fetch(`/api/studio/tours/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    }).catch(() => {});
  }, [draft, applyChange, slug]);

  // A tour with no scenes was never finished — discard it on the way out so
  // abandoned "New tour" clicks don't leave empty folders behind.
  const handleLeave = useCallback(async () => {
    if (draft.scenes.length === 0) {
      await fetch(`/api/studio/tours/${slug}`, { method: 'DELETE' }).catch(() => {});
    }
    router.push('/studio');
  }, [draft.scenes.length, slug, router]);

  const validation = useMemo(() => validateTourDraft(draft), [draft]);
  const activeScene = useMemo(
    () => draft.scenes.find((scene) => scene.id === activeSceneId) ?? draft.scenes[0],
    [draft, activeSceneId],
  );
  const handleViewerSceneChange = useCallback((sceneId: string) => {
    setActiveSceneId(sceneId);
    setSelectedLinkIndex(null);
  }, []);

  const handleSelectSceneWithArrival = useCallback((sceneId: string, arrivalYaw: number, arrivalPitch: number) => {
    setSelectedLinkIndex(null);
    navigateWithArrivalRef.current?.(sceneId, arrivalYaw, arrivalPitch);
  }, []);

  const handleStartPlaceLink = useCallback((destinationSceneId: string) => {
    setPendingLinkDestination(destinationSceneId);
    setIsPlacingLink(true);
  }, []);

  const handleStartMoveHotspot = useCallback(() => {
    setIsMovingHotspot(true);
    setIsPlacingLink(true);
  }, []);

  const handleCancelPlaceMode = useCallback(() => {
    setIsPlacingLink(false);
    setIsMovingHotspot(false);
    setPendingLinkDestination(null);
  }, []);

  const handleStartPlaceInfoMarker = useCallback(() => {
    handleCancelPlaceMode();
    setIsPlacingInfoMarker(true);
  }, [handleCancelPlaceMode]);

  const handlePlaceInfoMarker = useCallback((yaw: number, pitch: number) => {
    const id = `marker-${Date.now()}`;
    applyChange(addInfoMarker(draft, activeScene.id, { id, yaw, pitch, enabled: true, imageDisplay: 'lightbox', showLabel: false }));
    setSelectedInfoMarkerId(id);
    setIsPlacingInfoMarker(false);
  }, [draft, activeScene, applyChange]);

  const handleSelectLink = useCallback((index: number | null) => {
    setSelectedLinkIndex(index);
    if (index !== null) setSelectedInfoMarkerId(null);
  }, []);

  const handleSelectInfoMarker = useCallback((id: string | null) => {
    setSelectedInfoMarkerId(id);
    if (id !== null) setSelectedLinkIndex(null);
  }, []);

  const handleMarkerAssetChange = useCallback((
    sceneId: string,
    markerId: string,
    field: 'imageUrl' | 'documentUrl',
    url: string,
  ) => {
    const current = draftRef.current;
    const markerStillExists = current.scenes
      .find((scene) => scene.id === sceneId)
      ?.infoMarkers?.some((marker) => marker.id === markerId);
    if (!markerStillExists) return;

    const patch = field === 'imageUrl'
      ? { imageUrl: url || undefined }
      : { documentUrl: url || undefined };
    applyChangeRef.current(updateInfoMarker(current, sceneId, markerId, patch));
  }, []);

  const handlePlaceLink = useCallback((yaw: number, pitch: number) => {
    if (isMovingHotspot && selectedLinkIndex !== null) {
      applyChange(updateLink(draft, activeScene.id, selectedLinkIndex, {
        hotspotYaw: yaw,
        hotspotPitch: pitch,
      }));
    } else if (pendingLinkDestination) {
      const target = draft.scenes.find((s) => s.id === pendingLinkDestination);
      const nextLink: Link = {
        toScene: pendingLinkDestination,
        hotspotYaw: yaw,
        hotspotPitch: pitch,
        arrivalYaw: 0,
        arrivalPitch: 0,
        priority: 'primary',
        style: draft.meta.defaultHotspotStyle ?? 'dot',
        label: target?.label,
      };
      const newIndex = activeScene.links.length; // length before add == index after add
      applyChange(addLink(draft, activeScene.id, nextLink));
      setSelectedLinkIndex(newIndex);
      setSelectedInfoMarkerId(null);
    }
    setIsPlacingLink(false);
    setIsMovingHotspot(false);
    setPendingLinkDestination(null);
  }, [isMovingHotspot, selectedLinkIndex, pendingLinkDestination, draft, activeScene, applyChange]);

  useEffect(() => {
    if (mode !== 'edit') return;

    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) return;

      const isMod = e.ctrlKey || e.metaKey;

      if (isMod && e.key === 's') {
        e.preventDefault();
        saveConfig();
        return;
      }
      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (isMod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === 'Escape') {
        if (isPlacingInfoMarker) {
          setIsPlacingInfoMarker(false);
        } else if (isPlacingLink) {
          handleCancelPlaceMode();
        } else {
          setSelectedLinkIndex(null);
          setSelectedInfoMarkerId(null);
        }
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && activeScene) {
        if (selectedLinkIndex !== null) {
          e.preventDefault();
          applyChange(removeLink(draft, activeScene.id, selectedLinkIndex));
          setSelectedLinkIndex(null);
          return;
        }
        if (selectedInfoMarkerId !== null) {
          e.preventDefault();
          applyChange(removeInfoMarker(draft, activeScene.id, selectedInfoMarkerId));
          setSelectedInfoMarkerId(null);
          return;
        }
      }
      if (selectedLinkIndex !== null && activeScene) {
        const link = activeScene.links[selectedLinkIndex];
        if (!link) return;
        const step = e.shiftKey ? 5 : 1;
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          applyChange(updateLink(draft, activeScene.id, selectedLinkIndex, { hotspotYaw: link.hotspotYaw - step }));
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          applyChange(updateLink(draft, activeScene.id, selectedLinkIndex, { hotspotYaw: link.hotspotYaw + step }));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          applyChange(updateLink(draft, activeScene.id, selectedLinkIndex, { hotspotPitch: link.hotspotPitch + step }));
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          applyChange(updateLink(draft, activeScene.id, selectedLinkIndex, { hotspotPitch: link.hotspotPitch - step }));
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mode, undo, redo, saveConfig, applyChange, draft, activeScene, selectedLinkIndex, isPlacingLink, isPlacingInfoMarker, selectedInfoMarkerId, handleCancelPlaceMode]);

  if (!activeScene) {
    return (
      <main className="grid h-screen w-screen place-items-center bg-[#0b0d10] px-6 text-slate-100">
        <div className="w-full max-w-md">
          <button type="button" onClick={handleLeave} className="text-xs text-slate-500 hover:text-slate-300">← Tours</button>
          <h1 className="mt-2 text-lg font-semibold text-slate-100">New tour</h1>

          <label htmlFor="tour-name" className="mt-4 block text-xs font-medium text-slate-400">Tour name</label>
          <input
            id="tour-name"
            value={draft.meta.title}
            onChange={(e) => setTourTitle(e.target.value)}
            placeholder="New Tour"
            className="mt-1 w-full rounded-md border border-white/10 bg-[#10161d] px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />

          <p className="mt-4 text-sm text-slate-400">
            Upload panoramas to get started — drop them anywhere on this page or use the button. Each image becomes a scene.
          </p>
          <div className="mt-3 rounded-lg border border-white/10 bg-[#10161d]">
            <PanoramaUploader slug={slug} onUploaded={handlePanoramasUploaded} dropAnywhere />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className={
        mode === 'edit'
          ? 'grid h-screen w-screen grid-rows-[56px_1fr_40px] overflow-hidden bg-[#0b0d10] text-slate-100'
          : 'grid h-screen w-screen grid-rows-[56px_1fr] overflow-hidden bg-[#0b0d10] text-slate-100'
      }
    >
      <StudioTopBar
        slug={slug}
        config={draft}
        mode={mode}
        validation={validation}
        historyCount={historyCount}
        saveStatus={saveStatus}
        onSave={saveConfig}
        onModeChange={setMode}
        onTitleChange={handleTitleChange}
      />

      <section
        className={
          mode === 'preview'
            ? 'relative overflow-hidden'
            : 'grid min-h-0 grid-cols-[280px_1fr_360px] overflow-hidden'
        }
      >
        {mode === 'edit' && (
          <div className="grid min-h-0 grid-rows-[1fr_auto] overflow-hidden border-r border-white/10">
            <SceneNavigator
              config={draft}
              activeSceneId={activeSceneId}
              validation={validation}
              onSelectScene={(sceneId) => {
                setActiveSceneId(sceneId);
                setSelectedLinkIndex(null);
              }}
              onConfigChange={applyChange}
              onDeleteScene={handleDeleteScene}
            />
            <PanoramaUploader slug={slug} onUploaded={handlePanoramasUploaded} />
          </div>
        )}

        <div className="relative h-full min-w-0 bg-black">
          <StudioViewer
            config={draft}
            activeSceneId={activeSceneId}
            mode={mode}
            isPlacingLink={isPlacingLink}
            isPlacingInfoMarker={isPlacingInfoMarker}
            onViewChange={setViewState}
            onSceneChange={handleViewerSceneChange}
            onPlaceLink={handlePlaceLink}
            onPlaceInfoMarker={handlePlaceInfoMarker}
            onSelectInfoMarker={handleSelectInfoMarker}
            registerNavigateWithArrival={(fn) => { navigateWithArrivalRef.current = fn; }}
          />
          {(isPlacingLink || isPlacingInfoMarker) && (
            <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-lg border border-cyan-400/30 bg-slate-900/90 px-4 py-2 text-xs text-cyan-100 shadow-lg backdrop-blur-sm">
              {isPlacingInfoMarker
                ? 'Click in the panorama to place the info marker — Esc to cancel'
                : 'Click in the panorama to place the hotspot — Esc to cancel'}
            </div>
          )}
        </div>

        {mode === 'edit' && (
          <InspectorPanel
            slug={slug}
            config={draft}
            activeScene={activeScene}
            selectedLinkIndex={selectedLinkIndex}
            validation={validation}
            viewState={viewState}
            isPlacingLink={isPlacingLink}
            isMovingHotspot={isMovingHotspot}
            isPlacingInfoMarker={isPlacingInfoMarker}
            selectedInfoMarkerId={selectedInfoMarkerId}
            activeTab={activeTab}
            onConfigChange={applyChange}
            onSelectLink={handleSelectLink}
            onStartPlaceLink={handleStartPlaceLink}
            onStartMoveHotspot={handleStartMoveHotspot}
            onSelectScene={handleViewerSceneChange}
            onSelectSceneWithArrival={handleSelectSceneWithArrival}
            onTabChange={setActiveTab}
            onStartPlaceInfoMarker={handleStartPlaceInfoMarker}
            onSelectInfoMarker={handleSelectInfoMarker}
            onMarkerAssetChange={handleMarkerAssetChange}
          />
        )}
      </section>

      {mode === 'edit' && (
        <CalibrationStrip
          activeScene={activeScene}
          selectedLinkIndex={selectedLinkIndex}
          viewState={viewState}
          onSetSceneDefault={() => applyChange(updateScene(draft, activeScene.id, { defaultYaw: viewState.yaw, defaultPitch: viewState.pitch }))}
          onSetHotspotPosition={() => {
            if (selectedLinkIndex === null) return;
            applyChange(updateLink(draft, activeScene.id, selectedLinkIndex, {
              hotspotYaw: viewState.yaw,
              hotspotPitch: viewState.pitch,
            }));
          }}
          onSetArrival={() => {
            if (selectedLinkIndex === null) return;
            applyChange(updateLink(draft, activeScene.id, selectedLinkIndex, {
              arrivalYaw: viewState.yaw,
              arrivalPitch: viewState.pitch,
            }));
          }}
        />
      )}
    </main>
  );
}
