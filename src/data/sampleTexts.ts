export const sampleTexts: string[] = [
  'The quick brown fox jumps over the lazy dog near the riverbank.',
  'Technology is best when it brings people together and makes life easier.',
  'Reading books every day will help you grow and expand your knowledge.',
  'Success is not final, failure is not fatal, it is the courage to continue that counts.',
  'The universe is under no obligation to make sense to you or anyone else.',
  'A smooth sea never made a skilled sailor who could navigate through storms.',
  'Do not watch the clock, do what it does and keep moving forward every day.',
  'In the middle of every difficulty lies an opportunity waiting to be discovered.',
  'The only way to do great work is to love what you do with all your heart.',
  'Life is what happens to you while you are busy making other plans for yourself.',
  'The greatest glory in living lies not in never falling but in rising every time.',
  'It does not matter how slowly you go as long as you do not stop moving forward.',
  'Education is the most powerful weapon which you can use to change the world.',
  'The future belongs to those who believe in the beauty of their dreams and goals.',
  'Happiness is not something ready made but comes from your own actions each day.',
  'Everything you have ever wanted is on the other side of fear and discomfort.',
  'Believe you can and you are halfway there on your journey toward your goal.',
  'Start where you are, use what you have, and do what you can every single day.',
  'If you look at what you have in life you will always have more than you need.',
  'The best time to plant a tree was twenty years ago and the second best time is now.',
];

export function getRandomText(): string {
  const index = Math.floor(Math.random() * sampleTexts.length);
  return sampleTexts[index];
}
