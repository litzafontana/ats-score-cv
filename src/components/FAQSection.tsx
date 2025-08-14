import { ChevronDown, HelpCircle } from "lucide-react";
import { useState } from "react";

const faqs = [
  {
    pergunta: "O que é ATS e por que ele pode barrar meu currículo?",
    resposta:
      "ATS (Applicant Tracking System) é um 'robô' usado pela maioria das empresas para filtrar currículos antes que um recrutador humano veja. Se o documento não estiver no formato certo ou não tiver as palavras-chave da vaga, ele pode ser automaticamente descartado — mesmo que você seja qualificado.",
  },
  {
    pergunta: "Como o ATS aumenta minhas chances de entrevista?",
    resposta:
      "Um currículo otimizado para ATS utiliza palavras-chave e estrutura que a máquina entende, garantindo que seu perfil seja classificado como relevante. Isso aumenta muito a probabilidade de ser chamado para entrevistas.",
  },
  {
    pergunta: "Por que muitos currículos são reprovados sem o candidato saber?",
    resposta:
      "Aproximadamente 70% dos currículos são eliminados por erros de formatação, ausência de palavras-chave e dados incompletos. Nosso diagnóstico identifica esses pontos e orienta como corrigir para passar pelo filtro.",
  },
  {
    pergunta: "O que está incluso no relatório completo?",
    resposta:
      "Você recebe sua pontuação detalhada, os principais erros técnicos, todas as palavras-chave que faltam, recomendações práticas e, se desejar, um currículo reescrito para maximizar sua compatibilidade.",
  },
  {
    pergunta: "Meu currículo pode ser adaptado para diferentes vagas?",
    resposta:
      "Sim! Ajustar palavras-chave e experiências de acordo com cada vaga aumenta a pontuação no ATS e destaca seu perfil para o recrutador certo.",
  },
  {
    pergunta: "Quanto tempo leva para receber meu relatório?",
    resposta:
      "Nosso diagnóstico é gerado em segundos, e o relatório completo é enviado rapidamente após a confirmação do pagamento.",
  }
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="bg-slate-50 py-12 px-4 sm:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <HelpCircle className="h-6 w-6 text-sky-600" />
          <h2 className="text-2xl font-bold text-slate-800">Perguntas Frequentes</h2>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <button
                className="w-full flex justify-between items-center p-4 text-left font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
              >
                {faq.pergunta}
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${openIndex === idx ? "rotate-180" : ""}`}
                />
              </button>
              {openIndex === idx && (
                <div className="px-4 pb-4 text-sm text-slate-600 border-t animate-fadeIn">
                  {faq.resposta}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}