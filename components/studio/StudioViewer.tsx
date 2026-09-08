'use client';

import { useEffect, useRef } from 'react';
import type { TourConfig } from '@/lib/types';
import { needsCustomEngine, playTransition } from '@/lib/transition-engine';
import {
  getPsvTransitionOptions,
  getWalkMotion,
  isWalkEffect,
  resolveLinkTransition,
  waitForViewerReadyFrame,
} from '@/lib/viewer-transition';

interface ViewState {
  yaw: number;
  pitch: number;
  zoom: number;
}

interface Props {
  config: TourConfig;
  activeSceneId: string;
  mode: 'edit' | 'preview';
  isPlacingLink: boolean;
  onViewChange: (state: ViewState) => void;
  onSceneChange: (sceneId: string) => void;
  onPlaceLink: (yaw: number, pitch: number) => void;
  registerNavigateWithArrival?: (fn: (sceneId: string, arrivalYaw: number, arrivalPitch: number) => void) => void;
  isPlacingInfoMarker: boolean;
  onPlaceInfoMarker: (yaw: number, pitch: number) => void;
  onSelectInfoMarker?: (markerId: string | null) => void;
}

export function StudioViewer({
  config,
  activeSceneId,
  mode,
  isPlacingLink,
  onViewChange,
  onSceneChange,
  onPlaceLink,
  registerNavigateWithArrival,
  isPlacingInfoMarker,
  onPlaceInfoMarker,
  onSelectInfoMarker,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const vtRef = useRef<any>(null);
  const isTransitioningRef = useRef(false);
  const pendingWalkInRef = useRef<{ settleZoom: number } | null>(null);
  const activeSceneRef = useRef(activeSceneId);
  const configRef = useRef(config);
  const onSceneChangeRef = useRef(onSceneChange);
  const onViewChangeRef = useRef(onViewChange);
  const isPlacingLinkRef = useRef(isPlacingLink);
  const onPlaceLinkRef = useRef(onPlaceLink);
  const isPlacingInfoMarkerRef = useRef(isPlacingInfoMarker);
  const onPlaceInfoMarkerRef = useRef(onPlaceInfoMarker);
  const onSelectInfoMarkerRef = useRef(onSelectInfoMarker);
  const ghostMarkerIdsRef = useRef<Set<string>>(new Set());
  const registerNavigateWithArrivalRef = useRef(registerNavigateWithArrival);

  useEffect(() => {
    registerNavigateWithArrivalRef.current = registerNavigateWithArrival;
  }, [registerNavigateWithArrival]);

  useEffect(() => {
    onSceneChangeRef.current = onSceneChange;
  }, [onSceneChange]);

  useEffect(() => {
    onViewChangeRef.current = onViewChange;
  }, [onViewChange]);

  useEffect(() => { isPlacingLinkRef.current = isPlacingLink; }, [isPlacingLink]);
  useEffect(() => { onPlaceLinkRef.current = onPlaceLink; }, [onPlaceLink]);
  useEffect(() => { isPlacingInfoMarkerRef.current = isPlacingInfoMarker; }, [isPlacingInfoMarker]);
  useEffect(() => { onPlaceInfoMarkerRef.current = onPlaceInfoMarker; }, [onPlaceInfoMarker]);
  useEffect(() => { onSelectInfoMarkerRef.current = onSelectInfoMarker; }, [onSelectInfoMarker]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    activeSceneRef.current = activeSceneId;
    vtRef.current?.setCurrentNode?.(activeSceneId);
  }, [activeSceneId]);

  useEffect(() => {
    if (!containerRef.current) return;

    let viewer: any;
    let destroyed = false;

    const finishTransition = () => {
      isTransitioningRef.current = false;
    };

    const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

    const ensureStudioArrowsVisible = () => {
      if (!containerRef.current) return;
      containerRef.current.querySelectorAll<HTMLElement>('.psv-virtual-tour-link').forEach((el) => {
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
      });
    };

    (async () => {
      const [{ Viewer }, { VirtualTourPlugin }, { MarkersPlugin }] = await Promise.all([
        import('@photo-sphere-viewer/core'),
        import('@photo-sphere-viewer/virtual-tour-plugin'),
        import('@photo-sphere-viewer/markers-plugin'),
      ]);

      await import('@photo-sphere-viewer/core/index.css');
      await import('@photo-sphere-viewer/virtual-tour-plugin/index.css');
      await import('@photo-sphere-viewer/markers-plugin/index.css');

      const { toPsvNodes } = await import('@/lib/psv-adapter');

      if (destroyed) return;

      const liveConfig = configRef.current;

      viewer = new Viewer({
        container: containerRef.current!,
        navbar: false,
        touchmoveTwoFingers: false,
        mousewheelCtrlKey: false,
        defaultYaw: 0,
        defaultPitch: 0,
        rendererParameters: { antialias: true, preserveDrawingBuffer: true },
        plugins: [
          [
            VirtualTourPlugin,
            {
              renderMode: '2d',
              preload: true,
              showLinkTooltip: false,
              arrowStyle: {
                element: (link: any) => {
                  const el = document.createElement('div');
                  el.classList.add('psv--capture-event');

                  el.addEventListener('click', () => {
                    if (isTransitioningRef.current) return;

                    const { effect, speedMs, zoomLevel, blendMs } = resolveLinkTransition(
                      configRef.current.meta.transition,
                      link.data?.transitionOverride,
                    );

                    isTransitioningRef.current = true;

                    if (isWalkEffect(effect)) {
                      const stage = stageRef.current;
                      const sourceEl = containerRef.current;
                      const targetScene = configRef.current.scenes.find((scene) => scene.id === link.nodeId);

                      if (!stage || !sourceEl || !targetScene) {
                        finishTransition();
                        return;
                      }

                      const originalZoom = viewerRef.current?.getZoomLevel() ?? 50;
                      const motion = getWalkMotion(effect, originalZoom, zoomLevel, speedMs);
                      const arrivalYaw = link.data?.arrivalYaw ?? targetScene.defaultYaw ?? 0;
                      const arrivalPitch = link.data?.arrivalPitch ?? targetScene.defaultPitch ?? 0;
                      const syntheticLink = {
                        position: link.position,
                        data: { ...link.data, _customEngine: true, _zoomTo: motion.arrivalStartZoom },
                      };

                      const destinationEl = document.createElement('div');
                      destinationEl.style.cssText = [
                        'position:absolute',
                        'inset:0',
                        'z-index:1',
                        'opacity:0',
                        'pointer-events:none',
                        'transition:opacity 0ms ease-in-out',
                      ].join(';');
                      stage.appendChild(destinationEl);

                      const previousSourceStyle = {
                        zIndex: sourceEl.style.zIndex,
                        opacity: sourceEl.style.opacity,
                        transition: sourceEl.style.transition,
                      };

                      let destinationViewer: any;

                      Promise.resolve()
                        .then(async () => {
                          sourceEl.style.zIndex = '2';
                          sourceEl.style.opacity = '1';

                          destinationViewer = new Viewer({
                            container: destinationEl,
                            panorama: targetScene.panorama,
                            navbar: false,
                            touchmoveTwoFingers: false,
                            mousewheelCtrlKey: false,
                            defaultYaw: `${arrivalYaw}deg`,
                            defaultPitch: `${arrivalPitch}deg`,
                            defaultZoomLvl: motion.arrivalStartZoom,
                            rendererParameters: { antialias: true, preserveDrawingBuffer: true },
                          });

                          await waitForViewerReadyFrame(destinationViewer);

                          const fadeMs = blendMs;
                          sourceEl.style.transition = `opacity ${fadeMs}ms ease-in-out`;
                          destinationEl.style.transition = `opacity ${fadeMs}ms ease-in-out`;
                          destinationEl.getBoundingClientRect();
                          destinationEl.style.opacity = '1';
                          sourceEl.style.opacity = '0';

                          const sourceMove = viewerRef.current?.animate({
                            yaw: link.position?.yaw ?? '0deg',
                            zoom: motion.sourceEndZoom,
                            speed: motion.sourceSpeed,
                          });
                          const destinationMove = destinationViewer.animate({
                            zoom: motion.settleZoom,
                            speed: motion.revealSpeed,
                          });

                          await Promise.all([
                            Promise.resolve(sourceMove),
                            Promise.resolve(destinationMove),
                            delay(fadeMs),
                          ]);

                          pendingWalkInRef.current = { settleZoom: motion.settleZoom };
                          await vtRef.current?.setCurrentNode(link.nodeId, {}, {
                            ...syntheticLink,
                            data: { ...syntheticLink.data, _zoomTo: motion.settleZoom },
                          });
                          pendingWalkInRef.current = null;

                          viewerRef.current?.rotate({
                            yaw: `${arrivalYaw}deg`,
                            pitch: `${arrivalPitch}deg`,
                            speed: false,
                          });
                          viewerRef.current?.zoom(motion.settleZoom);
                        })
                        .then(finishTransition)
                        .catch(finishTransition)
                        .finally(() => {
                          pendingWalkInRef.current = null;
                          sourceEl.style.zIndex = previousSourceStyle.zIndex;
                          sourceEl.style.opacity = previousSourceStyle.opacity;
                          sourceEl.style.transition = previousSourceStyle.transition;
                          destinationViewer?.destroy();
                          destinationEl.remove();
                        });
                    } else if (needsCustomEngine(effect)) {
                      const syntheticLink = { position: link.position, data: { ...link.data, _customEngine: true } };
                      playTransition({
                        effect,
                        speedMs,
                        zoomLevel,
                        container: containerRef.current!,
                        onMidpoint: () => vtRef.current?.setCurrentNode(link.nodeId, {}, syntheticLink),
                      }).then(finishTransition);
                    } else {
                      vtRef.current?.setCurrentNode(link.nodeId, {}, link);
                    }
                  });

                  if (link.data?.style === 'dot') {
                    const inner = document.createElement('div');
                    inner.className = mode === 'edit' ? 'site-tour-dot studio-tour-dot' : 'site-tour-dot';
                    el.appendChild(inner);
                  } else {
                    el.classList.add('site-tour-arrow');
                    if (mode === 'edit') el.classList.add('studio-tour-arrow');
                  }
                  return el;
                },
                size: { width: 44, height: 44 },
              },
              transitionOptions: (node: any, _fromNode: any, fromLink: any) => {
                const rotateTo = fromLink?.data?.arrivalYaw !== undefined
                  ? { yaw: `${fromLink.data.arrivalYaw}deg`, pitch: `${fromLink.data.arrivalPitch ?? 0}deg` }
                  : node.data?.defaultYaw != null
                  ? { yaw: `${node.data.defaultYaw}deg`, pitch: `${node.data.defaultPitch ?? 0}deg` }
                  : null;

                const { effect, speedMs } = resolveLinkTransition(
                  configRef.current.meta.transition,
                  fromLink?.data?.transitionOverride,
                );

                return getPsvTransitionOptions({
                  effect,
                  speedMs,
                  rotation: configRef.current.meta.transition.rotation,
                  rotateTo,
                  customEngine: Boolean(fromLink?.data?._customEngine),
                  zoomTo: fromLink?.data?._zoomTo,
                });
              },
            },
          ],
          MarkersPlugin,
        ],
      });

      const vt = viewer.getPlugin(VirtualTourPlugin);
      vtRef.current = vt;

      const markersPlugin = viewer.getPlugin(MarkersPlugin);
      markersPlugin?.addEventListener('select-marker', ({ marker }: any) => {
        if (mode !== 'edit') return;
        const infoMarker = marker.config?.data?.infoMarker;
        if (!infoMarker) return;
        onSelectInfoMarkerRef.current?.(infoMarker.id);
      });

      vt.setNodes(toPsvNodes(liveConfig), activeSceneRef.current);

      registerNavigateWithArrivalRef.current?.((sceneId, arrivalYaw, arrivalPitch) => {
        activeSceneRef.current = sceneId;
        vt.setCurrentNode(sceneId, {}, {
          position: { yaw: `${arrivalYaw}deg`, pitch: `${arrivalPitch}deg` },
          data: { arrivalYaw, arrivalPitch },
        });
      });

      vt.addEventListener('node-changed', ({ node, data }: any) => {
        const fromLink = data?.fromLink ?? null;
        onSceneChangeRef.current(node.id);
        ensureStudioArrowsVisible();
        const targetYaw = fromLink?.data?.arrivalYaw !== undefined
          ? fromLink.data.arrivalYaw
          : (node.data?.defaultYaw ?? 0);
        const targetPitch = fromLink?.data?.arrivalPitch !== undefined
          ? fromLink.data.arrivalPitch
          : (node.data?.defaultPitch ?? 0);

        if (pendingWalkInRef.current !== null) {
          ensureStudioArrowsVisible();
        } else if (!fromLink?.data?._customEngine) {
          requestAnimationFrame(() => {
            viewer.rotate({ yaw: `${targetYaw}deg`, pitch: `${targetPitch}deg` });
            finishTransition();
          });
        }
      });

      viewer.addEventListener('position-updated', ({ position }: any) => {
        ensureStudioArrowsVisible();
        onViewChangeRef.current({
          yaw: Math.round((position.yaw * 180) / Math.PI),
          pitch: Math.round((position.pitch * 180) / Math.PI),
          zoom: Math.round(viewer.getZoomLevel()),
        });
      });

      viewer.addEventListener('click', (e: any) => {
        if (e.data?.yaw == null) return;
        const yaw = Math.round((e.data.yaw * 180) / Math.PI);
        const pitch = Math.round((e.data.pitch * 180) / Math.PI);
        if (isPlacingInfoMarkerRef.current) {
          onPlaceInfoMarkerRef.current(yaw, pitch);
          return;
        }
        if (isPlacingLinkRef.current) {
          onPlaceLinkRef.current(yaw, pitch);
        }
      });

      queueMicrotask(ensureStudioArrowsVisible);

      viewerRef.current = viewer;
    })();

    return () => {
      destroyed = true;
      viewer?.destroy();
      viewerRef.current = null;
      vtRef.current = null;
    };
  }, [mode]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    let cancelled = false;

    const timer = setTimeout(async () => {
      const [{ VirtualTourPlugin }, { toPsvNodes }] = await Promise.all([
        import('@photo-sphere-viewer/virtual-tour-plugin'),
        import('@/lib/psv-adapter'),
      ]);

      if (cancelled) return;

      const vt = viewer.getPlugin(VirtualTourPlugin);
      vt?.setNodes?.(toPsvNodes(config), activeSceneRef.current);
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [config]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    let cancelled = false;

    const timer = setTimeout(async () => {
      const [{ MarkersPlugin }, { getIncomingLinks }] = await Promise.all([
        import('@photo-sphere-viewer/markers-plugin'),
        import('@/lib/studio/incoming-links'),
      ]);

      if (cancelled) return;

      const markersPlugin = viewer.getPlugin(MarkersPlugin);
      if (!markersPlugin) return;

      const incoming = getIncomingLinks(configRef.current, activeSceneRef.current);

      const ghostMarkers = incoming.map(({ scene, link }) => ({
        id: `arrival-ghost-${scene.id}`,
        position: { yaw: `${link.arrivalYaw}deg`, pitch: '0deg' },
        html: `<div class="arrival-ghost" data-from="${scene.label}"></div>`,
        anchor: 'center center',
        tooltip: false,
      }));

      const newIds = new Set(ghostMarkers.map((m) => m.id));

      for (const oldId of ghostMarkerIdsRef.current) {
        if (!newIds.has(oldId)) {
          try { markersPlugin.removeMarker(oldId); } catch { /* already gone */ }
        }
      }

      for (const marker of ghostMarkers) {
        if (ghostMarkerIdsRef.current.has(marker.id)) {
          try { markersPlugin.updateMarker(marker); } catch { /* skip */ }
        } else {
          try { markersPlugin.addMarker(marker); } catch { /* skip */ }
        }
      }

      ghostMarkerIdsRef.current = newIds;
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [config, activeSceneId]);

  return (
    <div ref={stageRef} className="absolute inset-0">
      <div
        ref={containerRef}
        className={`studio-viewer${isPlacingLink || isPlacingInfoMarker ? ' cursor-crosshair' : ''} absolute inset-0`}
      />
    </div>
  );
}
