/**
 * Dashboard Statistics API
 * GET /api/dashboard/stats - Get comprehensive dashboard statistics
 */

import type { NextApiResponse } from 'next';
import { requirePermission, type AuthenticatedRequest } from '@/lib/guards/permission-guard';
import { prisma } from '@/lib/prisma';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    // Fetch all statistics in parallel with error handling
    const results = await Promise.allSettled([
      // Core counts
      prisma.collectionType.count(),
      prisma.singleType.count(),
      prisma.component.count(),
      prisma.user.count(),
      prisma.role.count(),
      prisma.media.count(),

      // Recent users (last 7 days)
      prisma.user.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          role: {
            select: {
              name: true,
            },
          },
        },
      }),

      // Recent media uploads
      prisma.media.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          name: true,
          url: true,
          mime: true,
          size: true,
          createdAt: true,
        },
      }),

      // Collection types with entry counts
      prisma.collectionType.findMany({
        select: {
          id: true,
          name: true,
          displayName: true,
        },
      }),

      // Users grouped by role
      prisma.user.groupBy({
        by: ['roleId'],
        _count: {
          id: true,
        },
      }),

      // Media grouped by mime type
      prisma.media.groupBy({
        by: ['mime'],
        _count: {
          id: true,
        },
      }),

      // Recent activity (sessions)
      prisma.session.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);
    
    // Extract values with fallbacks
    const collectionsCount = results[0].status === 'fulfilled' ? results[0].value : 0;
    const singlesCount = results[1].status === 'fulfilled' ? results[1].value : 0;
    const componentsCount = results[2].status === 'fulfilled' ? results[2].value : 0;
    const usersCount = results[3].status === 'fulfilled' ? results[3].value : 0;
    const rolesCount = results[4].status === 'fulfilled' ? results[4].value : 0;
    const mediaCount = results[5].status === 'fulfilled' ? results[5].value : 0;
    const recentUsers = results[6].status === 'fulfilled' ? results[6].value : [];
    const recentMedia = results[7].status === 'fulfilled' ? results[7].value : [];
    const collectionTypes = results[8].status === 'fulfilled' ? results[8].value : [];
    const usersByRole = results[9].status === 'fulfilled' ? results[9].value : [];
    const mediaByType = results[10].status === 'fulfilled' ? results[10].value : [];
    const recentActivity = results[11].status === 'fulfilled' ? results[11].value : [];

    // Get entry counts for each collection type
    const collectionTypesWithCounts = await Promise.all(
      collectionTypes.map(async (ct) => {
        try {
          const count = await prisma.$queryRawUnsafe<any[]>(
            `SELECT COUNT(*) as count FROM "${ct.name}"`
          );
          return {
            ...ct,
            entryCount: parseInt(count[0]?.count || '0'),
          };
        } catch (error) {
          // Table might not exist yet
          return {
            ...ct,
            entryCount: 0,
          };
        }
      })
    );

    // Get role names for user distribution
    const roleIds = usersByRole.map((r) => r.roleId).filter(Boolean);
    const roles = await prisma.role.findMany({
      where: {
        id: {
          in: roleIds as string[],
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const roleMap = new Map(roles.map((r) => [r.id, r.name]));
    const userDistribution = usersByRole.map((r) => ({
      role: r.roleId ? roleMap.get(r.roleId) || 'Unknown' : 'No Role',
      count: r._count.id,
    }));

    // Process media by type
    const mediaDistribution = mediaByType.map((m) => {
      const type = m.mime.split('/')[0];
      return {
        type: type.charAt(0).toUpperCase() + type.slice(1),
        count: m._count.id,
      };
    });

    // Aggregate media distribution by main type
    const aggregatedMedia = mediaDistribution.reduce((acc, curr) => {
      const existing = acc.find((item) => item.type === curr.type);
      if (existing) {
        existing.count += curr.count;
      } else {
        acc.push({ ...curr });
      }
      return acc;
    }, [] as { type: string; count: number }[]);

    // Calculate growth metrics (last 30 days vs previous 30 days)
    let usersGrowth = 0;
    let mediaGrowth = 0;
    
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

      const [usersLast30, usersPrevious30, mediaLast30, mediaPrevious30] = await Promise.all([
        prisma.user.count({
          where: { createdAt: { gte: thirtyDaysAgo } },
        }),
        prisma.user.count({
          where: {
            createdAt: {
              gte: sixtyDaysAgo,
              lt: thirtyDaysAgo,
            },
          },
        }),
        prisma.media.count({
          where: { createdAt: { gte: thirtyDaysAgo } },
        }),
        prisma.media.count({
          where: {
            createdAt: {
              gte: sixtyDaysAgo,
              lt: thirtyDaysAgo,
            },
          },
        }),
      ]);

      const calculateGrowth = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };
      
      usersGrowth = calculateGrowth(usersLast30, usersPrevious30);
      mediaGrowth = calculateGrowth(mediaLast30, mediaPrevious30);
    } catch (error) {
      console.error('Error calculating growth metrics:', error);
    }

    // Get daily activity for the last 14 days
    let activityChart = [];
    
    try {
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const dailyActivity = await prisma.session.findMany({
        where: {
          createdAt: {
            gte: fourteenDaysAgo,
          },
        },
        select: {
          createdAt: true,
        },
      });

      // Group by day
      const activityByDay = dailyActivity.reduce((acc, session) => {
        const date = session.createdAt.toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Fill in missing days with 0
      for (let i = 13; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        activityChart.push({
          date: dateStr,
          activity: activityByDay[dateStr] || 0,
        });
      }
    } catch (error) {
      console.error('Error calculating activity chart:', error);
      // Provide empty chart data
      for (let i = 13; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        activityChart.push({
          date: dateStr,
          activity: 0,
        });
      }
    }

    // Calculate total storage used
    let storageUsedMB = 0;
    
    try {
      const totalStorage = await prisma.media.aggregate({
        _sum: {
          size: true,
        },
      });

      const storageUsed = totalStorage._sum.size || 0;
      storageUsedMB = parseFloat((storageUsed / (1024 * 1024)).toFixed(2));
    } catch (error) {
      console.error('Error calculating storage:', error);
    }

    return res.status(200).json({
      success: true,
      data: {
        overview: {
          collections: collectionsCount,
          singles: singlesCount,
          components: componentsCount,
          users: usersCount,
          roles: rolesCount,
          media: mediaCount,
          storageUsedMB: storageUsedMB,
        },
        growth: {
          users: usersGrowth,
          media: mediaGrowth,
        },
        collectionTypes: collectionTypesWithCounts,
        userDistribution,
        mediaDistribution: aggregatedMedia,
        recentUsers,
        recentMedia,
        recentActivity,
        activityChart,
      },
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics',
    });
  }
}

export default async function (req: any, res: NextApiResponse) {
  // Dashboard is always accessible - no permission check required
  return handler(req, res);
}
