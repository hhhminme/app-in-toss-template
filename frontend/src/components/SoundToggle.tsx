import { Button } from '@toss/tds-mobile';

interface SoundToggleProps {
  enabled: boolean;
  onToggle: () => void;
  /** null = 확인 중, true = 연결됨, false = 연결 실패 */
  serverConnected?: boolean | null;
}

export function SoundToggle({
  enabled,
  onToggle,
  serverConnected,
}: SoundToggleProps) {
  const showWarning = serverConnected === false;

  return (
    <Button
      size="small"
      variant="weak"
      onClick={onToggle}
      aria-label={
        showWarning
          ? 'TTS 서버 연결 실패 — 소리 없이 진행'
          : enabled
            ? '사운드 끄기'
            : '사운드 켜기'
      }
    >
      {showWarning ? '🔇⚠️' : enabled ? '🔊' : '🔇'}
    </Button>
  );
}
