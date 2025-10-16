# PDF Text Extractor (PyMuPDF)

Microserviço FastAPI para extrair texto de PDFs, incluindo PDFs do Figma com fontes custom que o pdf.js não consegue processar.

## 🚀 Deploy Rápido

### Opção 1: Render.com (Recomendado - Free Tier)

1. Criar conta em [render.com](https://render.com)
2. New > Web Service
3. Conectar este repositório
4. Configurações:
   - **Runtime**: Docker
   - **Region**: Escolher mais próximo
   - **Instance Type**: Free
5. Deploy!

URL exemplo: `https://pdf-extractor-xyz.onrender.com`

### Opção 2: Google Cloud Run

```bash
# Autenticar
gcloud auth login

# Build e deploy
gcloud run deploy pdf-extractor \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Opção 3: Local (Docker)

```bash
# Build
docker build -t pdf-extractor .

# Run
docker run -p 8000:8000 pdf-extractor

# Testar
curl http://localhost:8000/
```

## 📡 API

### Health Check
```bash
GET /
```

Resposta:
```json
{
  "status": "ok",
  "service": "pdf-extractor",
  "version": "1.0.0"
}
```

### Extrair Texto
```bash
POST /extract
Content-Type: multipart/form-data

file: <arquivo.pdf>
```

Resposta de sucesso (200):
```json
{
  "text": "Texto extraído do PDF...",
  "chars": 5234,
  "useful_chars": 4521,
  "pages": 3,
  "filename": "curriculo.pdf"
}
```

Erros:
- `415`: Arquivo não é PDF
- `422`: Texto insuficiente (< 50 chars) ou PDF corrompido

## 🧪 Testar localmente

```bash
# Instalar dependências
pip install -r requirements.txt

# Rodar
python app.py

# Testar em outro terminal
curl -X POST http://localhost:8000/extract \
  -F "file=@/caminho/para/teste.pdf"
```

## 🔧 Variáveis de Ambiente

- `PORT`: Porta do servidor (padrão: 8000)

## 📦 Dependências

- **FastAPI**: Framework web assíncrono
- **PyMuPDF (fitz)**: Extração robusta de texto de PDFs
- **uvicorn**: Servidor ASGI

## 🎯 Vantagens sobre pdf.js

- ✅ Extrai texto de PDFs do Figma
- ✅ Suporta subset fonts e fontes custom
- ✅ Funciona com PDFs complexos que pdf.js falha
- ✅ Mais robusto para PDFs gerados por diferentes ferramentas

## 📝 Notas

- Para PDFs escaneados (imagens), retorna erro `422`
- Futura melhoria: adicionar OCR (pytesseract) para PDFs escaneados
