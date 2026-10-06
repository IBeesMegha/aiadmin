/**
 * Public API: Enquiry Submission
 * POST /api/public/enquiry - Submit a new enquiry
 * 
 * This endpoint requires an API token with permission for this endpoint
 * Admin APIs do NOT accept API tokens - they use JWT authentication
 * 
 * Usage:
 * curl -X POST \
 *      -H "Authorization: Bearer YOUR_TOKEN" \
 *      -H "Content-Type: application/json" \
 *      -d '{"name":"John","email":"john@test.com","message":"Hello"}' \
 *      https://your-domain.com/api/public/enquiry
 */

import type { NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { withApiToken, ApiTokenRequest } from '@/lib/api-tokens/middleware';

interface EnquiryData {
  name: string;
  email: string;
  phone?: string;
  message: string;
  subject?: string;
}

async function handler(
  req: ApiTokenRequest,
  res: NextApiResponse
) {
  try {
    // Validate request body
    const { name, email, message, phone, subject }: EnquiryData = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, email, message',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }

    // Get enquiry collection type
    const enquiryCollection = await prisma.collectionType.findUnique({
      where: { name: 'enquiry' },
    });

    if (!enquiryCollection) {
      return res.status(404).json({
        success: false,
        error: 'Enquiry collection not found. Please create an "enquiry" collection type first.',
      });
    }

    // Prepare enquiry data
    const enquiryData = {
      name,
      email,
      message,
      ...(phone && { phone }),
      ...(subject && { subject }),
      submittedAt: new Date().toISOString(),
      status: 'pending',
    };

    // Create enquiry entry
    await prisma.$executeRaw`
      INSERT INTO collection_entries (
        id,
        collection_type_id,
        data,
        lang,
        locale_status,
        translation_group_id,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid()::text,
        ${enquiryCollection.id},
        ${JSON.stringify(enquiryData)}::jsonb,
        'en',
        'published',
        gen_random_uuid()::text,
        NOW(),
        NOW()
      )
    `;

    return res.status(201).json({
      success: true,
      message: 'Enquiry submitted successfully',
      data: {
        name,
        email,
        submittedAt: enquiryData.submittedAt,
      },
    });
  } catch (error: any) {
    console.error('Error creating enquiry:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

// Export with API token authentication wrapper
export default withApiToken(handler);
