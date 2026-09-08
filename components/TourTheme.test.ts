import { buildTourCssVars } from './TourTheme';
import type { TourConfig } from '@/lib/types';

const baseMeta: TourConfig['meta'] = {
  title: 'Test',
  site: 'test',
  startScene: 'a',
  floorPlan: false,
  transition: {
    effect: 'crossfade',
    speedMs: 900,
    rotation: true,
    zoomToHotspot: true,
    zoomLevel: 55,
    blendMs: 360,
    lockInput: true,
  },
  nadir: { enabled: false, size: 360, opacity: 0.9 },
};

describe('buildTourCssVars', () => {
  it('uses fallback accent when neither themeColor nor theme is set', () => {
    const vars = buildTourCssVars(baseMeta);
    expect(vars['--tour-accent']).toBe('#7c83fd');
  });

  it('uses themeColor as accent when theme is absent', () => {
    const vars = buildTourCssVars({ ...baseMeta, themeColor: '#ff5500' });
    expect(vars['--tour-accent']).toBe('#ff5500');
  });

  it('theme.accentColor takes precedence over themeColor', () => {
    const vars = buildTourCssVars({
      ...baseMeta,
      themeColor: '#ff5500',
      theme: { accentColor: '#00bfff', overlayOpacity: 0.88, uiDensity: 'default', logoPosition: 'bottom-left' },
    });
    expect(vars['--tour-accent']).toBe('#00bfff');
  });

  it('defaults overlay opacity to 0.88 when theme is absent', () => {
    const vars = buildTourCssVars(baseMeta);
    expect(vars['--tour-overlay-opacity']).toBe('0.88');
  });

  it('respects custom overlayOpacity', () => {
    const vars = buildTourCssVars({
      ...baseMeta,
      theme: { overlayOpacity: 0.6, uiDensity: 'default', logoPosition: 'bottom-left' },
    });
    expect(vars['--tour-overlay-opacity']).toBe('0.6');
  });

  it('defaults uiDensity to default when theme is absent', () => {
    const vars = buildTourCssVars(baseMeta);
    expect(vars['--tour-ui-density']).toBe('default');
  });

  it('respects compact uiDensity', () => {
    const vars = buildTourCssVars({
      ...baseMeta,
      theme: { overlayOpacity: 0.88, uiDensity: 'compact', logoPosition: 'bottom-left' },
    });
    expect(vars['--tour-ui-density']).toBe('compact');
  });

  it('defaults logoPosition to bottom-left when theme is absent', () => {
    const vars = buildTourCssVars(baseMeta);
    expect(vars['--tour-logo-position']).toBe('bottom-left');
  });

  it('respects top-center logoPosition', () => {
    const vars = buildTourCssVars({
      ...baseMeta,
      theme: { overlayOpacity: 0.88, uiDensity: 'default', logoPosition: 'top-center' },
    });
    expect(vars['--tour-logo-position']).toBe('top-center');
  });
});
