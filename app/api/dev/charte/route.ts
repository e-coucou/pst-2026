import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'charte.md');
    const content = await fs.readFile(filePath, 'utf8');
    return NextResponse.json({ content });
  } catch (e) {
    return NextResponse.json({ 
      content: "# ❌ Fichier non trouvé\n\nCréez un fichier `charte.md` à la racine." 
    });
  }
}