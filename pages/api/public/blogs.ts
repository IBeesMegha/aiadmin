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
import { withApiToken, ApiTokenRequest } from '@/lib/api-tokens/middleware';

async function handler(
  req: ApiTokenRequest,
  res: NextApiResponse
) {
  try {
    // Get blog collection type
    const blogCollection = await prisma.collectionType.findUnique({
      where: { name: 'blog' },
    });

    if (!blogCollection) {
      return res.status(404).json({
        success: false,
        error: 'Blog collection not found',
      });
    }

    // Fetch all blog entries
    const blogs = await prisma.$queryRaw`
      SELECT id, data, created_at, updated_at
      FROM collection_entries
      WHERE collection_type_id = ${blogCollection.id}
      ORDER BY created_at DESC
    `;

    return res.status(200).json({
      success: true,
      data: blogs,
      count: Array.isArray(blogs) ? blogs.length : 0,
    });
  } catch (error: any) {
    console.error('Error fetching blogs:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

// Export with API token authentication wrapper
export default withApiToken(handler);
