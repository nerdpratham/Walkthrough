import fs from 'fs/promises';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { loadTourConfig, toursDir } from '@/lib/tour-config';
import { TourShell } from '@/components/TourShell';
import { TourTheme } from '@/components/TourTheme';

export async function generateStaticParams() {
  const only = process.env.VIEWER_SLUG;
  let slugs: string[] = [];
  try {
    const entries = await fs.readdir(toursDir(), { withFileTypes: true });
    slugs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    slugs = [];
  }
  if (only) slugs = slugs.filter((s) => s === only);
  return slugs.map((slug) => ({ slug }));
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  try {
    const { slug } = await params;
    const config = await loadTourConfig(slug);
    return { title: config.meta.title };
  } catch {
    return { title: 'Tour' };
  }
}

export default async function TourPage({ params }: Props) {
  const { slug } = await params;
  const config = await loadTourConfig(slug).catch(() => null);
  if (!config) notFound();

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      <TourTheme config={config} />
      <Suspense fallback={null}>
        <TourShell config={config} />
      </Suspense>
    </main>
  );
}
