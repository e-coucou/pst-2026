import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'todo.md');
    const content = await fs.readFile(filePath, 'utf8');
    return NextResponse.json({ content });
  } catch (e) {
    return NextResponse.json({ content: "# Fichier non trouvé\nCréez un fichier `todo.md` à la racine de votre projet." });
  }
}