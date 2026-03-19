import { getDayIndex } from "./daily";

// Synced with ./public/memes (sorted). Regenerate: ls public/memes | sort
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
  return MEMES[getDayIndex() % MEMES.length]!;
}
