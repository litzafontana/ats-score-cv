// Extração de texto de PDF no BROWSER, usando pdfjs-dist v4, sem top-level await.
// Opção B: SEM worker (fallback universal) - roda no main thread

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import type { TextContent } from 'pdfjs-dist/types/src/display/api';

// Força rodar no main thread (sem worker)
GlobalWorkerOptions.workerPort = null;
// Definir workerSrc explicitamente para evitar erro "No GlobalWorkerOptions.workerSrc specified"
GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';

export async function extractPdfInBrowser(file: File): Promise<string> {
  const ab = await file.arrayBuffer();

  // Carrega o PDF com configs que evitam travas no browser
  const loadingTask = getDocument({
    data: ab,
    isEvalSupported: false,
    useWorkerFetch: false,
    disableFontFace: false,
  });

  const pdf = await loadingTask.promise;
  console.log('📄 [Browser] PDF carregado:', {
    pages: pdf.numPages
  });

  const parts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content: TextContent = await page.getTextContent();
    
    const txt = content.items
      .map((it: any) => {
        if (it?.str) return it.str;
        if (it?.chars) return (it.chars as any[]).map((c: any) => c?.str || '').join('');
        if (it?.text) return it.text;
        return '';
      })
      .filter(Boolean)
      .join(' ');
    
    parts.push(txt);
    
    if (i === 1) {
      console.log('📝 [Browser] Página 1 preview:', txt.substring(0, 200));
    }
  }

  const normalized = normalize(parts.join('\n'));
  console.log('✅ [Browser] PDF extraído:', normalized.length, 'caracteres');
  
  return normalized;
}

export async function extractDocxInBrowser(file: File): Promise<string> {
  // DOCX não tem parser puro JS confiável sem dependências nativas
  // Retornar erro para cair no backend parser
  throw new Error('DOCX extraction not supported in browser - will use backend parser');
}

function normalize(t: string): string {
  return t
    .normalize('NFKC')
    .replace(/(\w)-\n(\w)/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isPdf(file: File): boolean {
  return file.type.includes('pdf') || /\.pdf$/i.test(file.name);
}

export function isDocx(file: File): boolean {
  return (
    file.type.includes('word') ||
    file.type.includes('document') ||
    /\.(docx|doc)$/i.test(file.name)
  );
}
