const test = require('node:test');
const assert = require('node:assert/strict');
const { seedFamily, putStory, reviewStory, connectedPeople, relationTo } = require('../src/lib/family.ts');
const seed = () => structuredClone(seedFamily);

test('the same people have relationships relative to the current viewpoint', () => {
  const family = seed();
  assert.equal(relationTo(family, 'adewale'), 'Grandparent');
  assert.equal(relationTo(family, 'tunde'), 'Cousin');
  family.viewerId = 'funmi';
  assert.equal(relationTo(family, 'adewale'), 'Parent');
  assert.equal(relationTo(family, 'kemi'), 'Child');
});
test('a new personal viewpoint does not inherit an unrelated sample tree', () => {
  const family = seed();
  family.people.push({ id: 'new-person', name: 'New Person', born: '', living: true, biography: '' });
  family.viewerId = 'new-person';
  assert.deepEqual(connectedPeople(family).map(p => p.id), ['new-person']);
});
test('self biographies and edits to other relatives contributions are rejected centrally', () => {
  const family = seed(); const story = family.stories[0];
  assert.throws(() => putStory(family, { ...story, id: 'new', subjectId: 'kemi' }));
  assert.throws(() => putStory(family, { ...family.stories[1], authorId: 'kemi' }));
});
test('reviewing your own writing or biography cannot publish it', () => {
  const family = seed(); family.stories[0].status = 'In review'; family.stories[3].status = 'In review';
  assert.throws(() => reviewStory(family, 'made-room', 'Approved', 'Mine'));
  assert.throws(() => reviewStory(family, 'gathering', 'Approved', 'About me'));
});
test('relative review publishes a story and preserves attribution', () => {
  const result = reviewStory(seed(), 'blue-cupboard', 'Approved', 'I remember this too.');
  const story = result.stories.find(s => s.id === 'blue-cupboard');
  assert.equal(story.status, 'Published'); assert.equal(story.authorId, 'tola'); assert.equal(story.reviews[0].personId, 'kemi');
});
test('edits return published stories to draft without discarding family recollections', () => {
  const family = seed(); const story = family.stories[0];
  const result = putStory(family, { ...story, html: '<p>A corrected memory.</p>' });
  assert.equal(result.stories[0].status, 'Draft'); assert.deepEqual(result.stories[0].reviews, story.reviews);
});
test('empty stories cannot enter review', () => {
  const family = seed(); assert.throws(() => putStory(family, { ...family.stories[0], status: 'In review', html: '<p></p>' }));
});
