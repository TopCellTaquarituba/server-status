# Servidor de acompanhamento — Assistec Pro

Este é o pequeno servidor que recebe os status das ordens de serviço e mostra a
página que o cliente abre pelo QR Code. Não tem dependências — roda com Node.js puro.

## Como funciona

```
App desktop  ──POST /api/os/{token}──▶  este servidor  ──GET /s/{token}──▶  celular do cliente
 (status)        (com a chave de API)       (guarda)         (página web)
```

## Rodar localmente (teste)

```bash
cd status-server
API_KEY=minhachave node server.js
# abre em http://localhost:8787
```

## Publicar na internet (produção)

Funciona em qualquer hospedagem Node. As mais simples e com plano gratuito:

- **Render.com**: New → Web Service → aponte para esta pasta → Build: *(vazio)* → Start: `node server.js` → adicione a variável `API_KEY`.
- **Railway.app** ou **Fly.io**: mesma ideia; use o `Dockerfile` incluso.
- **VPS própria**: `API_KEY=... node server.js` atrás de um Nginx com HTTPS, ou use `pm2`.

Depois de publicado, você terá uma URL como `https://status-minhaloja.onrender.com`.

## Configurar no app

Em **Configurações → Acompanhamento do cliente**:

1. Ative o acompanhamento.
2. **URL do servidor**: a URL pública acima.
3. **Chave de API**: a MESMA definida na variável `API_KEY` do servidor.
4. Clique em **Testar conexão**.

Pronto — a partir daí, cada OS com acompanhamento ativo recebe um QR Code na via do
cliente, e o status é atualizado automaticamente toda vez que você muda o status no sistema.

## Variáveis de ambiente

| Variável | Para que serve | Padrão |
|---|---|---|
| `PORT` | Porta do servidor | `8787` |
| `API_KEY` | Chave secreta de publicação (igual à do app) | — (defina!) |
| `DATA_FILE` | Arquivo onde os status são guardados | `./data/status.json` |

## Rotas

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/health` | Verifica se está no ar |
| POST | `/api/os/:token` | App publica o status (requer `x-api-key`) |
| DELETE | `/api/os/:token` | Remove o status (requer `x-api-key`) |
| GET | `/api/public/:token` | Dados públicos do status (sem dados sensíveis) |
| GET | `/s/:token` | Página de acompanhamento do cliente |

## Privacidade

O app envia apenas o necessário para o cliente acompanhar: número da OS, status,
mensagem, aparelho (se habilitado) e previsão. **Nunca** envia senha do aparelho,
valores, CPF ou dados internos. Status marcados como "ocultos" aparecem apenas como
"Em atendimento".
