// ============= CV PARSER - Estrutura o CV em seções =============

export interface CVParsed {
  experiencias: string[];
  habilidades: string[];
  formacao: string[];
  certificacoes: string[];
  outros: string[];
  texto_completo: string;
}

/**
 * Analisa o texto do CV e identifica seções estruturadas
 */
export function parseCV(cvText: string): CVParsed {
  const lines = cvText.split('\n');
  const result: CVParsed = {
    experiencias: [],
    habilidades: [],
    formacao: [],
    certificacoes: [],
    outros: [],
    texto_completo: cvText
  };

  let currentSection: keyof Omit<CVParsed, 'texto_completo'> | null = null;
  const sectionBuffer: string[] = [];

  const sectionKeywords = {
    experiencias: /experiência|experience|trabalho|profissional|histórico|atuação|carreira/i,
    habilidades: /habilidades|competências|skills|conhecimentos|tecnologias|ferramentas/i,
    formacao: /formação|educação|education|acadêmica|graduação|faculdade/i,
    certificacoes: /certificações|certificados|cursos|treinamentos|qualificações/i
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detecta mudança de seção
    let newSection: typeof currentSection = null;
    for (const [key, regex] of Object.entries(sectionKeywords)) {
      if (regex.test(trimmed)) {
        newSection = key as keyof Omit<CVParsed, 'texto_completo'>;
        break;
      }
    }

    // Se mudou de seção, salva o buffer anterior
    if (newSection && newSection !== currentSection) {
      if (currentSection && sectionBuffer.length > 0) {
        result[currentSection].push(sectionBuffer.join(' '));
        sectionBuffer.length = 0;
      }
      currentSection = newSection;
      sectionBuffer.push(trimmed);
    } else if (currentSection) {
      sectionBuffer.push(trimmed);
    } else {
      result.outros.push(trimmed);
    }
  }

  // Salva último buffer
  if (currentSection && sectionBuffer.length > 0) {
    result[currentSection].push(sectionBuffer.join(' '));
  }

  return result;
}

/**
 * Formata o CV parseado para envio ao LLM de forma mais clara
 */
export function formatCVForLLM(parsed: CVParsed): string {
  const sections: string[] = [];

  if (parsed.experiencias.length > 0) {
    sections.push('=== EXPERIÊNCIAS PROFISSIONAIS ===');
    sections.push(...parsed.experiencias);
    sections.push('');
  }

  if (parsed.habilidades.length > 0) {
    sections.push('=== HABILIDADES TÉCNICAS ===');
    sections.push(...parsed.habilidades);
    sections.push('');
  }

  if (parsed.formacao.length > 0) {
    sections.push('=== FORMAÇÃO ACADÊMICA ===');
    sections.push(...parsed.formacao);
    sections.push('');
  }

  if (parsed.certificacoes.length > 0) {
    sections.push('=== CERTIFICAÇÕES E CURSOS ===');
    sections.push(...parsed.certificacoes);
    sections.push('');
  }

  if (parsed.outros.length > 0) {
    sections.push('=== OUTRAS INFORMAÇÕES ===');
    sections.push(...parsed.outros);
  }

  return sections.join('\n');
}
