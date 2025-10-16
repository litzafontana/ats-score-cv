from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import fitz  # PyMuPDF
import uvicorn
import os

app = FastAPI(title="PDF Text Extractor", version="1.0.0")

# CORS para permitir chamadas do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especificar domínios
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "pdf-extractor", "version": "1.0.0"}

@app.post("/extract")
async def extract_pdf(file: UploadFile = File(...)):
    """
    Extrai texto de PDF usando PyMuPDF (fitz).
    
    Funciona com:
    - PDFs normais (Word, Google Docs)
    - PDFs do Figma (com fontes custom)
    - PDFs com subset fonts
    
    Retorna erro se:
    - Não for PDF
    - Texto extraído < 50 caracteres (possível PDF escaneado)
    """
    
    # Validar tipo de arquivo
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=415,
            detail="Apenas arquivos PDF são suportados"
        )
    
    try:
        # Ler arquivo
        data = await file.read()
        
        if len(data) < 100:
            raise HTTPException(
                status_code=422,
                detail="Arquivo PDF muito pequeno ou corrompido"
            )
        
        # Abrir PDF com PyMuPDF
        doc = fitz.open(stream=data, filetype="pdf")
        
        # Extrair texto de todas as páginas
        parts = []
        for page_num in range(doc.page_count):
            page = doc[page_num]
            text = page.get_text("text") or ""
            parts.append(text)
        
        # Juntar e normalizar
        full_text = "\n".join(parts).strip()
        
        # Normalizar espaços e quebras de linha
        normalized = (
            full_text
            .replace("\r\n", "\n")
            .replace("\r", "\n")
        )
        
        # Contar caracteres úteis (sem espaços/quebras)
        useful_chars = len(normalized.replace(" ", "").replace("\n", ""))
        
        # Validar texto extraído
        if useful_chars < 50:
            raise HTTPException(
                status_code=422,
                detail="Texto insuficiente extraído. PDF pode estar escaneado ou corrompido. "
                       "Tente exportar como PDF/A ou cole o texto manualmente."
            )
        
        return JSONResponse({
            "text": normalized,
            "chars": len(normalized),
            "useful_chars": useful_chars,
            "pages": doc.page_count,
            "filename": file.filename
        })
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erro ao processar PDF: {str(e)}")
        raise HTTPException(
            status_code=422,
            detail=f"Falha ao processar PDF: {str(e)}"
        )

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
