import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScoreProgress } from "@/components/ScoreProgress";
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Target,
  Brain,
  Lightbulb,
  TrendingUp
} from "lucide-react";
import type { AnaliseResult } from "@/lib/aiSchema";

interface ResultadoAnaliseProps {
  resultado: AnaliseResult;
}

export function ResultadoAnalise({ resultado }: ResultadoAnaliseProps) {
  const { ats_json, ats_report_md } = resultado;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  return (
    <div className="space-y-6">
      {/* Pontuação Geral */}
      <Card>
        <CardContent className="p-0">
          <ScoreProgress 
            score={ats_json.nota_final} 
            showPdfDownload={false}
          />
        </CardContent>
      </Card>

      {/* Breakdown Detalhado */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Alinhamento de Experiência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span>Pontuação</span>
              <Badge variant={getScoreVariant(ats_json.categorias.experiencia_alinhada.pontuacao_local)}>
                {ats_json.categorias.experiencia_alinhada.pontuacao_local}/30
              </Badge>
            </div>
            <Progress value={(ats_json.categorias.experiencia_alinhada.pontuacao_local / 30) * 100} />
            {ats_json.categorias.experiencia_alinhada.evidencias.length > 0 && (
              <div className="mt-2 text-sm text-muted-foreground">
                <strong>Evidências:</strong>
                <ul className="list-disc list-inside mt-1">
                  {ats_json.categorias.experiencia_alinhada.evidencias.map((evidence, idx) => (
                    <li key={idx}>{evidence}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Competências Técnicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span>Pontuação</span>
              <Badge variant={getScoreVariant(ats_json.categorias.competencias_tecnicas.pontuacao_local)}>
                {ats_json.categorias.competencias_tecnicas.pontuacao_local}/25
              </Badge>
            </div>
            <Progress value={(ats_json.categorias.competencias_tecnicas.pontuacao_local / 25) * 100} />
            
            {ats_json.categorias.competencias_tecnicas.evidencias.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Evidências ({ats_json.categorias.competencias_tecnicas.evidencias.length})
                </p>
                <div className="mt-1 text-sm text-muted-foreground">
                  <ul className="list-disc list-inside">
                    {ats_json.categorias.competencias_tecnicas.evidencias.map((evidence, idx) => (
                      <li key={idx}>{evidence}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            {ats_json.categorias.competencias_tecnicas.faltantes?.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-red-600 flex items-center gap-1">
                  <XCircle className="h-4 w-4" />
                  Faltantes ({ats_json.categorias.competencias_tecnicas.faltantes.length})
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {ats_json.categorias.competencias_tecnicas.faltantes.map((skill, idx) => (
                    <Badge key={idx} variant="destructive" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Palavras-chave
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span>Pontuação</span>
              <Badge variant={getScoreVariant(ats_json.categorias.palavras_chave.pontuacao_local)}>
                {ats_json.categorias.palavras_chave.pontuacao_local}/15
              </Badge>
            </div>
            <Progress value={(ats_json.categorias.palavras_chave.pontuacao_local / 15) * 100} />
            
            {ats_json.categorias.palavras_chave.presentes?.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-green-600">
                  Presentes: {ats_json.categorias.palavras_chave.presentes.join(", ")}
                </p>
              </div>
            )}
            
            {ats_json.categorias.palavras_chave.ausentes?.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-red-600">
                  Ausentes: {ats_json.categorias.palavras_chave.ausentes.join(", ")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Resultados/Impacto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span>Pontuação</span>
              <Badge variant={getScoreVariant(ats_json.categorias.resultados_impacto.pontuacao_local)}>
                {ats_json.categorias.resultados_impacto.pontuacao_local}/10
              </Badge>
            </div>
            <Progress value={(ats_json.categorias.resultados_impacto.pontuacao_local / 10) * 100} />
            {ats_json.categorias.resultados_impacto.evidencias.length > 0 && (
              <div className="mt-2 text-sm text-muted-foreground">
                <strong>Evidências:</strong>
                <ul className="list-disc list-inside mt-1">
                  {ats_json.categorias.resultados_impacto.evidencias.map((evidence, idx) => (
                    <li key={idx}>{evidence}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ações Prioritárias */}
      {ats_json.acoes_prioritarias?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ações Prioritárias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ats_json.acoes_prioritarias.map((action, idx) => (
                <div key={idx} className="border-l-4 border-primary pl-4">
                  <h4 className="font-semibold text-foreground">{action.titulo}</h4>
                  <p className="text-sm mt-2">
                    <strong>Como fazer:</strong> {action.como_fazer}
                  </p>
                  <Badge variant="outline" className="mt-2">
                    +{action.ganho_estimado_pontos} pontos estimados
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Frases Prontas */}
      {ats_json.frases_prontas?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Frases Prontas para Usar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ats_json.frases_prontas.map((bullet, idx) => (
                <div key={idx} className="p-3 bg-muted rounded-md text-sm">
                  {bullet}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entidades Detectadas */}
      {ats_json.perfil_detectado && (
        <Card>
          <CardHeader>
            <CardTitle>Perfil Detectado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {ats_json.perfil_detectado.cargos?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Cargos</h4>
                  <div className="flex flex-wrap gap-1">
                    {ats_json.perfil_detectado.cargos.map((role, idx) => (
                      <Badge key={idx} variant="secondary">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {ats_json.perfil_detectado.ferramentas?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Ferramentas</h4>
                  <div className="flex flex-wrap gap-1">
                    {ats_json.perfil_detectado.ferramentas.map((tool, idx) => (
                      <Badge key={idx} variant="outline">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {ats_json.perfil_detectado.dominios?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Domínios</h4>
                  <div className="flex flex-wrap gap-1">
                    {ats_json.perfil_detectado.dominios.map((domain, idx) => (
                      <Badge key={idx}>
                        {domain}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Relatório Markdown */}
      {ats_report_md && (
        <Card>
          <CardHeader>
            <CardTitle>Relatório Completo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none text-foreground">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                {ats_report_md}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertas e Erros */}
      {ats_json.alertas?.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {ats_json.alertas.map((error, idx) => (
                <li key={idx} className="text-red-600 flex items-start gap-2">
                  <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  {error}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}