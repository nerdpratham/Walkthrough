'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { InfoMarker, TourConfig } from '@/lib/types';
import { needsCustomEngine, playTransition } from '@/lib/transition-engine';
import {
  getPsvTransitionOptions,
  getWalkMotion,
  isWalkEffect,
  resolveLinkTransition,
  waitForViewerReadyFrame,
} from '@/lib/viewer-transition';

interface TourViewerProps {
  config: TourConfig;
  initialSceneId: string;
  onSceneChange: (sceneId: string, zone: string) => void;
  onTransitionStart: () => void;
  onTransitionEnd: () => void;
  onBackReady: (canGoBack: boolean) => void;
  registerGoBack: (fn: () => void) => void;
  registerSelectScene: (fn: (sceneId: string) => void) => void;
  isStarted: boolean;
  onHoverInfoMarker: (state: { marker: InfoMarker; x: number; y: number } | null) => void;
  onOpenInfoMarker: (state: { marker: InfoMarker; x: number; y: number }) => void;
}

export function TourViewer({
  config,
  initialSceneId,
  onSceneChange,
  onTransitionStart,
  onTransitionEnd,
  onBackReady,
  registerGoBack,
  registerSelectScene,
  isStarted,
  onHoverInfoMarker,
  onOpenInfoMarker,
}: TourViewerProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const vtRef = useRef<any>(null);
  const historyRef = useRef<string[]>([]);
  const isTransitioningRef = useRef(false);
  const pendingWalkInRef = useRef<{ settleZoom: number } | null>(null);
  const initialSceneIdRef = useRef(initialSceneId);
  const onHoverInfoMarkerRef = useRef(onHoverInfoMarker);
  const onOpenInfoMarkerRef = useRef(onOpenInfoMarker);

  const goBack = useCallback(() => {
    if (historyRef.current.length < 2 || !vtRef.current) return;
    historyRef.current.pop();
    const prevId = historyRef.current[historyRef.current.length - 1];
    vtRef.current.setCurrentNode(prevId);
  }, []);

  useEffect(() => { onHoverInfoMarkerRef.current = onHoverInfoMarker; }, [onHoverInfoMarker]);
  useEffect(() => { onOpenInfoMarkerRef.current = onOpenInfoMarker; }, [onOpenInfoMarker]);

  useEffect(() => {
    registerGoBack(goBack);
  }, [registerGoBack, goBack]);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    let viewer: any;
    let destroyed = false;
    let mouseMoveTarget: HTMLElement | null = null;
    let mouseMoveHandler: ((e: MouseEvent) => void) | null = null;

    (async () => {
      const [
        { Viewer },
        { VirtualTourPlugin },
        { MarkersPlugin },
      ] = await Promise.all([
        import('@photo-sphere-viewer/core'),
        import('@photo-sphere-viewer/virtual-tour-plugin'),
        import('@photo-sphere-viewer/markers-plugin'),
      ]);

      await import('@photo-sphere-viewer/core/index.css');
      await import('@photo-sphere-viewer/virtual-tour-plugin/index.css');
      await import('@photo-sphere-viewer/markers-plugin/index.css');

      const { toPsvNodes } = await import('@/lib/psv-adapter');

      if (destroyed) return;
      const nodes = toPsvNodes(config);

      const finishTransition = () => {
        isTransitioningRef.current = false;
        if (config.meta.transition.lockInput) onTransitionEnd();
      };

      const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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
              arrowStyle: {
                element: (link: any) => {
                  const el = document.createElement('div');
                  el.dataset.yaw = String(parseFloat(String(link.position?.yaw ?? '0')));
                  el.classList.add('psv--capture-event');

                  el.addEventListener('click', () => {
                    if (isTransitioningRef.current) return;

                    const { effect, speedMs, zoomLevel, blendMs } = resolveLinkTransition(
                      config.meta.transition,
                      link.data?.transitionOverride,
                    );

                    isTransitioningRef.current = true;
                    if (config.meta.transition.lockInput) onTransitionStart();

                    if (isWalkEffect(effect)) {
                      const stage = stageRef.current;
                      const sourceEl = containerRef.current;
                      const targetScene = config.scenes.find((scene) => scene.id === link.nodeId);

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
                        .then(() => {
                          syncArrowVisibility((arrivalYaw * Math.PI) / 180);
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
                      const syntheticLink = {
                        position: link.position,
                        data: { ...link.data, _customEngine: true },
                      };

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
                    inner.className = 'site-tour-dot';
                    el.appendChild(inner);
                  } else {
                    el.classList.add('site-tour-arrow');
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
                  config.meta.transition,
                  fromLink?.data?.transitionOverride,
                );

                return getPsvTransitionOptions({
                  effect,
                  speedMs,
                  rotation: config.meta.transition.rotation,
                  rotateTo,
                  customEngine: Boolean(fromLink?.data?._customEngine),
                  zoomTo: fromLink?.data?._zoomTo,
                });
              },
              preload: true,
              showLinkTooltip: false,
            },
          ],
          MarkersPlugin,
        ],
      });

      const vt = viewer.getPlugin(VirtualTourPlugin);
      vtRef.current = vt;
      vt.setNodes(nodes, initialSceneIdRef.current);

      const markersPlugin = viewer.getPlugin(MarkersPlugin);
      let lastMouse = { x: 0, y: 0 };

      const onMouseMove = (e: MouseEvent) => { lastMouse = { x: e.clientX, y: e.clientY }; };
      containerRef.current!.addEventListener('mousemove', onMouseMove);
      mouseMoveTarget = containerRef.current!;
      mouseMoveHandler = onMouseMove;

      markersPlugin.addEventListener('enter-marker', ({ marker }: any) => {
        const infoMarker = marker.config?.data?.infoMarker as InfoMarker | undefined;
        if (!infoMarker) return;
        onHoverInfoMarkerRef.current({ marker: infoMarker, ...lastMouse });
      });

      markersPlugin.addEventListener('leave-marker', ({ marker }: any) => {
        const infoMarker = marker.config?.data?.infoMarker;
        if (!infoMarker) return;
        onHoverInfoMarkerRef.current(null);
      });

      markersPlugin.addEventListener('select-marker', ({ marker }: any) => {
        const infoMarker = marker.config?.data?.infoMarker as InfoMarker | undefined;
        if (!infoMarker) return;
        onOpenInfoMarkerRef.current({ marker: infoMarker, ...lastMouse });
      });

      registerSelectScene((sceneId: string) => {
        vt.setCurrentNode(sceneId);
      });

      const SHOW = (65 * Math.PI) / 180;
      const HIDE = (85 * Math.PI) / 180;
      const syncArrowVisibility = (yaw: number) => {
        if (!containerRef.current) return;
        containerRef.current.querySelectorAll<HTMLElement>('.psv-virtual-tour-link').forEach((el) => {
          const arrowYaw = (parseFloat(el.dataset.yaw ?? '0') * Math.PI) / 180;
          let delta = Math.abs(arrowYaw - yaw);
          if (delta > Math.PI) delta = 2 * Math.PI - delta;
          if (delta <= SHOW) {
            el.style.opacity = '1';
            el.style.pointerEvents = 'auto';
          } else if (delta >= HIDE) {
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
          } else {
            el.style.opacity = String(1 - (delta - SHOW) / (HIDE - SHOW));
            el.style.pointerEvents = 'none';
          }
        });
      };

      viewer.addEventListener('position-updated', ({ position }: any) => {
        syncArrowVisibility(position.yaw);
      });

      vt.addEventListener('node-changed', ({ node, data }: any) => {
        const fromLink = data?.fromLink ?? null;
        const arrivalYawDeg = fromLink?.data?.arrivalYaw !== undefined
          ? fromLink.data.arrivalYaw
          : (node.data?.defaultYaw ?? 0);
        const arrivalPitchDeg = fromLink?.data?.arrivalPitch !== undefined
          ? fromLink.data.arrivalPitch
          : (node.data?.defaultPitch ?? 0);

        const last = historyRef.current[historyRef.current.length - 1];
        if (last !== node.id) historyRef.current.push(node.id);
        onSceneChange(node.id, node.data?.zone ?? '');
        onBackReady(historyRef.current.length > 1);

        if (pendingWalkInRef.current !== null) {
          syncArrowVisibility((arrivalYawDeg * Math.PI) / 180);
        } else if (!fromLink?.data?._customEngine) {
          viewer.rotate({ yaw: `${arrivalYawDeg}deg`, pitch: `${arrivalPitchDeg}deg`, speed: false });
          syncArrowVisibility((arrivalYawDeg * Math.PI) / 180);
          finishTransition();
        }
      });

      viewerRef.current = viewer;
    })();

    return () => {
      destroyed = true;
      if (mouseMoveTarget && mouseMoveHandler) {
        mouseMoveTarget.removeEventListener('mousemove', mouseMoveHandler);
      }
      viewer?.destroy();
      viewerRef.current = null;
      vtRef.current = null;
    };
  }, [config, onSceneChange, onTransitionStart, onTransitionEnd, onBackReady, registerSelectScene]);

  return (
    <div
      ref={stageRef}
      className={`absolute inset-0 ${isStarted ? '' : 'tour-viewer-prestart'}`}
    >
      <div
        ref={containerRef}
        className="absolute inset-0"
      />
    </div>
  );
}
