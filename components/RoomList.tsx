'use client';

import { useState, useRef, useEffect } from 'react';
import type { TourConfig } from '@/lib/types';

interface RoomListProps {
  config: TourConfig;
  currentSceneId: string;
  onSelectScene: (sceneId: string) => void;
}

export function RoomList({ config, currentSceneId, onSelectScene }: RoomListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, [isOpen, currentSceneId]);

  const grouped = config.zones.map((zone) => ({
    zone,
    scenes: config.scenes.filter((s) => s.zone === zone.id),
  })).filter((g) => g.scenes.length > 0);

  return (
    <div className="absolute left-4 top-4 z-40">
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg bg-black/60 px-3 py-2
          text-xs font-medium text-white/80 backdrop-blur-sm ring-1 ring-white/10
          transition hover:bg-black/80 hover:text-white"
      >
        <span>Rooms</span>
        <svg
          className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="relative mt-2 w-52">
          {/* fade hint at bottom */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 rounded-b-xl
            bg-gradient-to-t from-black/70 to-transparent z-10" />
          <div className="rounded-xl bg-black/70 p-3 backdrop-blur-md ring-1 ring-white/10
            shadow-2xl max-h-[calc(100vh-6rem)] overflow-y-auto
            [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {grouped.map(({ zone, scenes }) => (
            <div key={zone.id} className="mb-3 last:mb-0">
              <p className="mb-1 px-1 text-[10px] font-semibold uppercase
                tracking-widest text-white/30">
                {zone.label}
              </p>
              {scenes.map((scene) => (
                <button
                  key={scene.id}
                  ref={currentSceneId === scene.id ? activeRef : null}
                  onClick={() => { onSelectScene(scene.id); setIsOpen(false); }}
                  className={`w-full rounded-lg px-3 py-1.5 text-left text-xs
                    transition hover:bg-white/10
                    ${currentSceneId === scene.id
                      ? 'bg-white/15 text-white font-medium'
                      : 'text-white/60 hover:text-white'
                    }`}
                >
                  {scene.label}
                </button>
              ))}
            </div>
          ))}
          </div>
        </div>
      )}
    </div>
  );
}
