import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { snapshotContractFixture } from './snapshot-contract-fixture.mjs';

const fixture = await snapshotContractFixture();
try {
  const actual = {};
  for (const principal of ['editor', 'reader', 'outsider']) actual[principal] = JSON.parse(JSON.stringify(await fixture.repository.snapshot(fixture.context(principal), 'fixture')));
  const expected = JSON.parse(await fs.readFile(new URL('./snapshot-contract.expected.json', import.meta.url), 'utf8'));
  assert.deepEqual(actual, expected);
  assert(!actual.reader.accountPages.some(a => a.publicId === 'editor'));
  assert.equal(actual.reader.data.tasks.find(t => t.id === 'task-0').fieldItems.find(f => f.definitionId === 'fixture-required').value, 0);
  assert(actual.editor.data.placements.some(p => p.x === -120));
  assert(!actual.reader.data.placements.length);
  console.log('PASS full snapshot contract captured before extraction: three fictional principals, own/hidden Accounts, inherited rights, assignees, typed false/zero/object fields, builtin history, hidden origins/references and signed placement visibility. Isolated SQL only.');
} finally { await fixture.db.close(); }
