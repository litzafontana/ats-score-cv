// Extração no BROWSER para PDF e DOCX
// Evita problemas de edge/Deno e fontes problemáticas

export async function extractPdfInBrowser(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  
  // Configurar worker
  const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker.default;

  const ab = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: ab,
    isEvalSupported: false,
    disableFontFace: false, // browser pode lidar melhor com fontes
  });

  const pdf = await loadingTask.promise;
  console.log('📄 [Browser] PDF carregado:', {
    pages: pdf.numPages
  });

  const parts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    
    const txt = content.items
      .map((it: any) => {
        if (it?.str) return it.str;
        if (it?.chars) return it.chars.map((c: any) => c?.str || '').join('');
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
