import type { ATSRich } from "./aiSchema";

export function buildMarkdown(r: ATSRich) {
  const c = r.categorias;
  const md = [] as string[];
  md.push(`# Resultado da Análise ATS`);
  md.push(`\n## Pontuação Geral`);
  md.push(`A pontuação geral do candidato é **${r.nota_final}**.`);

  md.push(`\n## 1) Experiência Alinhada`);
  md.push(`**Pontuação:** ${c.experiencia_alinhada.pontuacao_local}/30`);
  if (c.experiencia_alinhada.evidencias?.length) {
    md.push(`Evidências:`);
    c.experiencia_alinhada.evidencias.forEach(e => md.push(`- ${e}`));
  }

  md.push(`\n## 2) Competências Técnicas`);
  md.push(`**Pontuação:** ${c.competencias_tecnicas.pontuacao_local}/25`);
  if (c.competencias_tecnicas.faltantes?.length) {
    md.push(`Faltantes: ${c.competencias_tecnicas.faltantes.join(", ")}`);
  }

  md.push(`\n## 3) Palavras‑chave`);
  md.push(`**Pontuação:** ${c.palavras_chave.pontuacao_local}/15`);
  if (c.palavras_chave.presentes?.length)
    md.push(`Presentes: ${c.palavras_chave.presentes.join(", ")}`);
  if (c.palavras_chave.ausentes?.length)
    md.push(`Ausentes: ${c.palavras_chave.ausentes.join(", ")}`);

  md.push(`\n## 4) Resultados/Impacto`);
  md.push(`**Pontuação:** ${c.resultados_impacto.pontuacao_local}/10`);
  if (c.resultados_impacto.evidencias?.length) {
    md.push(`Evidências:`);
    c.resultados_impacto.evidencias.forEach(e => md.push(`- ${e}`));
  }

  md.push(`\n## 5) Formação/Certificações`);
  md.push(`**Pontuação:** ${c.formacao_certificacoes.pontuacao_local}/10`);
  c.formacao_certificacoes.evidencias?.forEach(e => md.push(`- ${e}`));

  md.push(`\n## 6) Formatação ATS`);
  md.push(`**Pontuação:** ${c.formatacao_ats.pontuacao_local}/10`);
  if (c.formatacao_ats.riscos?.length) md.push(`Riscos: ${c.formatacao_ats.riscos.join(", ")}`);

  md.push(`\n## Ações Prioritárias (com ganho estimado)`);
  r.acoes_prioritarias.forEach((a, i) => {
    md.push(`${i+1}. **${a.titulo}** — Ganho estimado: ${a.ganho_estimado_pontos} pontos.`);
    md.push(`   Como fazer: ${a.como_fazer}`);
  });

  if (r.frases_prontas?.length) {
    md.push(`\n## Frases prontas para colar`);
    r.frases_prontas.forEach(f => md.push(`- ${f}`));
  }

  const p = r.perfil_detectado;
  md.push(`\n## Perfil Detectado`);
  md.push(`Cargos: ${p.cargos.join(", ") || "—"}`);
  md.push(`Ferramentas: ${p.ferramentas.join(", ") || "—"}`);
  md.push(`Domínios: ${p.dominios.join(", ") || "—"}`);

  return md.join("\n");
}

export function downloadPDF(diagnosticoId: string) {
  // Implementar chamada para a API PDF ou usar window.print como fallback
  try {
    const pdfUrl = `https://hytkdtgndmljgxwuutyu.supabase.co/functions/v1/relatorio-pdf/${diagnosticoId}`;
    window.open(pdfUrl, '_blank');
  } catch (error) {
    console.error('Erro ao gerar PDF, usando impressão:', error);
    window.print();
  }
}