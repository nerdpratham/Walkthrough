'use client';

interface CurrentZoneLabelProps {
  label: string;
}

export function CurrentZoneLabel({ label }: CurrentZoneLabelProps) {
  if (!label) return null;
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40">
      <span className="rounded-full bg-black/55 px-4 py-1.5 text-xs font-medium
        text-white/80 backdrop-blur-sm ring-1 ring-white/10">
        {label}
      </span>
    </div>
  );
}
