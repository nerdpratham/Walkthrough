import type { TourConfig } from '@/lib/types';

export function buildTourCssVars(meta: TourConfig['meta']): Record<string, string> {
  return {
    '--tour-accent':          meta.theme?.accentColor ?? meta.themeColor ?? '#7c83fd',
    '--tour-overlay-opacity': String(meta.theme?.overlayOpacity ?? 0.88),
    '--tour-ui-density':      meta.theme?.uiDensity ?? 'default',
    '--tour-logo-position':   meta.theme?.logoPosition ?? 'bottom-left',
  };
}

export function TourTheme({ config }: { config: TourConfig }) {
  const vars = buildTourCssVars(config.meta);
  const css = `:root { ${Object.entries(vars)
    .filter(([, v]) => !/[{};]/.test(v))
    .map(([k, v]) => `${k}: ${v};`)
    .join(' ')} }`;
  return <style>{css}</style>;
}
