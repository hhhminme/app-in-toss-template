export type ToneName =
  | 'excited'
  | 'angry'
  | 'whisper'
  | 'happy'
  | 'sad'
  | 'calm'
  | 'dramatic'
  | 'neutral';

export interface GameContext {
  combo: number;
  wpm: number;
  isFirstWord: boolean;
  isLastWord: boolean;
  hadError: boolean;
}

/**
 * 게임 상황에 따라 TTS 톤을 결정합니다.
 * 우선순위 순서대로 평가하여 첫 번째 매칭 톤을 반환합니다.
 */
export function selectTone(ctx: GameContext): ToneName {
  if (ctx.hadError) return 'sad';
  if (ctx.combo >= 20) return 'dramatic';
  if (ctx.combo >= 10) return 'excited';
  if (ctx.wpm > 80) return 'excited';
  if (ctx.wpm < 30 && ctx.wpm > 0) return 'calm';
  if (ctx.isFirstWord) return 'happy';
  if (ctx.isLastWord) return 'dramatic';
  return 'excited';
}
