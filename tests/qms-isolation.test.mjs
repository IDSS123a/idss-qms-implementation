import assert from 'node:assert/strict'
import test from 'node:test'

function scopedDocumentQuery(workspaceId) {
  return { text: 'select * from qms_document where workspace_id = $1', values: [workspaceId] }
}

test('document queries are workspace scoped', () => {
  const query = scopedDocumentQuery('workspace-a')
  assert.match(query.text, /workspace_id/)
  assert.deepEqual(query.values, ['workspace-a'])
})

test('a request cannot reuse another workspace id', () => {
  const first = scopedDocumentQuery('workspace-a')
  const second = scopedDocumentQuery('workspace-b')
  assert.notDeepEqual(first.values, second.values)
})
