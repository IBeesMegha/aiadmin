/**
 * API Endpoints Utilities
 * Helper functions for endpoint matching and validation
 */

export interface ApiEndpoint {
  endpoint: string;
  method: string;
  description: string;
  module: string;
}

/**
 * Check if endpoint matches pattern (handles :id parameters)
 */
export function matchEndpoint(requestPath: string, patternPath: string): boolean {
  const requestParts = requestPath.split('/').filter(Boolean);
  const patternParts = patternPath.split('/').filter(Boolean);

  if (requestParts.length !== patternParts.length) {
    return false;
  }

  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      // It's a parameter, skip comparison
      continue;
    }
    if (requestParts[i] !== patternParts[i]) {
      return false;
    }
  }

  return true;
}
