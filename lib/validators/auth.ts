/**
 * Authentication Validation Schemas
 * Uses Zod for request validation
 */

import { z } from 'zod';

/**
 * Login validation schema
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .toLowerCase(),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * User creation validation schema
 */
export const createUserSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
  name: z.string().min(1, 'Name is required').min(2, 'Name must be at least 2 characters'),
  role: z.enum(['admin', 'super_admin']).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
