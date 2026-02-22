export const sampleTexts: string[] = [
  '오늘 하루도 최선을 다해 살아가는 당신을 응원합니다.',
];

export function getRandomText(): string {
  const index = Math.floor(Math.random() * sampleTexts.length);
  return sampleTexts[index];
}
