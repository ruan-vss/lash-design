# Lash SaaS — deploy com Docker

```
lash-saas/
├─ backend/            API Node (Express + PostgreSQL)
├─ frontend/           SPA React (build feito dentro do Docker)
├─ docker-compose.yml  db + api + web(Caddy)
├─ Caddyfile           HTTPS automático, headers de segurança, proxy /api
├─ web.Dockerfile
└─ scripts/            backup.sh, restore.sh
```

## Arquitetura de segurança
- **PostgreSQL só na rede `internal`** (isolada, sem internet e sem porta publicada no host).
- **Só o Caddy expõe portas** (80/443). Site e API no **mesmo domínio** (`/api`): sem CORS, token nunca sai da origem.
- HTTPS automático (Let's Encrypt), HSTS, CSP (inclui `frame-ancestors 'none'`), `no-store` na API.
- API: usuário não-root, filesystem somente leitura, sem capabilities, `TZ=America/Sao_Paulo`, `TRUST_PROXY=1`.

## Primeiro deploy
1. Requisitos: servidor com Docker + Compose, DNS do domínio apontando para ele, portas 80/443 liberadas.
2. `cp .env.example .env` e preencha:
   ```bash
   openssl rand -hex 24   # POSTGRES_PASSWORD
   openssl rand -hex 64   # JWT_SECRET
   openssl rand -hex 64   # CLIENT_LOOKUP_SECRET (valor diferente!)
   ```
   Defina `DOMAIN`, `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` (≥ 12 caracteres).
3. Suba: `docker compose up -d --build`  (as migrações rodam sozinhas na API).
4. Crie a administradora (uma única vez): `docker compose run --rm api node src/database/seed.js`
5. Acesse `https://SEU_DOMINIO/admin/login`, entre e **troque a senha** (é exigido). Depois remova `SEED_ADMIN_PASSWORD` do `.env`.
6. Teste local antes: `DOMAIN=localhost` (certificado interno do Caddy; o navegador pedirá para confiar).

## Operação
| Tarefa | Comando |
|---|---|
| Logs | `docker compose logs -f api` |
| Atualizar versão | `docker compose up -d --build` |
| Backup | `./scripts/backup.sh` (agende no cron, ex.: diário às 3h) |
| Restaurar | `./scripts/restore.sh backups/lash_YYYYMMDD_HHMMSS.sql.gz` |
| Redefinir senha do admin | defina `SEED_ADMIN_*` e rode `docker compose run --rm api node src/database/reset-admin-password.js` |

**Teste a restauração do backup pelo menos uma vez** em outra máquina. Copie os backups para fora do servidor (outro provedor/bucket).

## Roteiro de validação (smoke test automatizado)
Roda ~40 verificações contra uma API real (login, RBAC, reservas, ataque por telefone, limites, máquina de estados, webhook).
**Use um banco de teste**: ele cria dados e consome o rate-limit do seu IP (reinicie a API depois).
```bash
cd backend && npm ci
API_URL=http://localhost:3001/api/v1 \
ADMIN_EMAIL=... ADMIN_PASSWORD=... \
DATABASE_URL=postgresql://... node scripts/smoke.mjs
```

## Checklist manual pós-deploy
- [ ] `https://DOMAIN` abre com cadeado; `http://` redireciona para https
- [ ] `nmap`/`telnet SERVIDOR 5432` → porta fechada
- [ ] Login admin, troca de senha, logout; sessão renova enquanto há atividade
- [ ] Fluxo completo de reserva pública + "Minhas reservas" (código + telefone)
- [ ] Aprovar / concluir / corrigir reserva no painel (admin e recepção)
- [ ] Recuperação de senha chega por e-mail (se configurado)
- [ ] WhatsApp: webhook da Meta verificado com `WHATSAPP_VERIFY_TOKEN`; `WHATSAPP_APP_SECRET` definido
- [ ] Backup gerado e restaurado com sucesso em ambiente de teste
- [ ] Teste em https://securityheaders.com e https://www.ssllabs.com/ssltest/

## Limitações conhecidas
Telefone da cliente não é verificado por código (WhatsApp/SMS); sem CAPTCHA; limites de taxa em memória (1 instância da API); token do admin em `localStorage`.
