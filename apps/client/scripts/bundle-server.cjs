const { build } = require('esbuild')
const path = require('node:path')

const clientDir = path.resolve(__dirname, '..')
const serverEntry = path.resolve(clientDir, '../../apps/server/src/app.ts')
const outfile = path.join(clientDir, 'api/_bundle/server.mjs')

build({
  entryPoints: [serverEntry],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile,
  tsconfig: path.resolve(clientDir, '../../apps/server/tsconfig.json'),
  external: ['pg-native', 'bufferutil', 'utf-8-validate'],
  logLevel: 'info',
}).catch((err) => {
  console.error(err)
  process.exit(1)
})