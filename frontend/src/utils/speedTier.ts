export interface SpeedTier {
  emoji: string;
  label: string;
  color: string;
  level: number;
  glow: boolean;
}

const TIERS: SpeedTier[] = [
  { emoji: '🐢', label: '느긋하게', color: '#8B95A1', level: 0, glow: false },
  { emoji: '🚶', label: '가볍게', color: '#3182F6', level: 1, glow: false },
  { emoji: '🏃', label: '빠르게', color: '#00B76A', level: 2, glow: false },
  { emoji: '🚀', label: '초고속', color: '#FF8800', level: 3, glow: true },
  { emoji: '⚡', label: '번개', color: '#FFD700', level: 4, glow: true },
];

export function getSpeedTier(wpm: number): SpeedTier {
  if (wpm >= 200) return TIERS[4];
  if (wpm >= 150) return TIERS[3];
  if (wpm >= 100) return TIERS[2];
  if (wpm >= 50) return TIERS[1];
  return TIERS[0];
}

export const WPM_MILESTONES = [50, 100, 150] as const;
