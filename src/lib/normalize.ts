/**
 * Utilitários para normalização e validação de dados
 */

// Normalizar email
export function normalizarEmail(email: string): string {
  return email.toLowerCase().trim();
}

// Extrair texto limpo de CV (remover formatação extra)
export function limparTextoCV(texto: string): string {
  return texto
    .replace(/\s+/g, ' ') // Multiple spaces -> single space
    .replace(/\n\s*\n/g, '\n') // Multiple newlines -> single newline
    .trim();
}

// Extrair texto de job description
export function limparJobDescription(texto: string): string {
  return texto
    .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
    .replace(/\s+/g, ' ')
    .trim();
}

// Validar se o texto tem conteúdo suficiente para análise
export function validarConteudoMinimo(texto: string, minimoCaracteres = 50): boolean {
  const textoLimpo = texto.replace(/\s/g, '');
  return textoLimpo.length >= minimoCaracteres;
}

// Extrair palavras-chave do job description
export function extrairPalavrasChave(jobDescription: string): string[] {
  const texto = jobDescription.toLowerCase();
  
  // Palavras técnicas comuns e relevantes
  const palavrasRelevantes = [
    // Tecnologias
    'javascript', 'python', 'react', 'node', 'sql', 'aws', 'docker', 'kubernetes',
    'typescript', 'java', 'c#', 'php', 'ruby', 'golang', 'rust', 'swift',
    
    // Frameworks
    'angular', 'vue', 'express', 'django', 'flask', 'spring', 'laravel',
    
    // Bancos de dados
    'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch',
    
    // Cloud
    'azure', 'gcp', 'heroku', 'vercel', 'netlify',
    
    // Metodologias
    'agile', 'scrum', 'kanban', 'devops', 'ci/cd', 'tdd', 'bdd',
    
    // Soft skills
    'liderança', 'comunicação', 'trabalho em equipe', 'proativo', 'criativo',
    
    // Níveis
    'junior', 'pleno', 'senior', 'lead', 'manager', 'diretor'
  ];
  
  return palavrasRelevantes.filter(palavra => 
    texto.includes(palavra) || texto.includes(palavra.replace(/\s/g, ''))
  );
}

// Sanitizar input do usuário
export function sanitizarInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .trim();
}

// Gerar ID único para diagnóstico
export function gerarDiagnosticoId(): string {
  return `diag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Calcular tempo estimado de análise
export function calcularTempoAnalise(cvLength: number, jobLength: number): number {
  // Base: 10 segundos + 1 segundo por cada 100 caracteres
  const baseTime = 10;
  const additionalTime = Math.ceil((cvLength + jobLength) / 100);
  return Math.min(baseTime + additionalTime, 30); // Max 30 segundos
}

// Formatar tamanho de arquivo
export function formatarTamanhoArquivo(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Validar formato de arquivo
export function validarFormatoArquivo(fileName: string): boolean {
  const extensoesPermitidas = ['.pdf', '.doc', '.docx', '.txt'];
  const extensao = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  return extensoesPermitidas.includes(extensao);
}

// Extrair extensão do arquivo
export function extrairExtensao(fileName: string): string {
  return fileName.toLowerCase().substring(fileName.lastIndexOf('.') + 1);
}

// Gerar storage path único para arquivo
export function gerarStoragePath(diagnosticoId: string, fileName: string): string {
  const timestamp = Date.now();
  const extensao = extrairExtensao(fileName);
  return `diagnosticos/${diagnosticoId}/${timestamp}.${extensao}`;
}

// Validar se é um email válido (mais rigoroso que HTML5)
export function validarEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Truncar texto mantendo palavras completas
export function truncarTexto(texto: string, maxLength: number): string {
  if (texto.length <= maxLength) return texto;
  
  const truncated = texto.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  return lastSpace > maxLength * 0.8 
    ? truncated.substring(0, lastSpace) + '...'
    : truncated + '...';
}

// Detectar idioma básico (PT/EN)
export function detectarIdioma(texto: string): 'pt' | 'en' | 'unknown' {
  const palavrasPortugues = ['experiência', 'formação', 'habilidades', 'projetos', 'empresa'];
  const palavrasIngles = ['experience', 'education', 'skills', 'projects', 'company'];
  
  const textoLower = texto.toLowerCase();
  
  const scorePt = palavrasPortugues.filter(palavra => textoLower.includes(palavra)).length;
  const scoreEn = palavrasIngles.filter(palavra => textoLower.includes(palavra)).length;
  
  if (scorePt > scoreEn) return 'pt';
  if (scoreEn > scorePt) return 'en';
  return 'unknown';
}