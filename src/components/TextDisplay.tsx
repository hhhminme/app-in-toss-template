import { TextBox, CharSpan, type CharStatus } from '../styles/typing.styles';

interface TextDisplayProps {
  text: string;
  inputValue: string;
  onClick: () => void;
}

export function TextDisplay({ text, inputValue, onClick }: TextDisplayProps) {
  const getCharStatus = (index: number): CharStatus => {
    if (index === inputValue.length) return 'cursor';
    if (index >= inputValue.length) return 'pending';
    return text[index] === inputValue[index] ? 'correct' : 'incorrect';
  };

  return (
    <TextBox onClick={onClick}>
      {text.split('').map((char, index) => (
        <CharSpan key={index} status={getCharStatus(index)}>
          {char}
        </CharSpan>
      ))}
    </TextBox>
  );
}
