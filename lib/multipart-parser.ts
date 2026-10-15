export interface ParsedFile {
  filename: string;
  mimetype: string;
  data: Buffer;
}

export interface ParsedFormData {
  fields: Record<string, string[]>;
  files: Record<string, ParsedFile[]>;
}

export function parseMultipart(body: Buffer, boundary: string): ParsedFormData {
  const fields: Record<string, string[]> = {};
  const files: Record<string, ParsedFile[]> = {};
  const delimiter = Buffer.from('--' + boundary);
  let start = body.indexOf(delimiter) + delimiter.length;

  while (start < body.length) {
    if (body[start] === 0x2d && body[start + 1] === 0x2d) break;

    start += 2;
    const headersEnd = body.indexOf('\r\n\r\n', start);
    if (headersEnd === -1) break;
    const headers = body.slice(start, headersEnd).toString();
    const contentDisposition = headers.split('\r\n').find((h) => h.toLowerCase().startsWith('content-disposition'));
    if (!contentDisposition) break;

    const nameMatch = contentDisposition.match(/name="([^"]+)"/);
    const filenameMatch = contentDisposition.match(/filename="([^"]*)"/);
    if (!nameMatch) break;
    const name = nameMatch[1];

    const dataStart = headersEnd + 4;
    let dataEnd = body.indexOf(delimiter, dataStart);
    if (dataEnd === -1) break;
    while (dataEnd > 0 && (body[dataEnd - 1] === 0x0d || body[dataEnd - 1] === 0x0a)) dataEnd--;

    if (filenameMatch && filenameMatch[1]) {
      const mimeMatch = headers.split('\r\n').find((h) => h.toLowerCase().startsWith('content-type'));
      files[name] = files[name] || [];
      files[name].push({
        filename: filenameMatch[1],
        mimetype: mimeMatch ? mimeMatch.split(':')[1].trim() : 'application/octet-stream',
        data: body.slice(dataStart, dataEnd),
      });
    } else {
      fields[name] = fields[name] || [];
      fields[name].push(body.slice(dataStart, dataEnd).toString());
    }

    start = dataEnd + delimiter.length;
  }

  return { fields, files };
}
