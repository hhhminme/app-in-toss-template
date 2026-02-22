import { TextBox, CharSpan, type CharStatus } from '../styles/typing.styles';

interface TextDisplayProps {
  text: string;
  inputValue: string;
}

export function TextDisplay({ text, inputValue }: TextDisplayProps) {
  const getCharStatus = (index: number): CharStatus => {
    if (index === inputValue.length) return 'cursor';
    if (index >= inputValue.length) return 'pending';
    return text[index] === inputValue[index] ? 'correct' : 'incorrect';
  };

  const getCharAnimation = (index: number): 'correct' | 'incorrect' | null => {
    if (index !== inputValue.length - 1) return null;
    if (index < 0) return null;
    return text[index] === inputValue[index] ? 'correct' : 'incorrect';
  };

  return (
    <TextBox>
      {text.split('').map((char, index) => (
        <CharSpan
          key={index}
          status={getCharStatus(index)}
          animate={getCharAnimation(index)}
        >
          {char === ' ' ? '\u00A0' : char}
        </CharSpan>
      ))}
    </TextBox>
  );
}
