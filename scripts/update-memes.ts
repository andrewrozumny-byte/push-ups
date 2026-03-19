import fs from "fs";
import path from "path";

const memesDir = path.join(process.cwd(), "public/memes");
const files = fs
  .readdirSync(memesDir)
  .filter((f) => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
  .sort();

const content = `// Auto-generated - do not edit manually
export const MEMES: string[] = ${JSON.stringify(files, null, 2)}

export function getDailyMeme(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  )
  return MEMES[dayOfYear % MEMES.length]
}
`;

fs.writeFileSync(path.join(process.cwd(), "lib/memes.ts"), content);
console.log("Updated memes.ts with", files.length, "files:", files);

