// Production compatibility module. The isolated Redesign Test editor is disabled.
// Keep these exports because existing production modules import them.
export const REDESIGN_TEST = false;

function testModeDisabled() {
  throw new Error('The Redesign Test editor is disabled in production.');
}

export const listTestVersions = testModeDisabled;
export const readTestVersion = testModeDisabled;
export const saveTestVersion = testModeDisabled;
export async function publishedTestDocuments() { return testModeDisabled(); }
export async function testLive() { return testModeDisabled(); }
export async function publishTestDraft() { return testModeDisabled(); }
