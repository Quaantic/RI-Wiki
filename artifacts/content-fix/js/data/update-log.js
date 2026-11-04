export const UPDATE_LOG = [];

export let LATEST_UPDATE_ID = '';
export let LATEST_UPDATE = null;
export let UPDATE_ENTRY_COUNT = 0;

export function setUpdateLog(versions) {
  UPDATE_LOG.splice(0, UPDATE_LOG.length, ...versions);
  LATEST_UPDATE = UPDATE_LOG[0] || null;
  LATEST_UPDATE_ID = LATEST_UPDATE?.version || '';
  UPDATE_ENTRY_COUNT = UPDATE_LOG.reduce((total, version) => total + version.entries.length, 0);
}
