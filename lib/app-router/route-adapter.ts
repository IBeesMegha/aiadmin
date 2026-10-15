/**
 * App Router <-> Pages API adapter
 *
 * Lets existing Pages Router API handlers (NextApiRequest/NextApiResponse)
 * run unchanged inside App Router `route.ts` handlers.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Readable } from 'stream';

type PagesHandler = (
  req: NextApiRequest,
  res: NextApiResponse
) => Promise<unknown> | unknown;

type RouteContext = {
  params?: Record<string, string | string[]>;
};

function parseCookies(cookieHeader: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const pair of cookieHeader.split(';')) {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const key = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      if (key) out[key] = decodeURIComponent(value);
    }
  }
  return out;
}

export function adaptHandler(handler: PagesHandler) {
  return async function routeHandler(
    request: Request,
    context: RouteContext = {}
  ): Promise<Response> {
    const url = new URL(request.url);
    const method = (request.method || 'GET').toUpperCase();

    const query: Record<string, unknown> = {};
    url.searchParams.forEach((value, key) => {
      const existing = query[key];
      if (existing === undefined) query[key] = value;
      else if (Array.isArray(existing)) existing.push(value);
      else query[key] = [existing, value];
    });

    const params = context.params || {};
    for (const key of Object.keys(params)) {
      query[key] = params[key];
    }

    let bodyBuffer = Buffer.alloc(0);
    if (method !== 'GET' && method !== 'HEAD') {
      try {
        const arrayBuffer = await request.arrayBuffer();
        bodyBuffer = Buffer.from(arrayBuffer);
      } catch {
        bodyBuffer = Buffer.alloc(0);
      }
    }

    const headers: Record<string, string | string[] | undefined> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    // Build a Pages-like request object backed by a readable stream so
    // handlers that consume the raw body (e.g. multipart uploads) still work.
    const req = Readable.from(
      bodyBuffer.length ? [bodyBuffer] : []
    ) as unknown as Record<string, any>;

    req.method = method;
    req.url = url.pathname + url.search;
    req.headers = headers;
    req.query = query;
    req.cookies = parseCookies((headers.cookie as string) || '');
    req.socket = {
      remoteAddress:
        ((headers['x-forwarded-for'] as string) || '').split(',')[0].trim() ||
        undefined,
    };

    const contentType = String(headers['content-type'] || '').toLowerCase();
    if (bodyBuffer.length) {
      if (contentType.includes('application/json')) {
        try {
          req.body = JSON.parse(bodyBuffer.toString('utf8'));
        } catch {
          req.body = undefined;
        }
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const search = new URLSearchParams(bodyBuffer.toString('utf8'));
        const parsed: Record<string, string> = {};
        search.forEach((value, key) => {
          parsed[key] = value;
        });
        req.body = parsed;
      }
    }

    const rawHeaders: Record<string, string | string[]> = {};
    let statusCode = 200;
    let payload: string | Uint8Array | null = null;
    let sent = false;

    const setHeader = (name: string, value: string | string[]) => {
      rawHeaders[name.toLowerCase()] = value;
    };
    const getHeader = (name: string) => rawHeaders[name.toLowerCase()];
    const removeHeader = (name: string) => {
      delete rawHeaders[name.toLowerCase()];
    };

    const res = {
      setHeader,
      getHeader,
      removeHeader,
      getHeaderNames: () => Object.keys(rawHeaders),
      status(code: number) {
        statusCode = code;
        return res;
      },
      json(data: unknown) {
        sent = true;
        if (!getHeader('content-type')) setHeader('content-type', 'application/json');
        payload = JSON.stringify(data);
        return res;
      },
      send(data: unknown) {
        sent = true;
        if (typeof data === 'string') {
          if (!getHeader('content-type')) setHeader('content-type', 'text/html');
          payload = data;
        } else if (Buffer.isBuffer(data)) {
          payload = new Uint8Array(data);
        } else if (data !== undefined && data !== null) {
          if (!getHeader('content-type')) setHeader('content-type', 'application/json');
          payload = JSON.stringify(data);
        }
        return res;
      },
      end(data?: unknown) {
        sent = true;
        if (data !== undefined && data !== null) {
          if (typeof data === 'string') payload = data;
          else if (Buffer.isBuffer(data)) payload = new Uint8Array(data);
          else payload = String(data);
        }
        return res;
      },
      redirect(codeOrUrl: number | string, maybeUrl?: string) {
        const code = typeof codeOrUrl === 'number' ? codeOrUrl : 307;
        const location = typeof codeOrUrl === 'string' ? codeOrUrl : maybeUrl || '/';
        statusCode = code;
        setHeader('location', location);
        sent = true;
        return res;
      },
      writeHead(code: number, hdrs?: Record<string, string | string[]>) {
        statusCode = code;
        if (hdrs) {
          for (const [key, value] of Object.entries(hdrs)) setHeader(key, value);
        }
        return res;
      },
      get statusCode() {
        return statusCode;
      },
      set statusCode(code: number) {
        statusCode = code;
      },
      get headersSent() {
        return sent;
      },
    } as unknown as NextApiResponse;

    try {
      await handler(req as unknown as NextApiRequest, res);
    } catch (error: any) {
      console.error('Route handler error:', error);
      if (!sent) {
        statusCode = 500;
        setHeader('content-type', 'application/json');
        payload = JSON.stringify({
          success: false,
          error: error?.message || 'Internal server error',
        });
      }
    }

    const responseHeaders = new Headers();
    for (const [key, value] of Object.entries(rawHeaders)) {
      if (Array.isArray(value)) {
        for (const item of value) responseHeaders.append(key, item);
      } else {
        responseHeaders.set(key, value);
      }
    }

    return new Response(payload as any, {
      status: statusCode,
      headers: responseHeaders,
    });
  };
}

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'] as const;
