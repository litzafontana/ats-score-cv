FROM python:3.11-slim

WORKDIR /app

# Instalar dependências do sistema para PyMuPDF
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código da aplicação
COPY app.py .

# Expor porta
EXPOSE 8000

# Variável de ambiente para porta (usada por Render, Cloud Run, etc)
ENV PORT=8000

# Comando para iniciar
CMD ["python", "app.py"]
