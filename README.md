# EletroKanban — Sistema de Gestão de Negociações (v0.1.0)

Aplicação web destinada ao gerenciamento de negociações, vendas, orçamentos e atividades do setor comercial com abordagem para dispositivos móveis, desenvolvida para o Projeto Integrador Univesp.

## Tecnologias Utilizadas
- **Backend:** Django 6.1.1, Django REST Framework, drf-spectacular (OpenAPI/Swagger)
- **Frontend:** React 18+ (Vite), Axios, React Router DOM, Lucide React
- **Banco de Dados:** PostgreSQL 18.6 (Docker Compose)

## Como Executar

```bash
# 1. Subir o contêiner do banco PostgreSQL
docker compose up -d

# 2. Configurar o ambiente virtual Python
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

# 3. Rodar as migrações do banco de dados
python backend/manage.py migrate

# 4. Iniciar o backend
python backend/manage.py runserver

# 5. Em outro terminal, iniciar o frontend
cd frontend
npm install
npm run dev
```

## Documentação da API
Acesse `/api/docs/` no navegador para visualizar a documentação interativa Swagger/OpenAPI.
