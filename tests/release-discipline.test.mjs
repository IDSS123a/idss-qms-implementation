import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'

const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

test('release scripts include typecheck, tests, and production build', () => {
  assert.equal(packageJson.scripts.typecheck, 'tsc --noEmit')
  assert.equal(packageJson.scripts.test, 'node --test tests/*.test.mjs')
  assert.equal(packageJson.scripts.build, 'next build')
})

test('production security headers are configured', () => {
  const config = fs.readFileSync(new URL('../next.config.mjs', import.meta.url), 'utf8')
  assert.match(config, /X-Content-Type-Options/)
  assert.match(config, /Referrer-Policy/)
  assert.match(config, /Strict-Transport-Security/)
})
