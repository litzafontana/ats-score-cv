import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Target,
  Brain,
  Search,
  TrendingUp,
  GraduationCap,
  FileCheck,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lightbulb,
  Crown,
  ArrowLeft
} from "lucide-react";
import type { ATSRich, Categoria } from "@/lib/aiSchema";
import { downloadPDF } from "@/lib/report";
import { useEffect } from "react";

interface ResultadoRobustoAnaliseProps {
  resultado: ATSRich;
  diagnosticoId: string;
  isPaid: boolean;
  handleUpgrade?: () => void;
}

export function ResultadoRobustoAnalise({ resultado, diagnosticoId, isPaid, handleUpgrade }: ResultadoRobustoAnaliseProps) {
  
  // Verificar se precisa voltar para o formulário devido a URL inválida
  useEffect(() => {
    if (resultado.descricao_vaga_invalida) {
      // Redirecionar após 5 segundos para dar tempo de ler a mensagem
      const timer = setTimeout(() => {
        window.location.href = '/?retry=url_failed&mode=text_only';
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [resultado.descricao_vaga_invalida]);
  
  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return "text-success";
    if (percentage >= 60) return "text-warning"; 
    return "text-danger";
  };

  const getScoreVariant = (score: number, maxScore: number): "default" | "secondary" | "destructive" => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return "default";
    if (percentage >= 60) return "secondary";
    return "destructive";
  };

  const getProgressColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return "bg-success";
    if (percentage >= 60) return "bg-warning";
    return "bg-danger";
  };

  const CategoryCard = ({ 
    title, 
    icon: Icon, 
    categoria, 
    maxScore, 
    showDetails = isPaid 
  }: { 
    title: string; 
    icon: any; 
    categoria: Categoria; 
    maxScore: number; 
    showDetails?: boolean;
  }) => (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Pontuação</span>
          <Badge variant={getScoreVariant(categoria.pontuacao_local, maxScore)}>
            {categoria.pontuacao_local}/{maxScore}
          </Badge>
        </div>
        
        <div className="relative">
          <Progress 
            value={(categoria.pontuacao_local / maxScore) * 100} 
            className="h-2"
          />
        </div>

        {showDetails && (
          <>
            {categoria.evidencias && categoria.evidencias.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Evidências encontradas:</p>
                <ul className="text-xs space-y-1">
                  {categoria.evidencias.map((evidencia, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3 w-3 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{evidencia}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {categoria.presentes && categoria.presentes.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-success">Palavras-chave encontradas:</p>
                <div className="flex flex-wrap gap-1">
                  {categoria.presentes.map((item, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs bg-success/10 text-success">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {categoria.faltantes && categoria.faltantes.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-danger">Competências ausentes:</p>
                <div className="flex flex-wrap gap-1">
                  {categoria.faltantes.map((item, idx) => (
                    <Badge key={idx} variant="destructive" className="text-xs">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {categoria.ausentes && categoria.ausentes.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-danger">Palavras-chave ausentes:</p>
                <div className="flex flex-wrap gap-1">
                  {categoria.ausentes.map((item, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs bg-danger/10 text-danger">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {categoria.riscos && categoria.riscos.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-warning flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Riscos de formatação:
                </p>
                <ul className="text-xs space-y-1">
                  {categoria.riscos.map((risco, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <XCircle className="h-3 w-3 text-danger mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{risco}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {!showDetails && (
          <div className="text-center py-2">
            <Badge variant="outline" className="text-xs">
              <Crown className="h-3 w-3 mr-1" />
              Detalhe Premium
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Aviso crítico de URL não lida - Redirecionamento automático */}
      {resultado.descricao_vaga_invalida && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-3">
                <p className="text-sm font-medium text-red-800">
                  ⚠️ Análise baseada em URL inválida detectada
                </p>
                <p className="text-xs text-red-700">
                  Não conseguimos extrair o conteúdo da URL fornecida. Algumas plataformas (como Gupy, Vale, InfoJobs) 
                  bloqueiam leitura automática por robôs. A análise pode estar imprecisa.
                </p>
                <div className="bg-red-100 p-3 rounded-md border border-red-200">
                  <p className="text-xs font-medium text-red-800 mb-2">
                    🔄 Redirecionamento automático em 5 segundos...
                  </p>
                  <p className="text-xs text-red-700">
                    Você será redirecionado para refazer a análise colando o texto completo da vaga.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => window.location.href = '/?retry=url_failed&mode=text_only'}
                    className="text-xs"
                  >
                    <ArrowLeft className="h-3 w-3 mr-1" />
                    Refazer Agora com Texto
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pontuação Geral */}
      <Card className="border-primary/20 bg-gradient-to-br from-background to-secondary/30">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-bold">Pontuação ATS</CardTitle>
          <p className="text-muted-foreground">Compatibilidade com sistemas de recrutamento</p>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className={`text-6xl font-bold ${getScoreColor(resultado.nota_final, 100)}`}>
            {resultado.nota_final}
            <span className="text-2xl text-muted-foreground">/100</span>
          </div>
          
          <div className="max-w-md mx-auto">
            <Progress value={resultado.nota_final} className="h-4" />
          </div>

          <Button 
            onClick={() => {
              if (isPaid) {
                downloadPDF(diagnosticoId);
              } else if (handleUpgrade) {
                handleUpgrade();
              }
            }}
            className="mt-4 bg-primary hover:bg-primary/90"
            size="lg"
          >
            <Download className="h-4 w-4 mr-2" />
            {isPaid ? "Baixar Relatório (PDF)" : "Desbloquear no Premium"}
          </Button>
        </CardContent>
      </Card>

      {/* Breakdown por Categorias */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Análise Detalhada por Categoria</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CategoryCard 
            title="Alinhamento de Experiência" 
            icon={Target}
            categoria={resultado.categorias.experiencia_alinhada}
            maxScore={30}
          />
          <CategoryCard 
            title="Competências Técnicas" 
            icon={Brain}
            categoria={resultado.categorias.competencias_tecnicas}
            maxScore={25}
          />
          <CategoryCard 
            title="Palavras-chave" 
            icon={Search}
            categoria={resultado.categorias.palavras_chave}
            maxScore={15}
          />
          <CategoryCard 
            title="Resultados/Impacto" 
            icon={TrendingUp}
            categoria={resultado.categorias.resultados_impacto}
            maxScore={10}
          />
          <CategoryCard 
            title="Formação/Certificações" 
            icon={GraduationCap}
            categoria={resultado.categorias.formacao_certificacoes}
            maxScore={10}
          />
          <CategoryCard 
            title="Formatação ATS" 
            icon={FileCheck}
            categoria={resultado.categorias.formatacao_ats}
            maxScore={10}
          />
        </div>
      </div>

      {/* Ações Prioritárias (Premium) */}
      {isPaid && resultado.acoes_prioritarias && resultado.acoes_prioritarias.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              Ações Prioritárias
            </CardTitle>
            <p className="text-muted-foreground">Recomendações com maior potencial de impacto</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {resultado.acoes_prioritarias.map((acao, idx) => (
                <div key={idx} className="border-l-4 border-primary pl-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <h4 className="font-semibold text-foreground">{acao.titulo}</h4>
                    <Badge variant="outline" className="bg-primary/10 text-primary">
                      +{acao.ganho_estimado_pontos} pts
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{acao.como_fazer}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Frases Prontas (Premium) */}
      {isPaid && resultado.frases_prontas && resultado.frases_prontas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Frases Prontas para Seu CV</CardTitle>
            <p className="text-muted-foreground">Copie e cole diretamente em seu currículo</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {resultado.frases_prontas.map((frase, idx) => (
                <div key={idx} className="p-3 bg-muted/50 rounded-md border border-dashed">
                  <p className="text-sm font-mono">{frase}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Perfil Detectado (Premium) */}
      {isPaid && resultado.perfil_detectado && (
        <Card>
          <CardHeader>
            <CardTitle>Perfil Profissional Detectado</CardTitle>
            <p className="text-muted-foreground">Análise baseada no seu currículo</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Cargos Identificados</h4>
                <div className="flex flex-wrap gap-2">
                  {resultado.perfil_detectado.cargos.length > 0 ? (
                    resultado.perfil_detectado.cargos.map((cargo, idx) => (
                      <Badge key={idx} variant="secondary">
                        {cargo}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">Não identificado</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Ferramentas</h4>
                <div className="flex flex-wrap gap-2">
                  {resultado.perfil_detectado.ferramentas.length > 0 ? (
                    resultado.perfil_detectado.ferramentas.map((ferramenta, idx) => (
                      <Badge key={idx} variant="outline">
                        {ferramenta}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">Não identificado</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Domínios de Atuação</h4>
                <div className="flex flex-wrap gap-2">
                  {resultado.perfil_detectado.dominios.length > 0 ? (
                    resultado.perfil_detectado.dominios.map((dominio, idx) => (
                      <Badge key={idx}>
                        {dominio}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">Não identificado</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}