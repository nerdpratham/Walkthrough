'use client';

import { useState } from 'react';
import type { TourConfig } from '@/lib/types';

interface StartScreenProps {
  config: TourConfig;
  onStart: () => void;
}

export function StartScreen({ config, onStart }: StartScreenProps) {
  // Guard against a double-trigger; the parent plays the enter transition.
  const [started, setStarted] = useState(false);

  const handleStart = () => {
    if (started) return;
    setStarted(true);
    onStart();
  };

  const { site, description, logo, exploreUrl } = config.meta;
  const exploreLabel = config.meta.exploreLabel ?? 'Explore';
  const year = new Date().getFullYear();

  return (
    <div className="start-screen-bg absolute inset-0 z-50 flex flex-col items-center justify-center">
      <div className="relative z-10 flex flex-col items-center px-8 text-center">
        {logo ? (
          <img
            src={logo}
            alt={site}
            className="start-screen-logo"
            style={{ objectFit: 'contain' }}
          />
        ) : (
          <p className="start-screen-wordmark">{site}</p>
        )}

        {description && <p className="start-screen-lede">{description}</p>}

        <div className="start-screen-actions">
          <button type="button" onClick={handleStart} className="sx-btn sx-btn-primary">
            <span className="sx-btn-label">Begin Tour</span>
            <span className="sx-btn-arrow" aria-hidden="true">→</span>
          </button>

          {exploreUrl && (
            <a
              href={exploreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="sx-btn sx-btn-secondary"
            >
              <span className="sx-btn-label">{exploreLabel}</span>
              <span className="sx-btn-arrow" aria-hidden="true">→</span>
            </a>
          )}
        </div>
      </div>

      <p className="start-screen-footer relative z-10">© {year} {site}. All rights reserved.</p>
    </div>
  );
}
