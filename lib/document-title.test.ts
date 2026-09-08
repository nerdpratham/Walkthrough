import type { InfoMarker, Scene } from '@/lib/types';
import { resolveDocumentTitle } from './document-title';

const scene = { id: 'reception', label: 'Reception' } as Scene;

function marker(patch: Partial<InfoMarker>): InfoMarker {
  return { id: 'mk1', yaw: 0, pitch: 0, enabled: true, imageDisplay: 'lightbox' as const, showLabel: false, ...patch };
}

describe('resolveDocumentTitle', () => {
  it('uses marker tabTitle before marker title', () => {
    expect(resolveDocumentTitle({
      tourTitle: 'Office HQ Tour',
      activeScene: scene,
      openMarker: marker({ title: 'Reception Desk', tabTitle: 'Visitor Check-in' }),
    })).toBe('Visitor Check-in - Office HQ Tour');
  });

  it('falls back to marker title when marker has no tabTitle', () => {
    expect(resolveDocumentTitle({
      tourTitle: 'Office HQ Tour',
      activeScene: scene,
      openMarker: marker({ title: 'Reception Desk' }),
    })).toBe('Reception Desk - Office HQ Tour');
  });

  it('falls back to active scene label when marker has no title', () => {
    expect(resolveDocumentTitle({
      tourTitle: 'Office HQ Tour',
      activeScene: scene,
      openMarker: marker({}),
    })).toBe('Reception - Office HQ Tour');
  });

  it('uses active scene label when no marker is open', () => {
    expect(resolveDocumentTitle({
      tourTitle: 'Office HQ Tour',
      activeScene: scene,
      openMarker: null,
    })).toBe('Reception - Office HQ Tour');
  });

  it('uses tour title when neither marker nor scene title is available', () => {
    expect(resolveDocumentTitle({
      tourTitle: 'Office HQ Tour',
      activeScene: null,
      openMarker: null,
    })).toBe('Office HQ Tour');
  });
});
