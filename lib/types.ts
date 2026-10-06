import { z } from 'zod';

// Field Types
export type FieldType = 
  | 'string' 
  | 'text' 
  | 'richtext' 
  | 'richtext-ckeditor'
  | 'number' 
  | 'boolean' 
  | 'date' 
  | 'email'
  | 'json'
  | 'media'
  | 'component'
  | 'dynamiczone'
  | 'relation';

export interface RelationMetadata {
  type: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';
  targetCollection: string;
  targetCollectionDisplay: string;
  targetField: string;
  // Metadata for tracking bidirectional relations
  relationName?: string; // e.g., "ProductToCategory"
  isOwner?: boolean; // Which side owns the foreign key
  isVirtual?: boolean; // True for inverse relations (no physical column)
}

export interface Field {
  name: string;
  type: FieldType;
  displayName: string;
  required?: boolean;
  unique?: boolean;
  default?: any;
  componentRef?: string; // For component type
  multiple?: boolean; // For component arrays and media fields (true = array, false/undefined = single)
  relation?: RelationMetadata;
  validations?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

export interface ContentTypeFields {
  fields: Field[];
}

// API Response Types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  requiresRestart?: boolean; // Indicates if dev server restart is needed
}

// Content Type Builder Types
export interface CollectionTypeData {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  fields: ContentTypeFields;
  createdAt: Date;
  updatedAt: Date;
}

export interface SingleTypeData {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  fields: ContentTypeFields;
  data?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComponentData {
  id: string;
  name: string;
  displayName: string;
  category: string;
  fields: ContentTypeFields;
  createdAt: Date;
  updatedAt: Date;
}

// Form validation helpers
export const createFieldSchema = (field: Field): z.ZodTypeAny => {
  let schema: z.ZodTypeAny;

  switch (field.type) {
    case 'string':
    case 'text':
    case 'email':
      schema = z.string({
        required_error: `${field.displayName} is required`,
        invalid_type_error: `${field.displayName} must be a text value`,
      });
      
      if (field.required) {
        schema = (schema as z.ZodString).min(1, `${field.displayName} is required`);
      }
      
      if (field.validations?.minLength) {
        schema = (schema as z.ZodString).min(
          field.validations.minLength,
          `${field.displayName} must be at least ${field.validations.minLength} characters`
        );
      }
      if (field.validations?.maxLength) {
        schema = (schema as z.ZodString).max(
          field.validations.maxLength,
          `${field.displayName} must be at most ${field.validations.maxLength} characters`
        );
      }
      if (field.type === 'email') {
        schema = (schema as z.ZodString).email(`${field.displayName} must be a valid email address`);
      }
      break;
      
    case 'richtext':
    case 'richtext-ckeditor':
      schema = z.string({
        required_error: `${field.displayName} is required`,
        invalid_type_error: `${field.displayName} must be a text value`,
      });
      
      if (field.required) {
        schema = (schema as z.ZodString).min(1, `${field.displayName} is required`);
      }
      break;
      
    case 'number':
      schema = z.number({
        required_error: `${field.displayName} is required`,
        invalid_type_error: `${field.displayName} must be a number`,
      });
      
      if (field.validations?.min !== undefined) {
        schema = (schema as z.ZodNumber).min(
          field.validations.min,
          `${field.displayName} must be at least ${field.validations.min}`
        );
      }
      if (field.validations?.max !== undefined) {
        schema = (schema as z.ZodNumber).max(
          field.validations.max,
          `${field.displayName} must be at most ${field.validations.max}`
        );
      }
      break;
      
    case 'boolean':
      schema = z.boolean({
        required_error: `${field.displayName} is required`,
        invalid_type_error: `${field.displayName} must be true or false`,
      });
      break;
      
    case 'date':
      if (field.required) {
        schema = z.string({
          required_error: `${field.displayName} is required`,
        }).min(1, `${field.displayName} is required`).or(z.date());
      } else {
        schema = z.string().or(z.date());
      }
      break;
      
    case 'media':
      // Handle media fields based on multiple property
      if (field.multiple) {
        // Multiple media - can be array or comma-separated string
        if (field.required) {
          schema = z.string().min(1, `${field.displayName} is required`).or(
            z.array(z.string()).min(1, `${field.displayName} must have at least one item`)
          );
        } else {
          schema = z.string().or(z.array(z.string())).optional();
        }
      } else {
        // Single media - single URL string
        if (field.required) {
          schema = z.string({
            required_error: `${field.displayName} is required`,
          }).min(1, `${field.displayName} is required`);
        } else {
          schema = z.string().optional();
        }
      }
      break;
      
    case 'relation':
      // Handle relation fields - store as ID or array of IDs
      if (field.relation?.type === 'oneToMany' || field.relation?.type === 'manyToMany') {
        if (field.required) {
          schema = z.array(z.string()).min(1, `${field.displayName} must have at least one selection`).or(
            z.string().min(1, `${field.displayName} is required`)
          );
        } else {
          schema = z.array(z.string()).or(z.string()).optional();
        }
      } else {
        if (field.required) {
          schema = z.string({
            required_error: `${field.displayName} is required`,
          }).min(1, `${field.displayName} is required`);
        } else {
          schema = z.string().optional();
        }
      }
      break;
      
    case 'json':
      if (field.required) {
        schema = z.any().refine((val) => val !== undefined && val !== null && val !== '', {
          message: `${field.displayName} is required`,
        });
      } else {
        schema = z.any();
      }
      break;
      
    case 'component':
    case 'dynamiczone':
      if (field.required) {
        schema = z.any().refine((val) => val !== undefined && val !== null, {
          message: `${field.displayName} is required`,
        });
      } else {
        schema = z.any();
      }
      break;
      
    default:
      schema = z.any();
  }

  if (!field.required) {
    schema = schema.optional();
  }

  return schema;
};

export const createValidationSchema = (fields: Field[]) => {
  const schemaObject: Record<string, z.ZodTypeAny> = {};
  
  fields.forEach(field => {
    // For manyToOne and oneToOne relations, we need to validate the FK field
    // The field name itself is the FK column (no Id suffix)
    if (field.type === 'relation' && field.relation) {
      if (field.relation.type === 'manyToOne' || field.relation.type === 'oneToOne') {
        // Use the field name as-is for the FK field
        const fkFieldName = field.name;
        schemaObject[fkFieldName] = createFieldSchema(field);
        console.log(`[Validation Schema] Added FK field: ${fkFieldName} for relation: ${field.name}`);
      } else {
        // For oneToMany and manyToMany, use the original field name (will be filtered out by backend)
        schemaObject[field.name] = createFieldSchema(field);
      }
    } else {
      schemaObject[field.name] = createFieldSchema(field);
    }
  });

  console.log('[Validation Schema] Schema fields:', Object.keys(schemaObject));
  
  return z.object(schemaObject);
};
