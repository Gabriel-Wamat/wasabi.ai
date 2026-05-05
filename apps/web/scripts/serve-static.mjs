import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'out')
const port = Number(process.env.PORT ?? 3000)

const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
}

function resolvePath(url = '/') {
  const clean = decodeURIComponent(url.split('?')[0] ?? '/')
  const safe = normalize(clean).replace(/^(\.\.[/\\])+/, '')
  const direct = join(root, safe)

  if (existsSync(direct) && statSync(direct).isFile()) return direct
  if (existsSync(join(direct, 'index.html'))) return join(direct, 'index.html')

  const html = join(root, `${safe.replace(/\/$/, '')}.html`)
  if (existsSync(html)) return html

  return join(root, 'index.html')
}

createServer((req, res) => {
  const file = resolvePath(req.url)
  res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream')
  createReadStream(file)
    .on('error', () => {
      res.statusCode = 404
      res.end('Not found')
    })
    .pipe(res)
}).listen(port, () => {
  console.log(`Personal Hub static web listening on http://localhost:${port}`)
})
