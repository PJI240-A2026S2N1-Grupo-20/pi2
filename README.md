# EletroKanban: Sistema de Gestão de Negociações (v1.0.0)

Aplicação web destinada ao gerenciamento de negociações, vendas, orçamentos e atividades do setor comercial com abordagem para dispositivos móveis, desenvolvida para o Projeto Integrador Univesp.
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

## Redefinição de Senha

A redefinição de senhas de usuários é realizada exclusivamente pela interface administrativa do Django, em `http://<IP_DO_SERVIDOR>:8000/admin/`, acessível apenas por administradores. Não há autoatendimento de redefinição no frontend da aplicação.

## Novidades na versao 1.0.0

- **RF-31 - Dashboard de metricas operacionais:** painel com total de tarefas por colecao, taxa de conclusao, tempo medio de ciclo e volume de tarefas atrasadas, com filtro de periodo (7, 30 ou 90 dias, ou todo o historico).
- **RF-32 - Exportacao de dados em CSV:** exportacao das tarefas e do historico de transicoes, respeitando o periodo selecionado. Os arquivos usam separador ponto e virgula e BOM UTF-8, permitindo abertura direta no Microsoft Excel.
- **Ajustes de interface:** navegacao por abas entre o quadro e o painel de metricas, e correcoes de acentuacao em mensagens de feedback e nos titulos das colecoes.
