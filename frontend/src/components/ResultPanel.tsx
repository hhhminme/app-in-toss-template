import { Button, Paragraph } from '@toss/tds-mobile';
import {
  ResultCard,
  ResultGrid,
  ResultItem,
  ResultValue,
  StatsRow,
  StatsDivider,
  ResultTierSection,
  ResultTierEmoji,
  ResultTierLabel,
} from '../styles/typing.styles';
import { getSpeedTier } from '../utils/speedTier';

interface ResultPanelProps {
  wpm: number;
  accuracy: number;
  totalTyped: number;
  errorCount: number;
  bestWpm: number;
  totalGames: number;
  maxCombo: number;
  onRestart: () => void;
}

export function ResultPanel({
  wpm,
  accuracy,
  totalTyped,
  errorCount,
  bestWpm,
  totalGames,
  maxCombo,
  onRestart,
}: ResultPanelProps) {
  const tier = getSpeedTier(wpm);

  return (
    <ResultCard>
      <ResultTierSection>
        <ResultTierEmoji>{tier.emoji}</ResultTierEmoji>
        <Paragraph typography="t3">
          <Paragraph.Text>결과</Paragraph.Text>
        </Paragraph>
        <ResultTierLabel color={tier.color}>{tier.label}</ResultTierLabel>
      </ResultTierSection>

      <ResultGrid>
        <ResultItem>
          <ResultValue>{wpm}</ResultValue>
          <Paragraph typography="t7" color="grey600">
            <Paragraph.Text>타/분</Paragraph.Text>
          </Paragraph>
        </ResultItem>
        <ResultItem>
          <ResultValue>{accuracy}%</ResultValue>
          <Paragraph typography="t7" color="grey600">
            <Paragraph.Text>정확도</Paragraph.Text>
          </Paragraph>
        </ResultItem>
      </ResultGrid>

      <StatsDivider>
        <StatsRow>
          <Paragraph typography="t6" color="grey600">
            <Paragraph.Text>총 입력 글자</Paragraph.Text>
          </Paragraph>
          <Paragraph typography="t6">
            <Paragraph.Text>{totalTyped}자</Paragraph.Text>
          </Paragraph>
        </StatsRow>
        <StatsRow>
          <Paragraph typography="t6" color="grey600">
            <Paragraph.Text>오타 수</Paragraph.Text>
          </Paragraph>
          <Paragraph
            typography="t6"
            color={errorCount > 0 ? 'red500' : undefined}
          >
            <Paragraph.Text>{errorCount}개</Paragraph.Text>
          </Paragraph>
        </StatsRow>
        <StatsRow>
          <Paragraph typography="t6" color="grey600">
            <Paragraph.Text>🔥 최대 콤보</Paragraph.Text>
          </Paragraph>
          <Paragraph
            typography="t6"
            color={maxCombo >= 10 ? 'orange500' : undefined}
          >
            <Paragraph.Text>{maxCombo}</Paragraph.Text>
          </Paragraph>
        </StatsRow>
        {bestWpm > 0 && (
          <StatsRow>
            <Paragraph typography="t6" color="grey600">
              <Paragraph.Text>최고 기록</Paragraph.Text>
            </Paragraph>
            <Paragraph typography="t6" color="blue500">
              <Paragraph.Text>{bestWpm} 타/분</Paragraph.Text>
            </Paragraph>
          </StatsRow>
        )}
        {totalGames > 0 && (
          <StatsRow>
            <Paragraph typography="t6" color="grey600">
              <Paragraph.Text>총 플레이</Paragraph.Text>
            </Paragraph>
            <Paragraph typography="t6">
              <Paragraph.Text>{totalGames}회</Paragraph.Text>
            </Paragraph>
          </StatsRow>
        )}
      </StatsDivider>

      <Button
        color="primary"
        variant="fill"
        display="block"
        size="xlarge"
        onClick={onRestart}
      >
        다시하기
      </Button>
    </ResultCard>
  );
}
