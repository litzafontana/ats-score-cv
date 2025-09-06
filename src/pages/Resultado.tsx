import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScoreProgress } from "@/components/ScoreProgress";
import { ResultadoRobustoAnalise } from "@/components/ResultadoRobustoAnalise";
import { toast } from "@/components/ui/use-toast";
import { AlertTriangle, CheckCircle, Clock, Crown, Lock } from "lucide-react";
import type { ATSRich } from "@/lib/aiSchema";

interface Alerta {
  tipo: "critico" | "importante" | "sugestao";
  titulo: string;
  descricao: string;
  impacto: string;
  sugestao: string;
}

interface DiagnosticoResult {
  id: string;
  email: string;
  nota_ats: number;
  alertas_top2?: Alerta[];
  resumo_rapido?: string;
  resultado_completo?: any;
  json_result_rich?: ATSRich;
  created_at: string;
  pago: boolean;
  upgrade_available?: boolean;
  analises_restantes?: number;
  tipo_analise?: 'robusta_gratuita' | 'basica_limitada';
}

export default function Resultado() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [diagnostico, setDiagnostico] = useState<DiagnosticoResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }
    
    fetchDiagnostico();
  }, [id]);

  const fetchDiagnostico = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `https://hytkdtgndmljgxwuutyu.supabase.co/functions/v1/diagnostico-get?id=${id}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Diagnóstico não encontrado');
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao carregar diagnóstico');
      }

      const result = await response.json();
      setDiagnostico(result);
    } catch (error) {
      console.error('Erro ao buscar diagnóstico:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      toast({
        title: "Erro",
        description: "Não foi possível carregar o diagnóstico.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!diagnostico) return;

    try {
      const response = await fetch(
        'https://hytkdtgndmljgxwuutyu.supabase.co/functions/v1/checkout',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            diagnostico_id: diagnostico.id,
            email: diagnostico.email,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar checkout');
      }

      const result = await response.json();
      
      // Redirect to checkout URL
      window.open(result.checkout_url, '_blank');
      
    } catch (error) {
      console.error('Erro no checkout:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao processar pagamento.",
        variant: "destructive",
      });
    }
  };

  const getAlertIcon = (tipo: string) => {
    switch (tipo) {
      case 'critico':
        return <AlertTriangle className="h-4 w-4 text-danger" />;
      case 'importante':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'sugestao':
        return <CheckCircle className="h-4 w-4 text-success" />;
      default:
        return null;
    }
  };

  const getAlertVariant = (tipo: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (tipo) {
      case 'critico':
        return 'destructive';
      case 'importante':
        return 'default';
      case 'sugestao':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando resultado...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !diagnostico) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-danger mx-auto mb-4" />
              <h1 className="text-xl font-semibold mb-2">Erro ao carregar resultado</h1>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => navigate('/')} variant="outline">
                Voltar ao início
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Resultado da Análise ATS
          </h1>
          <p className="text-muted-foreground">
            Análise realizada em {new Date(diagnostico.created_at).toLocaleDateString('pt-BR')}
          </p>
          {/* Info sobre análises restantes */}
          {!diagnostico.pago && diagnostico.analises_restantes !== undefined && (
            <div className="mt-4 p-3 bg-primary/10 rounded-lg">
              <p className="text-sm font-medium text-primary">
                {diagnostico.analises_restantes > 0 ? (
                  diagnostico.analises_restantes === 1 ? (
                    "✨ Você ainda tem 1 análise robusta gratuita disponível (de 2 no total)."
                  ) : (
                    `✨ Você ainda tem ${diagnostico.analises_restantes} análises robustas gratuitas disponíveis.`
                  )
                ) : (
                  "🔒 Você utilizou suas 2 análises robustas gratuitas. Esta foi uma análise básica."
                )}
              </p>
              {diagnostico.tipo_analise === "basica_limitada" && (
                <p className="text-xs text-muted-foreground mt-1">
                  Para análises robustas completas, considere o upgrade premium.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Score Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                Sua Pontuação ATS
                {diagnostico.tipo_analise === 'basica_limitada' && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    (Análise Básica)
                  </span>
                )}
                {diagnostico.tipo_analise === 'robusta_gratuita' && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    (Análise Robusta - Gratuita)
                  </span>
                )}
                {diagnostico.pago && (
                  <Badge variant="secondary" className="bg-success/10 text-success ml-2">
                    <Crown className="h-3 w-3 mr-1" />
                    Premium
                  </Badge>
                )}
              </span>
            </CardTitle>
            <CardDescription>
            {diagnostico.tipo_analise === 'basica_limitada' && (
    'Pontuação estimada - upgrade para análise detalhada completa'
  )}

  {diagnostico.tipo_analise === 'robusta_gratuita' && (
    'Avaliação detalhada gratuita (até 2 análises disponíveis)'
  )}

  {diagnostico.pago && (
    'Relatório premium com todas as recomendações e detalhes completos'
  )}
</CardDescription>
          </CardHeader>
          <CardContent>
            <ScoreProgress score={diagnostico.nota_ats} />
          </CardContent>
        </Card>

        {/* Alerts Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              {diagnostico.pago ? 'Todos os Alertas' : 'Principais Alertas'}
            </CardTitle>
            <CardDescription>
              {diagnostico.pago 
                ? 'Análise completa dos pontos de atenção identificados'
                : 'Os 2 alertas mais críticos identificados na análise'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {diagnostico.alertas_top2?.map((alerta, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  {getAlertIcon(alerta.tipo)}
                  <Badge variant={getAlertVariant(alerta.tipo)}>
                    {alerta.tipo.toUpperCase()}
                  </Badge>
                  <h3 className="font-semibold text-foreground">
                    {alerta.titulo}
                  </h3>
                </div>
                
                <p className="text-muted-foreground">
                  {alerta.descricao}
                </p>
                
                <div className="bg-muted/50 rounded-md p-3">
                  <p className="text-sm font-medium text-foreground mb-1">
                    Impacto:
                  </p>
                  <p className="text-sm text-muted-foreground mb-2">
                    {alerta.impacto}
                  </p>
                  
                  <p className="text-sm font-medium text-foreground mb-1">
                    Sugestão:
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {alerta.sugestao}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Upgrade Section - só aparece se for análise básica */}
        {diagnostico.tipo_analise === 'basica_limitada' && (
          <Card className="mb-6 border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Desbloqueie a Análise Completa
              </CardTitle>
              <CardDescription>
                Acesse o relatório detalhado com todas as recomendações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground">O que você ganha:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Análise detalhada de todas as seções</li>
                    <li>• Todos os alertas e sugestões</li>
                    <li>• Comparação específica com a vaga</li>
                    <li>• Recomendações personalizadas</li>
                    <li>• Pontuação por categoria</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground">Garantia:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Análise completa em até 5 minutos</li>
                    <li>• Suporte via email</li>
                    <li>• Acesso vitalício ao resultado</li>
                  </ul>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-foreground">R$ 29,90</p>
                  <p className="text-sm text-muted-foreground">Pagamento único</p>
                </div>
                <Button
                  onClick={handleUpgrade}
                  size="lg"
                  className="bg-primary hover:bg-primary/90"
                >
                  Desbloquear Agora
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Full Result Section (if has rich result) */}
        {diagnostico.json_result_rich && (
          <ResultadoRobustoAnalise 
            resultado={diagnostico.json_result_rich}
            diagnosticoId={diagnostico.id}
            isPaid={diagnostico.pago || diagnostico.tipo_analise === 'robusta_gratuita'}
          />
        )}

        {/* Fallback para resultado antigo */}
        {diagnostico.pago && !diagnostico.json_result_rich && diagnostico.resultado_completo && (
          <Card>
            <CardHeader>
              <CardTitle>Análise Completa (Formato Legado)</CardTitle>
              <CardDescription>
                Relatório detalhado com todas as recomendações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap bg-muted/50 p-4 rounded-md text-sm">
                  {JSON.stringify(diagnostico.resultado_completo, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-8 py-6">
          <Button 
            onClick={() => navigate('/')} 
            variant="outline"
          >
            Nova Análise
          </Button>
        </div>
      </div>
    </div>
  );
}
