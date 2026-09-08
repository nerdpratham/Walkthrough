import { listTours } from '@/lib/studio/tours';

export async function GET() {
  const tours = await listTours();
  return Response.json(tours);
}
