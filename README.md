# EletroKanban: Sistema de Gestão de Negociações (v1.3.1)

Aplicação web destinada ao gerenciamento de negociações, vendas, orçamentos e atividades do setor comercial com abordagem para dispositivos móveis, desenvolvida para o Projeto Integrador Univesp.

## Tecnologias Utilizadas

- **Backend:** Django 6.1.1, Django REST Framework, drf-spectacular (OpenAPI/Swagger), Gunicorn
- **Frontend:** React 18+ (Vite), Axios, React Router DOM, Lucide React, Vitest, React Testing Library
- **Banco de Dados:** PostgreSQL 18.6
- **Infraestrutura:** Docker e Docker Compose (backend, frontend e banco empacotados em imagens)

## Requisitos

- Docker Engine 24 ou superior
- Docker Compose v2 (plugin integrado ao `docker`, comando `docker compose`)
- Cerca de 2 GB de espaço em disco para as imagens

## Como Executar

### 1. Configurar as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` e ajuste pelo menos:

- `DJANGO_SECRET_KEY`: gere com `python3 -c "import secrets; print(secrets.token_urlsafe(50))"`
- `POSTGRES_PASSWORD`: defina uma senha forte
- `DJANGO_ALLOWED_HOSTS`: use `*` para acesso em rede local ou informe o domínio público
- `DJANGO_CORS_ALLOWED_ORIGINS` e `DJANGO_CSRF_TRUSTED_ORIGINS`: informe a URL de acesso (ex.: `http://IP_DO_HOST:8080`)

### 2. Construir todas as imagens

```bash
docker compose --profile test build
```

O `--profile test` também constrói as imagens usadas na execução dos testes. Se você não pretende rodar testes, `docker compose build` (sem o profile) é suficiente.

Para ignorar o cache de camadas e garantir uma reconstrução do zero:

```bash
docker compose --profile test build --no-cache
```

### 3. Subir a stack

```bash
docker compose up -d
```

O backend aguarda o PostgreSQL ficar disponível, aplica as migrações, coleta os arquivos estáticos e inicia o Gunicorn. O frontend é servido pelo Nginx, que também faz proxy reverso para a API.

Aguarde o healthcheck dos serviços:

```bash
docker compose ps
```

Os três serviços (`eletrokanban_db`, `eletrokanban_backend`, `eletrokanban_frontend`) devem aparecer como `Up ... (healthy)` em cerca de 30 a 40 segundos.

### 4. Criar o usuário administrador

```bash
docker compose exec backend python manage.py createsuperuser
```

O `createsuperuser` cria o usuário com `papel='administrador'` automaticamente, o que libera o botão **Fluxos** e a reatribuição de responsáveis na interface.

Se preferir criar sem interação:

```bash
docker compose exec \
  -e DJANGO_SUPERUSER_USERNAME=admin \
  -e DJANGO_SUPERUSER_EMAIL=admin@local \
  -e DJANGO_SUPERUSER_PASSWORD=senha_forte_aqui \
  backend python manage.py createsuperuser --noinput
```

### 5. Acessar

- **Frontend:** `http://localhost:8080` (ou `http://IP_DO_HOST:8080` em rede local)
- **Admin do Django:** `http://localhost:8080/admin/`
- **Swagger (documentação da API):** `http://localhost:8080/api/docs/`

## Como Executar os Testes (opcional)

Os testes rodam isolados em containers próprios, usando um banco temporário (`test_eletrokanban`) criado e destruído automaticamente. Nenhum dado do ambiente de desenvolvimento é afetado.

Pré-requisito: o PostgreSQL precisa estar em execução.

```bash
docker compose up -d postgres
```

### Backend (Django)

```bash
docker compose --profile test run --rm backend-test
```

Saída esperada ao final: `Ran 60 tests in ... OK`.

### Frontend (Vitest)

```bash
docker compose --profile test run --rm frontend-test
```

Saída esperada: `Tests 90 passed (90)`.

### Executar as duas suítes em sequência

```bash
docker compose --profile test run --rm backend-test \
  && docker compose --profile test run --rm frontend-test
```

## Comandos Úteis

| Ação | Comando |
|---|---|
| Ver o status dos containers | `docker compose ps` |
| Acompanhar os logs do backend | `docker compose logs -f backend` |
| Acompanhar os logs do frontend | `docker compose logs -f frontend` |
| Reiniciar um serviço | `docker compose restart backend` |
| Aplicar migrações manualmente | `docker compose exec backend python manage.py migrate` |
| Abrir o shell do Django | `docker compose exec backend python manage.py shell` |
| Parar a stack (mantém volumes) | `docker compose down` |
| Parar a stack e apagar volumes (banco e anexos) | `docker compose down -v` |
| Parar, apagar volumes e imagens do projeto | `docker compose down -v --rmi local --remove-orphans` |

Atenção: `docker compose down -v` apaga o banco de dados (`postgres_data`), os anexos PDF (`media_data`) e os estáticos (`static_data`). Use apenas quando quiser recriar o ambiente do zero.

## Como Executar sem Docker (desenvolvimento local)

Para desenvolvimento fora de containers, com recarregamento automático do Django e do Vite:

```bash
# 1. Subir apenas o banco
docker compose up -d postgres

# 2. Configurar o ambiente virtual Python
source venv/bin/activate
pip install -r backend/requirements.txt

# 3. Aplicar as migrações
python backend/manage.py migrate

# 4. Iniciar o servidor backend
python backend/manage.py runserver 0.0.0.0:8000

# 5. Em outro terminal, iniciar o frontend
cd frontend
npm install
npm run dev
```

Nesse modo, o frontend fica em `http://localhost:5173` e faz proxy para `http://localhost:8000` via Vite.

## Documentação da API

A documentação interativa Swagger/OpenAPI fica pública em `http://IP_DO_SERVIDOR:8080/api/docs/`. A especificação em formato OpenAPI está em `http://IP_DO_SERVIDOR:8080/api/schema/`.

## Redefinição de Senha

A redefinição de senhas de usuários é realizada exclusivamente pela interface administrativa do Django, em `http://IP_DO_SERVIDOR:8080/admin/`, acessível apenas a administradores. Não há autoatendimento de redefinição no frontend da aplicação.
