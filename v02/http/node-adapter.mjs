// HTTP conversion only. Callers retain host/origin checks, authentication and routing.
export async function readNodeRequest(req, res, limit = 32768) {
  const method = req.method || 'GET';
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(',') : value);
  }
  const init = { method, headers };
  if (!['GET', 'HEAD'].includes(method)) {
    let body;
    if (req.body !== undefined) {
      body = Buffer.isBuffer(req.body) ? req.body : Buffer.from(
        typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
    } else {
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > limit) {
          res.writeHead(413);
          res.end('Request too large');
          return null;
        }
        chunks.push(chunk);
      }
      body = Buffer.concat(chunks);
    }
    if (body.length > limit) {
      res.writeHead(413);
      res.end('Request too large');
      return null;
    }
    init.body = body;
  }
  return init;
}

export async function writeFetchResponse(res, response) {
  const headers = Object.fromEntries(response.headers);
  delete headers['set-cookie'];
  const cookies = response.headers.getSetCookie();
  if (cookies.length) headers['set-cookie'] = cookies;
  res.writeHead(response.status, headers);
  res.end(await response.text());
}
