// ============= SEMANTIC VALIDATOR - Validação cruzada de evidências =============

/**
 * Normaliza texto para comparação (remove acentos, lowcase, etc)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s]/g, ' ') // Remove pontuação
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Verifica se um termo está presente no texto usando busca flexível
 */
function isTermPresent(term: string, text: string): boolean {
  const normalizedTerm = normalizeText(term);
  const normalizedText = normalizeText(text);
  
  // Busca exata
  if (normalizedText.includes(normalizedTerm)) {
    return true;
  }

  // Busca por palavras individuais (para termos compostos)
  const termWords = normalizedTerm.split(/\s+/).filter(w => w.length > 2);
  if (termWords.length > 1) {
    const foundWords = termWords.filter(word => normalizedText.includes(word));
    // Considera presente se encontrou pelo menos 70% das palavras
    return foundWords.length / termWords.length >= 0.7;
  }

  return false;
}

/**
 * Valida consistência semântica entre listas presentes/ausentes e o CV real
 */
export function validateSemanticConsistency(
  analiseRica: any,
  cvOriginal: string
): any {
  console.log('[SEMANTIC] Iniciando validação semântica...');

  const categorias = analiseRica.categorias || {};
  const competenciasTecnicas = categorias.competencias_tecnicas || {};
  const palavrasChave = categorias.palavras_chave || {};

  // 1. Validar competências técnicas
  if (competenciasTecnicas.evidencias) {
    const evidenciasValidadas: string[] = [];
    const faltantesCorrigidos: string[] = [...(competenciasTecnicas.faltantes || [])];

    for (const evidencia of competenciasTecnicas.evidencias) {
      // Extrai o termo da evidência (geralmente antes de ":" ou primeiro bloco)
      const termo = evidencia.split(/[:–-]/)[0].trim();
      
      if (isTermPresent(termo, cvOriginal)) {
        evidenciasValidadas.push(evidencia);
        // Remove dos faltantes se estava lá
        const idx = faltantesCorrigidos.findIndex(f => 
          normalizeText(f).includes(normalizeText(termo))
        );
        if (idx >= 0) {
          console.log(`[SEMANTIC] Removendo "${faltantesCorrigidos[idx]}" de faltantes (encontrado no CV)`);
          faltantesCorrigidos.splice(idx, 1);
        }
      } else {
        console.log(`[SEMANTIC] Evidência suspeita (não encontrada no CV): "${termo}"`);
        // Não adiciona à lista validada, mas adiciona aos faltantes se não estava
        if (!faltantesCorrigidos.some(f => normalizeText(f).includes(normalizeText(termo)))) {
          faltantesCorrigidos.push(termo);
        }
      }
    }

    competenciasTecnicas.evidencias = evidenciasValidadas;
    competenciasTecnicas.faltantes = faltantesCorrigidos;

    // Ajustar pontuação se perdeu muitas evidências
    const percentualPerdido = 1 - (evidenciasValidadas.length / (competenciasTecnicas.evidencias?.length || 1));
    if (percentualPerdido > 0.3) {
      const pontuacaoOriginal = competenciasTecnicas.pontuacao_local || 0;
      const novaPontuacao = Math.max(0, Math.floor(pontuacaoOriginal * (1 - percentualPerdido * 0.5)));
      console.log(`[SEMANTIC] Ajustando pontuação de competências técnicas: ${pontuacaoOriginal} → ${novaPontuacao}`);
      competenciasTecnicas.pontuacao_local = novaPontuacao;
    }
  }

  // 2. Validar palavras-chave presentes
  if (palavrasChave.presentes && palavrasChave.ausentes) {
    const presentesValidadas: string[] = [];
    const ausentesCorrigidos: string[] = [...palavrasChave.ausentes];

    for (const palavra of palavrasChave.presentes) {
      if (isTermPresent(palavra, cvOriginal)) {
        presentesValidadas.push(palavra);
        // Remove dos ausentes
        const idx = ausentesCorrigidos.findIndex(a => 
          normalizeText(a) === normalizeText(palavra)
        );
        if (idx >= 0) {
          console.log(`[SEMANTIC] Removendo "${ausentesCorrigidos[idx]}" de ausentes (encontrado no CV)`);
          ausentesCorrigidos.splice(idx, 1);
        }
      } else {
        // Move para ausentes se não foi encontrada
        if (!ausentesCorrigidos.some(a => normalizeText(a) === normalizeText(palavra))) {
          ausentesCorrigidos.push(palavra);
        }
      }
    }

    palavrasChave.presentes = presentesValidadas;
    palavrasChave.ausentes = ausentesCorrigidos;

    // Recalcular pontuação baseada nas palavras validadas
    if (palavrasChave.palavras_chave_extraidas) {
      const total = palavrasChave.palavras_chave_extraidas.length;
      const batidas = presentesValidadas.length;
      const percentual = total > 0 ? batidas / total : 0;
      palavrasChave.pontuacao_local = Math.min(15, Math.floor(percentual * 15));
    }
  }

  // 3. Recalcular nota final
  const novaNotaFinal = Object.values(categorias).reduce((sum: number, cat: any) => {
    return sum + (cat.pontuacao_local || 0);
  }, 0);

  console.log(`[SEMANTIC] Nota final ajustada: ${analiseRica.nota_final} → ${novaNotaFinal}`);
  analiseRica.nota_final = novaNotaFinal;

  return analiseRica;
}

/**
 * Adiciona alerta se detectar inconsistências graves
 */
export function addInconsistencyAlerts(analiseRica: any): any {
  const categorias = analiseRica.categorias || {};
  const competencias = categorias.competencias_tecnicas || {};
  
  // Se tem muitos faltantes mas pontuação alta, adiciona alerta
  if ((competencias.faltantes || []).length > 5 && competencias.pontuacao_local > 15) {
    const alertas = analiseRica.alertas || [];
    if (!alertas.some((a: string) => a.includes('competências técnicas'))) {
      alertas.unshift(
        `⚠️ Detectadas ${competencias.faltantes.length} competências técnicas ausentes no currículo. ` +
        `Adicionar essas tecnologias pode aumentar significativamente sua nota.`
      );
      analiseRica.alertas = alertas;
    }
  }

  return analiseRica;
}
