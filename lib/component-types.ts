/**
 * Component System Types
 * 
 * Architecture:
 * - Component: Schema definition (like a class)
 * - ComponentEntry: Actual data instance (like an object)
 * - Collections/Pages: Store references to ComponentEntry IDs
 * - API: Automatically populates component data when fetching
 */

import { Field } from './types';

// ============================================
// Component Definition Types
// ============================================

export interface ComponentDefinition {
  id: string;
  name: string;
  displayName: string;
  category: string;
  fields: {
    fields: Field[];
  };
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Component Entry Types
// ============================================

export interface ComponentEntry {
  id: string;
  componentId: string;
  component?: ComponentDefinition; // Populated component schema
  data: Record<string, any>; // Actual field values
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Component Reference Types
// ============================================

/**
 * How components are stored in collection/page fields
 */
export type ComponentReference = 
  | string // Simple ID reference: "clx123abc"
  | ComponentReferenceObject; // Detailed reference

export interface ComponentReferenceObject {
  id: string; // ComponentEntry ID
  component: string; // Component name (e.g., "banner", "seo")
}

/**
 * For repeatable components (arrays)
 */
export type RepeatableComponentReference = ComponentReference[];

// ============================================
// Populated Component Types (API Response)
// ============================================

/**
 * Fully populated component data returned by API
 */
export interface PopulatedComponent {
  id: string; // ComponentEntry ID
  component: string; // Component name
  [key: string]: any; // Field values from component data
}

/**
 * For repeatable components in API response
 */
export type PopulatedRepeatableComponent = PopulatedComponent[];

// ============================================
// Component Field Configuration
// ============================================

export interface ComponentFieldConfig {
  name: string;
  componentRef: string; // Component name to reference
  repeatable: boolean; // Single or array
  required?: boolean;
}

// ============================================
// Storage Format Examples
// ============================================

/**
 * Example: How data is stored in database
 * 
 * Page/Collection Entry:
 * {
 *   "title": "Home Page",
 *   "banner": "clx123abc",  // Single component reference
 *   "sections": ["clx456def", "clx789ghi"],  // Repeatable components
 *   "seo": { "id": "clx999jkl", "component": "seo" }  // Detailed reference
 * }
 * 
 * ComponentEntry (banner):
 * {
 *   "id": "clx123abc",
 *   "componentId": "clx_banner_def",
 *   "data": {
 *     "title": "Welcome",
 *     "image": "/uploads/banner.jpg",
 *     "buttonText": "Learn More"
 *   }
 * }
 */

// ============================================
// API Response Format Examples
// ============================================

/**
 * Example: How data is returned by API (populated)
 * 
 * GET /api/collections/pages/clx_page_123
 * {
 *   "id": "clx_page_123",
 *   "title": "Home Page",
 *   "banner": {
 *     "id": "clx123abc",
 *     "component": "banner",
 *     "title": "Welcome",
 *     "image": "/uploads/banner.jpg",
 *     "buttonText": "Learn More"
 *   },
 *   "sections": [
 *     {
 *       "id": "clx456def",
 *       "component": "text-section",
 *       "heading": "About Us",
 *       "content": "..."
 *     },
 *     {
 *       "id": "clx789ghi",
 *       "component": "image-gallery",
 *       "images": [...]
 *     }
 *   ],
 *   "seo": {
 *     "id": "clx999jkl",
 *     "component": "seo",
 *     "metaTitle": "Home - My Site",
 *     "metaDescription": "Welcome to our site"
 *   }
 * }
 */

// ============================================
// Nested Component Support
// ============================================

/**
 * Components can contain other components
 * 
 * Example: Hero component with nested SEO
 * {
 *   "hero": {
 *     "id": "clx_hero_1",
 *     "component": "hero",
 *     "title": "Welcome",
 *     "seo": {
 *       "id": "clx_seo_1",
 *       "component": "seo",
 *       "metaTitle": "Home"
 *     }
 *   }
 * }
 */

// ============================================
// Utility Types
// ============================================

/**
 * Options for populating components
 */
export interface PopulateOptions {
  maxDepth?: number; // Maximum nesting depth (default: 5)
  fields?: string[]; // Specific fields to populate
  excludeFields?: string[]; // Fields to exclude from population
}

/**
 * Component validation result
 */
export interface ComponentValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Component creation/update payload
 */
export interface ComponentEntryPayload {
  componentId?: string; // Required for creation
  componentName?: string; // Alternative to componentId
  data: Record<string, any>; // Field values
}

/**
 * Bulk component operations
 */
export interface BulkComponentOperation {
  create?: ComponentEntryPayload[];
  update?: Array<{ id: string; data: Record<string, any> }>;
  delete?: string[]; // ComponentEntry IDs
}
