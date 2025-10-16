// ============= SEMANTIC VALIDATOR - Validação cruzada de evidências =============

/**
 * Dicionário de equivalências e sinônimos para detecção flexível
 */
const EQUIVALENCES: Record<string, string[]> = {
  "pacote office": ["excel", "word", "powerpoint", "office 365", "ms office", "microsoft office", "outlook"],
  "autocad": ["autocad", "auto cad"],
  "canteiro de obras": ["execucao de obras", "execucao obras", "obra civil", "obra industrial", "canteiro", "construcao civil", "construção civil"],
  "subestacao": ["subestacao", "subestacoes", "substation", "subestações"],
  "manutencao": ["manutencao", "maintenance", "manutenção"],
  "climatizacao": ["climatizacao", "hvac", "ar condicionado", "climatização"],
};

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
 * Verifica se um termo ou seus equivalentes estão presentes no texto
 */
function isTermOrEquivalentPresent(term: string, text: string): { found: boolean; matchedTerm?: string } {
  const normalizedTerm = normalizeText(term);
  const normalizedText = normalizeText(text);

  // Primeiro tenta busca direta do termo
  if (isTermPresent(term, text)) {
    return { found: true, matchedTerm: term };
  }

  // Busca por equivalências
  for (const [canonical, equivalents] of Object.entries(EQUIVALENCES)) {
    const normalizedCanonical = normalizeText(canonical);
    
    // Se o termo buscado é o canônico ou está nos equivalentes
    if (normalizedTerm === normalizedCanonical || equivalents.some(eq => normalizeText(eq) === normalizedTerm)) {
      // Verifica se o canônico ou qualquer equivalente está no texto
      if (isTermPresent(canonical, text)) {
        return { found: true, matchedTerm: canonical };
      }
      
      for (const equivalent of equivalents) {
        if (isTermPresent(equivalent, text)) {
          return { found: true, matchedTerm: equivalent };
        }
      }
    }
  }

  return { found: false };
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
    const evidenciasOriginais = [...competenciasTecnicas.evidencias];
    const evidenciasOriginalCount = evidenciasOriginais.length;
    const evidenciasValidadas: string[] = [];
    const faltantesCorrigidos: string[] = [...(competenciasTecnicas.faltantes || [])];

    // Validar evidências existentes
    for (const evidencia of evidenciasOriginais) {
      // Extrai o termo da evidência (geralmente antes de ":" ou primeiro bloco)
      const termo = evidencia.split(/[:–-]/)[0].trim();
      
      const result = isTermOrEquivalentPresent(termo, cvOriginal);
      if (result.found) {
        evidenciasValidadas.push(evidencia);
        // Remove dos faltantes se estava lá
        const idx = faltantesCorrigidos.findIndex(f => 
          normalizeText(f).includes(normalizeText(termo))
        );
        if (idx >= 0) {
          console.log(`[SEMANTIC] Removendo "${faltantesCorrigidos[idx]}" de faltantes (encontrado no CV${result.matchedTerm ? ` como "${result.matchedTerm}"` : ''})`);
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

    // NOVO: Verificar itens em faltantes que na verdade estão no CV
    const faltantesFinal: string[] = [];
    for (const faltante of faltantesCorrigidos) {
      const result = isTermOrEquivalentPresent(faltante, cvOriginal);
      if (result.found) {
        console.log(`[SEMANTIC] Removendo faltante por equivalência: "${faltante}" → encontrado como "${result.matchedTerm}"`);
        // Adiciona evidência se não existe
        const evidenciaTexto = `${faltante}: Encontrado no CV`;
        if (!evidenciasValidadas.some(e => normalizeText(e).includes(normalizeText(faltante)))) {
          evidenciasValidadas.push(evidenciaTexto);
        }
      } else {
        faltantesFinal.push(faltante);
      }
    }

    competenciasTecnicas.evidencias = evidenciasValidadas;
    competenciasTecnicas.faltantes = faltantesFinal;

    // Atualizar itens_presentes_no_curriculo e itens_ausentes_no_curriculo se existirem
    if (competenciasTecnicas.itens_presentes_no_curriculo || competenciasTecnicas.itens_ausentes_no_curriculo) {
      const presentesAtualizados = evidenciasValidadas.map(e => e.split(/[:–-]/)[0].trim());
      competenciasTecnicas.itens_presentes_no_curriculo = presentesAtualizados;
      competenciasTecnicas.itens_ausentes_no_curriculo = faltantesFinal;
    }

    // Ajustar pontuação se perdeu muitas evidências
    const percentualPerdido = evidenciasOriginalCount > 0 
      ? 1 - (evidenciasValidadas.length / evidenciasOriginalCount)
      : 0;
    
    if (percentualPerdido > 0.3) {
      const pontuacaoOriginal = competenciasTecnicas.pontuacao_local || 0;
      const novaPontuacao = Math.max(0, Math.floor(pontuacaoOriginal * (1 - percentualPerdido * 0.5)));
      console.log(`[SEMANTIC] Ajustando pontuação de competências técnicas: ${pontuacaoOriginal} → ${novaPontuacao}`);
      competenciasTecnicas.pontuacao_local = novaPontuacao;
    } else if (evidenciasValidadas.length > evidenciasOriginalCount) {
      // Se adicionamos evidências por equivalência, podemos aumentar a pontuação
      const pontuacaoOriginal = competenciasTecnicas.pontuacao_local || 0;
      const percentualGanho = (evidenciasValidadas.length - evidenciasOriginalCount) / evidenciasOriginalCount;
      const novaPontuacao = Math.min(25, Math.floor(pontuacaoOriginal * (1 + percentualGanho * 0.3)));
      console.log(`[SEMANTIC] Aumentando pontuação de competências técnicas por equivalências: ${pontuacaoOriginal} → ${novaPontuacao}`);
      competenciasTecnicas.pontuacao_local = novaPontuacao;
    }
  }

  // 2. Validar palavras-chave presentes
  if (palavrasChave.presentes && palavrasChave.ausentes) {
    const presentesValidadas: string[] = [];
    const ausentesCorrigidos: string[] = [...palavrasChave.ausentes];

    // Validar palavras marcadas como presentes
    for (const palavra of palavrasChave.presentes) {
      const result = isTermOrEquivalentPresent(palavra, cvOriginal);
      if (result.found) {
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

    // NOVO: Verificar palavras em ausentes que na verdade estão no CV por equivalência
    const ausentesFinal: string[] = [];
    let correcoesPorEquivalencia = 0;
    for (const ausente of ausentesCorrigidos) {
      const result = isTermOrEquivalentPresent(ausente, cvOriginal);
      if (result.found) {
        console.log(`[SEMANTIC] Palavra-chave corrigida: "${ausente}" → encontrado como "${result.matchedTerm}"`);
        if (!presentesValidadas.some(p => normalizeText(p) === normalizeText(ausente))) {
          presentesValidadas.push(ausente);
          correcoesPorEquivalencia++;
        }
      } else {
        ausentesFinal.push(ausente);
      }
    }

    palavrasChave.presentes = presentesValidadas;
    palavrasChave.ausentes = ausentesFinal;

    if (correcoesPorEquivalencia > 0) {
      console.log(`[SEMANTIC] Palavras-chave corrigidas: ${correcoesPorEquivalencia} removidas de ausentes, adicionadas a presentes`);
    }

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
