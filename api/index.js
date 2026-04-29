// Remove the 'edge' config to use the standard Node.js runtime
export default async function handler(req, res) {
  const TARGET = process.env.TARGET_DOMAIN; // e.g., https://vps.com:2096
  
  if (!TARGET) return res.status(500).send("Env Missing");

  const targetUrl = new URL(req.url, TARGET);
  targetUrl.host = new URL(TARGET).host;
  targetUrl.protocol = new URL(TARGET).protocol;

  try {
    const response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers: filterHeaders(req.headers),
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req : null,
      duplex: 'half',
      redirect: 'manual'
    });

    res.status(response.status);
    response.headers.forEach((v, k) => {
      if (k.toLowerCase() !== 'transfer-encoding') res.setHeader(k, v);
    });

    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  } catch (e) {
    console.error(e);
    res.status(502).end("Relay Error");
  }
}

function filterHeaders(h) {
  const out = {};
  const skip = ['host', 'connection', 'upgrade', 'te'];
  Object.keys(h).forEach(k => {
    if (!skip.includes(k.toLowerCase()) && !k.startsWith('x-vercel')) {
      out[k] = h[k];
    }
  });
  return out;
}
