import type { WorkingPreference } from '../types';

const labels: Record<WorkingPreference, string> = {
  FULLTIME: 'Full Time',
  PARTTIME: 'Part Time',
  REMOTE: 'Remote',
  HYBRID: 'Hybrid',
};

const classes: Record<WorkingPreference, string> = {
  FULLTIME: 'chip',
  PARTTIME: 'chip chip-orange',
  REMOTE: 'chip chip-green',
  HYBRID: 'chip chip-purple',
};

export default function WorkingPreferenceBadge({ value }: { value: WorkingPreference | null | undefined }) {
  if (!value) return null;
  return <span className={classes[value]}>{labels[value]}</span>;
}
