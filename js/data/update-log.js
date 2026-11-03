export const UPDATE_LOG = [
  {
    version: '1.01',
    date: '2026-11-03',
    entries: [
      {
        context: 'Feature',
        title: 'Rare Saps',
        href: '#/life/rare-saps',
        description: 'Added Silver, Golden, Diamond and Amethyst Sap with separate owned-amount calculators, three bonuses each and their tree-cutting drop chances.',
      },
      {
        context: 'Feature',
        title: 'Power of Fossils',
        href: '#/life/power-of-fossils',
        description: 'Added seven permanent Fossil milestone bonuses, including More Life Gems and More Void Apples.',
      },
      {
        context: 'Changes',
        title: 'Named Sap and Fossil effects',
        description: 'Bonus cards now show their real effects, including More Logs, Axe Damage, Better Sap Chance, More Research Cap and Mastery.',
      },
      {
        context: 'Bugs',
        title: 'Fossil calculator input',
        description: 'Fixed empty Fossil amounts being rejected; an empty field now correctly behaves as zero, and game-number input is accepted.',
      },
      {
        context: 'Bugs',
        title: 'Bonus card overflow and resource links',
        description: 'Fixed cramped text and overflowing bonus cards. Colored resource names in the calculators now navigate to their matching wiki pages.',
      },
      {
        context: 'UI',
        title: 'Rare Sap colors and layout',
        description: 'Grouped the four Rare Saps on one page, color-coded by type, and adjusted the bonus grids for desktop and mobile screens.',
      },
      {
        context: 'UI',
        title: 'A refreshed Update Log',
        description: 'Added a version overview, entry counts, category filters and colorful, clickable resource references throughout the release notes.',
      },
    ],
  },
  {
    version: '1',
    date: '2026-10-30',
    entries: [],
  },
];

export let LATEST_UPDATE_ID = UPDATE_LOG[0]?.version || '';

export let LATEST_UPDATE = UPDATE_LOG[0] || null;

export let UPDATE_ENTRY_COUNT = UPDATE_LOG.reduce((n, v) => n + v.entries.length, 0);

export function setUpdateLog(versions) {
  UPDATE_LOG.splice(0, UPDATE_LOG.length, ...versions);
  LATEST_UPDATE = UPDATE_LOG[0] || null;
  LATEST_UPDATE_ID = LATEST_UPDATE?.version || '';
  UPDATE_ENTRY_COUNT = UPDATE_LOG.reduce((total, version) => total + version.entries.length, 0);
}
