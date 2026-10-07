export const STATUSES = ['finished', 'in-progress', 'designed', 'simulated', 'hardened'] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  finished: 'Finished',
  'in-progress': 'In progress',
  designed: 'Designed',
  simulated: 'Simulated',
  hardened: 'Hardened',
};
