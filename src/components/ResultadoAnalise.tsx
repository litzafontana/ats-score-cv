import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Pontuação ATS</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className={`text-6xl font-bold mb-4 ${getScoreColor(ats_json.overall_score)}`}>
            {ats_json.overall_score}
            <span className="text-2xl text-muted-foreground">/100</span>
          </div>
          <Progress value={ats_json.overall_score} className="w-full max-w-md mx-auto" />
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
              <Badge variant={getScoreVariant(ats_json.breakdown.experience_alignment.score)}>
                {ats_json.breakdown.experience_alignment.score}/30
              </Badge>
            </div>
            <Progress value={(ats_json.breakdown.experience_alignment.score / 30) * 100} />
            {ats_json.breakdown.experience_alignment.evidence.length > 0 && (
              <div className="mt-2 text-sm text-muted-foreground">
                <strong>Evidências:</strong>
                <ul className="list-disc list-inside mt-1">
                  {ats_json.breakdown.experience_alignment.evidence.map((evidence, idx) => (
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
              <Badge variant={getScoreVariant(ats_json.breakdown.tech_skills_tools.score)}>
                {ats_json.breakdown.tech_skills_tools.score}/25
              </Badge>
            </div>
            <Progress value={(ats_json.breakdown.tech_skills_tools.score / 25) * 100} />
            
            {ats_json.breakdown.tech_skills_tools.matched.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Encontradas ({ats_json.breakdown.tech_skills_tools.matched.length})
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {ats_json.breakdown.tech_skills_tools.matched.map((skill, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {ats_json.breakdown.tech_skills_tools.missing.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-red-600 flex items-center gap-1">
                  <XCircle className="h-4 w-4" />
                  Ausentes ({ats_json.breakdown.tech_skills_tools.missing.length})
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {ats_json.breakdown.tech_skills_tools.missing.map((skill, idx) => (
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
              <Badge variant={getScoreVariant(ats_json.breakdown.keywords.score)}>
                {ats_json.breakdown.keywords.score}/15
              </Badge>
            </div>
            <Progress value={(ats_json.breakdown.keywords.score / 15) * 100} />
            
            {ats_json.breakdown.keywords.present.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-green-600">
                  Presentes: {ats_json.breakdown.keywords.present.join(", ")}
                </p>
              </div>
            )}
            
            {ats_json.breakdown.keywords.absent.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-red-600">
                  Ausentes: {ats_json.breakdown.keywords.absent.join(", ")}
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
              <Badge variant={getScoreVariant(ats_json.breakdown.impact_results.score)}>
                {ats_json.breakdown.impact_results.score}/10
              </Badge>
            </div>
            <Progress value={(ats_json.breakdown.impact_results.score / 10) * 100} />
            {ats_json.breakdown.impact_results.evidence.length > 0 && (
              <div className="mt-2 text-sm text-muted-foreground">
                <strong>Evidências:</strong>
                <ul className="list-disc list-inside mt-1">
                  {ats_json.breakdown.impact_results.evidence.map((evidence, idx) => (
                    <li key={idx}>{evidence}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ações Prioritárias */}
      {ats_json.top_actions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ações Prioritárias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ats_json.top_actions.map((action, idx) => (
                <div key={idx} className="border-l-4 border-primary pl-4">
                  <h4 className="font-semibold text-foreground">{action.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{action.why}</p>
                  <p className="text-sm mt-2">
                    <strong>Como fazer:</strong> {action.how_example}
                  </p>
                  <Badge variant="outline" className="mt-2">
                    +{action.est_impact_points} pontos estimados
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Frases Prontas */}
      {ats_json.ready_to_paste_bullets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Frases Prontas para Usar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ats_json.ready_to_paste_bullets.map((bullet, idx) => (
                <div key={idx} className="p-3 bg-muted rounded-md text-sm">
                  {bullet}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entidades Detectadas */}
      <Card>
        <CardHeader>
          <CardTitle>Perfil Detectado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-medium mb-2">Cargos</h4>
              <div className="flex flex-wrap gap-1">
                {ats_json.detected_entities.roles.map((role, idx) => (
                  <Badge key={idx} variant="secondary">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Ferramentas</h4>
              <div className="flex flex-wrap gap-1">
                {ats_json.detected_entities.tools.map((tool, idx) => (
                  <Badge key={idx} variant="outline">
                    {tool}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Domínios</h4>
              <div className="flex flex-wrap gap-1">
                {ats_json.detected_entities.domains.map((domain, idx) => (
                  <Badge key={idx}>
                    {domain}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
      {ats_json.errors.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {ats_json.errors.map((error, idx) => (
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