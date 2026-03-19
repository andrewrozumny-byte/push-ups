// Auto-generated - do not edit manually
// Source: ./public/memes (sorted)
export const MEMES: string[] = [
  "meme1.png",
  "meme2.jpg",
  "meme3.webp",
  "meme4.jpeg",
  "meme5.jpeg",
  "meme6.jpeg",
  "meme7.jpeg",
  "meme8.webp",
  "meme9.webp",
];

export function getDailyMeme(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  )
  return MEMES[dayOfYear % MEMES.length]
}
