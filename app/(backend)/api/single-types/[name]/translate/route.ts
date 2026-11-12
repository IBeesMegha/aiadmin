export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { adaptHandler } from '@/lib/app-router/route-adapter';
import handler from './handler';

const route = adaptHandler(handler as any);

export const POST = route;
export const OPTIONS = route;
export const HEAD = route;
