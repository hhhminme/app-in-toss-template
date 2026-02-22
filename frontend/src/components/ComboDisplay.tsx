import {
  ComboContainer,
  ComboEmoji,
  ComboCount,
} from '../styles/typing.styles';

interface ComboDisplayProps {
  combo: number;
}

export function ComboDisplay({ combo }: ComboDisplayProps) {
  return (
    <ComboContainer visible={combo >= 5}>
      {combo >= 5 && (
        <>
          <ComboEmoji>🔥</ComboEmoji>
          <ComboCount>{combo} combo</ComboCount>
        </>
      )}
    </ComboContainer>
  );
}
