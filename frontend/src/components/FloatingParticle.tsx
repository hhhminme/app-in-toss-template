import { useEffect } from 'react';
import { ParticleSpan } from '../styles/typing.styles';

interface Particle {
  id: number;
  value: number;
  color: string;
}

interface FloatingParticleProps {
  particles: Particle[];
  onRemove: (id: number) => void;
}

function ParticleItem({
  particle,
  onRemove,
}: {
  particle: Particle;
  onRemove: (id: number) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(particle.id), 600);
    return () => clearTimeout(timer);
  }, [particle.id, onRemove]);

  return <ParticleSpan color={particle.color}>+{particle.value}</ParticleSpan>;
}

export type { Particle };

export function FloatingParticles({
  particles,
  onRemove,
}: FloatingParticleProps) {
  return (
    <>
      {particles.map(p => (
        <ParticleItem key={p.id} particle={p} onRemove={onRemove} />
      ))}
    </>
  );
}
