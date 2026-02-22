import { Paragraph } from '@toss/tds-mobile';
import {
  TimerWrapper,
  TimerNumber,
  TimerBounceWrap,
  TimerEmoji,
} from '../styles/typing.styles';
import { FloatingParticles, type Particle } from './FloatingParticle';
import type { SpeedTier } from '../utils/speedTier';

interface SpeedDisplayProps {
  wpm: number;
  isRunning: boolean;
  speedTier: SpeedTier;
  particles: Particle[];
  onRemoveParticle: (id: number) => void;
}

export function TimerDisplay({
  wpm,
  isRunning,
  speedTier,
  particles,
  onRemoveParticle,
}: SpeedDisplayProps) {
  const bounceKey = Math.floor(wpm / 5);

  return (
    <TimerWrapper>
      <TimerEmoji>{speedTier.emoji}</TimerEmoji>
      <TimerNumber tierColor={speedTier.color} glow={speedTier.glow}>
        <TimerBounceWrap key={bounceKey}>{wpm}</TimerBounceWrap>
      </TimerNumber>
      <Paragraph typography="t6" color="grey600">
        <Paragraph.Text>{isRunning ? '타/분' : '입력하면 시작'}</Paragraph.Text>
      </Paragraph>
      <FloatingParticles particles={particles} onRemove={onRemoveParticle} />
    </TimerWrapper>
  );
}
