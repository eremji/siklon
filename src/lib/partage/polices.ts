// Polices de l'image d'aperçu (US-21) : Atkinson Hyperlegible, la police de DESIGN.md, en TTF
// (next/og ne lit pas le woff2 de next/font). Lues une fois, au chargement du module, comme le
// recommande la doc de next/og ; fichiers et licence dans assets/polices.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { POLICE_APERCU } from "./DessinApercu";

export { POLICE_APERCU };

async function lire(fichier: string): Promise<ArrayBuffer> {
  const octets = await readFile(join(process.cwd(), "assets/polices", fichier));
  return octets.buffer.slice(octets.byteOffset, octets.byteOffset + octets.byteLength) as ArrayBuffer;
}

const [regular, bold] = await Promise.all([lire("AtkinsonHyperlegible-Regular.ttf"), lire("AtkinsonHyperlegible-Bold.ttf")]);

export const POLICES_APERCU = [
  { name: POLICE_APERCU, data: regular, weight: 400 as const, style: "normal" as const },
  { name: POLICE_APERCU, data: bold, weight: 700 as const, style: "normal" as const },
];
