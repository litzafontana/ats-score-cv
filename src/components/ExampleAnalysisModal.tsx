import { useState } from "react";
import { CheckCircle2, AlertTriangle, BadgeCheck, Sparkles, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";

export default function ExampleAnalysisModal() {
  const [open, setOpen] = useState(false);

  const data = {
    nota_final: 83,
    pontuacao_tecnica: 35,
    pontuacao_aderencia: 48,
    classificacao: "Muito bom",
    alertas: [
      "Poucos números em resultados (quantifique impactos)",
      "Falta citar 'Gestão de Indicadores' na experiência recente",
    ],
    palavras_chave_ok: ["SAP PM", "Manutenção Preditiva", "Power BI", "RCA", "FMEA"],
    palavras_chave_faltando: ["Análise de Falhas", "NR-10"],
    responsabilidades_espelhadas: [
      "Planejamento e programação de manutenção",
      "Implementação de plano de confiabilidade",
      "Interface com operação e segurança",
    ],
    recomendacoes: [
      "Adicione 2 métricas (%/tempo) nos resultados de 2023",
      "Inclua 'Análise de Falhas' na sua experiência atual",
      "Cite 'Gestão de Indicadores' no resumo profissional",
    ],
  } as const;

  return (
    <div className="w-full">
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="lg"
      >
        <Sparkles className="mr-2 h-4 w-4 text-accent" /> Ver exemplo de análise
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl w-[92vw] rounded-2xl p-0 overflow-hidden bg-card text-card-foreground shadow-xl">
          <DialogHeader className="border-b p-5">
            <DialogTitle className="text-xl">Exemplo de Resultado ATS</DialogTitle>
          </DialogHeader>

          <div className="p-5 space-y-5">
            <Card className="shadow-sm rounded-2xl border-0 bg-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Pontuação ATS</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-semibold">{data.nota_final}</span>
                      <span className="text-sm text-muted-foreground">/ 100</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/10 text-success text-xs font-medium px-3 py-1">
                    <BadgeCheck className="h-3.5 w-3.5" /> {data.classificacao}
                  </span>
                </div>
                <div className="mt-3">
                  <Progress value={data.nota_final} className="h-2" />
                  <div className="mt-2 grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/60" />
                      Técnica <span className="font-medium text-foreground">{data.pontuacao_tecnica}/40</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-accent" />
                      Aderência <span className="font-medium text-foreground">{data.pontuacao_aderencia}/60</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <AlertTriangle className="h-4 w-4 text-warning" /> Principais alertas (grátis)
              </div>
              <ul className="list-disc pl-5 text-sm text-foreground space-y-1">
                {data.alertas.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="rounded-2xl shadow-sm border-0">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-foreground mb-2">Keywords presentes</p>
                  <div className="flex flex-wrap gap-2">
                    {data.palavras_chave_ok.map((k) => (
                      <span key={k} className="text-xs rounded-full bg-success/10 text-success px-2.5 py-1">{k}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-2xl shadow-sm border-0">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-foreground mb-2">Keywords ausentes</p>
                  <div className="flex flex-wrap gap-2">
                    {data.palavras_chave_faltando.map((k) => (
                      <span key={k} className="text-xs rounded-full bg-warning/10 text-warning px-2.5 py-1">{k}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-2xl shadow-sm border-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                  <CheckCircle2 className="h-4 w-4 text-accent" /> O seu CV já cobre
                </div>
                <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-foreground list-disc pl-5">
                  {data.responsabilidades_espelhadas.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm border-0 bg-muted">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                  <TrendingUp className="h-4 w-4 text-success" /> Como melhorar (exemplo)
                </div>
                <ol className="list-decimal pl-5 text-sm text-foreground space-y-1">
                  {data.recomendacoes.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ol>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">A versão completa inclui plano de ação detalhado + relatório PDF.</p>
                  <Button onClick={() => setOpen(false)} className="rounded-xl">Começar minha análise</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
