import { DiagnosticInput, ResultadoCompleto, ResultadoParcial, Alerta } from "./aiSchema";

export class ATSAnalyzer {
  private openaiKey: string;

  constructor(openaiKey: string) {
    this.openaiKey = openaiKey;
  }

  async analisarCV(input: DiagnosticInput): Promise<{ parcial: ResultadoParcial; completo: ResultadoCompleto }> {
    console.log("Iniciando análise ATS...");

    try {
      const prompt = this.construirPrompt(input);
      const response = await this.chamarOpenAI(prompt);
      
      // Parse da resposta JSON
      const resultado = JSON.parse(response);
      
      // Extrair resultado parcial (gratuito)
      const parcial: ResultadoParcial = {
        nota_ats: resultado.nota_ats,
        alertas_top2: resultado.alertas_todos.slice(0, 2), // Pegar apenas os 2 primeiros
        resumo_rapido: resultado.resumo_geral.substring(0, 200) + "...",
      };

      // Resultado completo (pago)
      const completo: ResultadoCompleto = resultado;

      return { parcial, completo };
    } catch (error) {
      console.error("Erro na análise:", error);
      throw new Error("Falha na análise do CV. Tente novamente.");
    }
  }

  private construirPrompt(input: DiagnosticInput): string {
    return `
Você é um especialista em ATS (Applicant Tracking System) e recrutamento. Analise o CV a seguir considerando a descrição da vaga fornecida.

**CV:**
${input.cv_content}

**DESCRIÇÃO DA VAGA:**
${input.job_description}

**INSTRUÇÕES:**
Faça uma análise completa do CV considerando:
1. Compatibilidade com sistemas ATS
2. Palavras-chave relevantes para a vaga
3. Formatação e estrutura
4. Experiências e qualificações
5. Educação e certificações
6. Habilidades técnicas e comportamentais

**RETORNE APENAS UM JSON válido com esta estrutura:**
{
  "nota_ats": number (0-100),
  "resumo_geral": "string com resumo da análise",
  "alertas_todos": [
    {
      "tipo": "critico|importante|sugestao",
      "titulo": "string",
      "descricao": "string", 
      "impacto": "string explicando o impacto",
      "sugestao": "string com sugestão de melhoria"
    }
  ],
  "secoes": {
    "palavras_chave": {
      "pontuacao": number (0-100),
      "feedback": "string",
      "pontos_fortes": ["string"],
      "pontos_melhoria": ["string"]
    },
    "formatacao": { /* mesma estrutura */ },
    "estrutura": { /* mesma estrutura */ },
    "experiencia": { /* mesma estrutura */ },
    "educacao": { /* mesma estrutura */ },
    "habilidades": { /* mesma estrutura */ }
  },
  "recomendacoes_finais": ["string"],
  "comparacao_vaga": {
    "compatibilidade": number (0-100),
    "requisitos_atendidos": ["string"],
    "requisitos_faltantes": ["string"]
  }
}

**IMPORTANTE:**
- Retorne APENAS o JSON, sem texto adicional
- Use português brasileiro
- Seja específico e prático nas sugestões
- Ordene alertas por criticidade (crítico > importante > sugestão)
- Dê uma nota realista baseada na análise ATS
`;
  }

  private async chamarOpenAI(prompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em ATS e análise de CVs. Sempre retorne JSON válido conforme solicitado.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
}

// Função utilitária para simular análise (fallback)
export function gerarAnaliseSimulada(input: DiagnosticInput): { parcial: ResultadoParcial; completo: ResultadoCompleto } {
  const nota = Math.floor(Math.random() * 40) + 60; // 60-100

  const alertas: Alerta[] = [
    {
      tipo: "critico",
      titulo: "Falta de palavras-chave",
      descricao: "Seu CV não contém palavras-chave importantes da vaga",
      impacto: "Reduz significativamente as chances de passar pelo filtro ATS",
      sugestao: "Inclua termos específicos da área e da vaga no seu CV"
    },
    {
      tipo: "importante", 
      titulo: "Formatação inadequada",
      descricao: "A formatação pode dificultar a leitura pelos sistemas ATS",
      impacto: "Informações importantes podem não ser identificadas",
      sugestao: "Use formatação simples, sem tabelas ou gráficos complexos"
    },
    {
      tipo: "sugestao",
      titulo: "Otimize a estrutura",
      descricao: "A ordem das seções pode ser melhorada",
      impacto: "Pequeno impacto na experiência do recrutador",
      sugestao: "Coloque experiências mais relevantes no topo"
    }
  ];

  const parcial: ResultadoParcial = {
    nota_ats: nota,
    alertas_top2: alertas.slice(0, 2),
    resumo_rapido: "Seu CV possui boa estrutura geral, mas precisa de ajustes nas palavras-chave e formatação para melhor performance em sistemas ATS..."
  };

  const completo: ResultadoCompleto = {
    nota_ats: nota,
    resumo_geral: "Análise completa do seu CV mostra pontos fortes em experiência, mas oportunidades de melhoria em otimização ATS.",
    alertas_todos: alertas,
    secoes: {
      palavras_chave: {
        pontuacao: nota - 10,
        feedback: "Palavras-chave poderiam ser melhor otimizadas",
        pontos_fortes: ["Termos técnicos presentes"],
        pontos_melhoria: ["Incluir mais palavras da vaga", "Usar sinônimos relevantes"]
      },
      formatacao: {
        pontuacao: nota - 5,
        feedback: "Formatação adequada mas pode ser otimizada",
        pontos_fortes: ["Estrutura clara", "Sem erros graves"],
        pontos_melhoria: ["Simplificar layout", "Evitar elementos gráficos"]
      },
      estrutura: {
        pontuacao: nota,
        feedback: "Boa estrutura geral",
        pontos_fortes: ["Seções bem definidas"],
        pontos_melhoria: ["Reordenar por relevância"]
      },
      experiencia: {
        pontuacao: nota + 5,
        feedback: "Experiências bem descritas",
        pontos_fortes: ["Descrições detalhadas", "Resultados quantificados"],
        pontos_melhoria: ["Conectar melhor com a vaga"]
      },
      educacao: {
        pontuacao: nota,
        feedback: "Formação adequada",
        pontos_fortes: ["Formação relevante"],
        pontos_melhoria: ["Destacar certificações"]
      },
      habilidades: {
        pontuacao: nota - 5,
        feedback: "Habilidades podem ser mais específicas",
        pontos_fortes: ["Variedade de competências"],
        pontos_melhoria: ["Ser mais específico", "Incluir níveis de proficiência"]
      }
    },
    recomendacoes_finais: [
      "Otimize palavras-chave específicas da vaga",
      "Simplifique a formatação para melhor leitura ATS",
      "Quantifique mais os resultados alcançados",
      "Personalize o CV para cada vaga aplicada"
    ],
    comparacao_vaga: {
      compatibilidade: nota - 5,
      requisitos_atendidos: [
        "Experiência na área",
        "Formação adequada",
        "Algumas habilidades técnicas"
      ],
      requisitos_faltantes: [
        "Certificação específica mencionada",
        "Experiência com ferramenta X",
        "Inglês avançado comprovado"
      ]
    }
  };

  return { parcial, completo };
}