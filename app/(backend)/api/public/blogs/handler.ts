export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
/**
 * Public API: Blog Posts
 * GET /api/public/blogs - List all blog posts
 * 
 * This endpoint requires an API token with permission for this endpoint
 * Admin APIs do NOT accept API tokens - they use JWT authentication
 * 
 * Usage:
 * curl -H "Authorization: Bearer YOUR_TOKEN" \
 *      https://your-domain.com/api/public/blogs
 */

import type { NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
import { findManyDynamic } from '@/lib/dynamic-prisma';
import { resolveRequestLocale } from '@/lib/content-i18n';

import { withApiToken, ApiTokenRequest } from '@/lib/api-tokens/middleware';


async function handler(
  req: ApiTokenRequest,
  res: NextApiResponse
) {
  try {
    const blogCollection = await prisma.collectionType.findUnique({
      where: { name: 'blog' },
    });

    if (!blogCollection) {
      return res.status(404).json({
        success: false,
        error: 'Blog collection not found',
      });
    }

    const locale = await resolveRequestLocale(req.query);

    // Fetch all blog entries for the requested locale from the dynamic
    // content table, which carries the i18n `locale` / `rootId` columns.
    const blogs = await findManyDynamic('blog', { where: { locale } });

    return res.status(200).json({
      success: true,
      data: blogs,
      count: Array.isArray(blogs) ? blogs.length : 0,
    });
  } catch (error: any) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    console.error('Error fetching blogs:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

// Export with API token authentication wrapper
export default withApiToken(handler);
