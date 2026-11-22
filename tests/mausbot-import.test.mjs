import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMausbotPackage } from '../src/mausbot-import.ts';

const packageV2 = {
  format: 'openmaus.package',
  version: 2,
  package: {
    name: 'Research lab',
    team: { brief: 'Cite evidence.' },
    agents: [
      { key: 'lead', name: 'Leader', title: 'Scientist', description: 'Find hypotheses.', soul: 'Be concise.', approval: 'full', model: 'unsafe' },
      { key: 'review', name: 'Reviewer', title: 'Verifier', description: 'Refute bad claims.', playbooks: ['check'] },
    ],
    playbooks: [{ key: 'check', name: 'Check', instructions: 'Test falsifiable claims.' }],
    rooms: [{ key: 'research', name: 'Research', members: ['lead', 'review'] }],
    routines: [{ enabledAfterInstall: true }],
    connections: [{ secret: 'never-import' }],
  },
};

test('all agents, playbooks and rooms import without permissions or credentials', () => {
  const parsed = parseMausbotPackage(packageV2);
  assert.deepEqual(parsed.rooms, [{ name: 'Research', members: ['lead', 'review'] }]);
  assert.equal(parsed.agents.length, 2);
  assert.match(parsed.agents[0].instructions, /Cite evidence/);
  assert.match(parsed.agents[1].instructions, /Test falsifiable/);
  assert.equal(parsed.agents[0].soul, 'Be concise.');
  assert.equal('approval' in parsed.agents[0], false);
  assert.equal('routines' in parsed, false);
  assert.equal('connections' in parsed, false);
});

test('unknown versions and duplicate agent keys or names fail closed', () => {
  assert.throws(() => parseMausbotPackage({ ...packageV2, version: 3 }), /version 2/);
  const duplicate = structuredClone(packageV2);
  duplicate.package.agents[1].key = 'lead';
  assert.throws(() => parseMausbotPackage(duplicate), /Duplicate/);
  duplicate.package.agents[1].key = 'review';
  duplicate.package.agents[1].name = 'leader';
  assert.throws(() => parseMausbotPackage(duplicate), /Duplicate/);
});

test('unknown room members and invalid package structures are rejected', () => {
  assert.throws(() => parseMausbotPackage({}), /version 2/);
  const invalid = structuredClone(packageV2);
  invalid.package.rooms[0].members = ['ghost'];
  assert.throws(() => parseMausbotPackage(invalid), /Unknown member/);
});
