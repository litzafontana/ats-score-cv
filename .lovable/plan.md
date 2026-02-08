
# Plano: Corrigir Problemas de Extração de PDF/DOCX

## Resumo do Problema

Os logs mostram que a extração de texto de PDFs e DOCX está falhando por múltiplos motivos:

1. **PDFs escaneados**: Arquivos PDF que são apenas imagens (criados por scanner) não têm texto selecionável
2. **Fallback pdf-parse quebrado**: O pacote `npm:pdf-parse@1.2.0` não funciona no runtime Deno do Supabase Edge Functions
3. **Extração DOCX vazia**: O mammoth está extraindo 0 caracteres de arquivos DOCX de 2MB
4. **Mensagens de erro pouco claras**: Usuários não sabem exatamente o que fazer

---

## Solução Proposta

### Etapa 1: Corrigir o Fallback de PDF no Backend

Remover a dependência quebrada `pdf-parse@1.2.0` e melhorar a extração com `pdfjs-dist`:

```text
Arquivo: supabase/functions/extract-cv/index.ts

Mudanças:
- Remover import de pdf-parse (linha 242) que causa erro
- Melhorar configuração do pdfjs-dist para PDFs com fontes custom
- Adicionar detecção mais precisa de PDF escaneado vs encoding issue
- Melhorar logs de diagnóstico
```

### Etapa 2: Corrigir Extração DOCX

O problema com mammoth pode ser relacionado ao formato do buffer. Corrigir:

```text
Arquivo: supabase/functions/extract-cv/index.ts

Mudanças:
- Usar Buffer.from() ao invés de Uint8Array para mammoth
- Adicionar opções de extração mais robustas
- Melhorar detecção de DOCX corrompido
```

### Etapa 3: Melhorar UX de Erros no Frontend

Tornar as mensagens de erro mais claras e acionáveis:

```text
Arquivo: src/components/DiagnosticForm.tsx

Mudanças:
- Adicionar tratamento específico para erro de DOCX
- Melhorar instruções para cada tipo de erro
- Mostrar botão direto para mudar para modo texto
```

### Etapa 4: Adicionar OCR para PDFs Escaneados (Opcional)

Integrar OCR via OpenAI Vision API (já tem a chave configurada):

```text
Arquivo: supabase/functions/extract-cv/index.ts

Mudanças:
- Detectar PDF escaneado (arquivo grande, 0 texto)
- Converter primeira página para imagem
- Enviar para OpenAI Vision API para extrair texto
- Cobrar como "extração premium" ou incluir nas 2 análises gratuitas
```

---

## Detalhes Técnicos

### 1. Correção do Fallback PDF

O erro nos logs:
```
Could not find constraint 'pdf-parse@1.2.0' in the list of packages
```

Indica que o pacote npm não está disponível no runtime Deno. A solução é remover esse fallback e confiar apenas no `pdfjs-dist`, que já funciona.

### 2. Correção DOCX

Os logs mostram:
```
✅ DOCX extraído: 0 caracteres
```

O problema pode ser:
- Buffer passado incorretamente para mammoth
- DOCX com estrutura não-padrão (criado por ferramenta como Canva)

Solução: Converter ArrayBuffer para Buffer do Node antes de passar para mammoth.

### 3. Fluxo de OCR (se implementado)

```
┌─────────────────┐
│ Upload PDF      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Tentar pdfjs    │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Texto?  │
    └────┬────┘
    Sim  │  Não
    ▼    │    ▼
┌───────┐  ┌──────────────┐
│ Usar  │  │ Detectar     │
│ texto │  │ escaneado    │
└───────┘  └──────┬───────┘
                  │
           ┌──────┴──────┐
           │ Usar OCR    │
           │ (OpenAI)    │
           └─────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Tipo de Mudança |
|---------|-----------------|
| `supabase/functions/extract-cv/index.ts` | Remover pdf-parse, corrigir mammoth, adicionar OCR |
| `src/components/DiagnosticForm.tsx` | Melhorar mensagens de erro |

---

## Prioridade de Implementação

1. **Alta**: Corrigir pdf-parse quebrado (remover fallback morto)
2. **Alta**: Corrigir extração DOCX com mammoth
3. **Média**: Melhorar UX de erros no frontend
4. **Baixa**: Adicionar OCR para PDFs escaneados (requer mais tokens OpenAI)

---

## Riscos e Considerações

- **OCR via OpenAI**: Custa mais tokens (~750 tokens por página de CV)
- **PDFs do Figma/Canva**: Podem ter fontes custom que dificultam extração
- **DOCX do Google Docs**: Pode ter estrutura diferente do Word padrão

A solução mais robusta é sempre oferecer a opção de colar texto manualmente como fallback final, que já está implementada.
