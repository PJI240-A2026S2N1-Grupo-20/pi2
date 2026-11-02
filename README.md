# EletroKanban — Sistema de Gestão de Negociações (v0.4.7)

Aplicação web destinada ao gerenciamento de negociações, vendas, orçamentos e atividades do setor comercial com abordagem para dispositivos móveis, desenvolvida para o Projeto Integrador Univesp.
7
## Tecnologias Utilizadas
- **Backend:** Django 6.1.1, Django REST Framework, drf-spectacular (OpenAPI/Swagger)
- **Frontend:** React 18+ (Vite), Axios, React Router DOM, Lucide React, Vitest, React Testing Library
- **Banco de Dados:** PostgreSQL 18.6 (Docker Compose)

## Como Executar

```bash
# 1. Subir o contêiner do banco PostgreSQL
docker compose up -d

# 2. Configurar o ambiente virtual Python
source venv/bin/activate
pip install -r backend/requirements.txt

# 3. Rodar as migrações do backend
python backend/manage.py migrate

# 4. Iniciar o servidor backend
python backend/manage.py runserver 0.0.0.0:8000

# 5. Em outro terminal, iniciar o frontend
cd frontend
npm install
npm run dev
```

## Como Executar os Testes

```bash
# Testes do Backend (Django)
python backend/manage.py test accounts kanban

# Testes do Frontend (Vitest)
cd frontend
npm run test
```

## Documentação da API
Acesse `<IP_DO_SERVIDOR>:8000/api/docs/` no navegador para visualizar a documentação interativa Swagger/OpenAPI.
