# Assistec Pro

Sistema desktop de gestão para assistência técnica de celulares: ordens de serviço, orçamentos, clientes, estoque de peças, serviços, impressão de cupom na **Elgin i9**, etiquetas de produtos e documentos em PDF.

Feito com **Electron + React + TypeScript + Vite**. Funciona 100% offline — os dados ficam no próprio computador.

---

## Como rodar

Pré-requisito: [Node.js 20 ou superior](https://nodejs.org).

```bash
npm install
npm run dev          # abre o app desktop
```

Primeiro acesso: usuário **admin** / senha **admin** (o sistema pede para trocar a senha).
No painel inicial há o botão **Carregar demonstração** para popular o sistema com dados de exemplo.

### Gerar o instalador para Windows

```bash
npm run dist
```

O instalador (`.exe`) e a versão portátil ficam na pasta `release/`. Rode esse comando em uma máquina Windows.

### Rodar só a interface no navegador (para testes)

```bash
npm run dev:web
```

Nesse modo os dados ficam no navegador e a impressão usa a janela padrão do navegador.

---

## Funcionalidades

**Ordens de serviço**
- Numeração sequencial configurável (prefixo e número inicial)
- Cliente, aparelho (tipo, marca, modelo, IMEI com validação, série, cor, acessórios, estado físico)
- Senha do aparelho: PIN, senha ou **desenho do padrão Android** (captura clicando nos pontos)
- Checklist de entrada personalizável (OK / defeito / não testado)
- Defeito relatado, diagnóstico e laudo técnico
- Peças do estoque, serviços do catálogo e itens avulsos; desconto; custo e lucro estimado
- 9 status (aberta → em análise → aguardando aprovação → aprovada → aguardando peça → em reparo → pronta → entregue / cancelada) com **histórico** de quem alterou e quando
- Prioridade, técnico responsável, previsão de entrega, alerta de atraso
- Pagamentos parciais com várias formas de pagamento e saldo a receber
- Garantia com data final calculada na entrega
- **Baixa automática de estoque** na entrega (e estorno se a OS for reaberta ou cancelada)

**Orçamentos** — itens, desconto, validade, status e **conversão em OS** com um clique.

**Clientes** — pessoa física/jurídica, CPF/CNPJ com validação, RG/IE, nascimento, telefone, WhatsApp, e-mail, endereço com **busca automática de CEP** (ViaCEP) e observações.

**Peças & produtos** — código interno automático, código de barras (EAN), categoria, marca, modelos compatíveis, custo, venda, margem, estoque mínimo com alerta, localização e fornecedor.

**Serviços** — catálogo de mão de obra com preço, tempo estimado e garantia.

**Painel** — OS em andamento, prontas, atrasadas, faturamento do mês, ticket médio, gráfico dos últimos 6 meses, OS por status e estoque baixo.

## Impressão

| Documento | Onde imprime | Observação |
|---|---|---|
| Cupom da OS (via cliente + via loja) | Térmica (Elgin i9 80mm/58mm) | Senha do aparelho só na via da loja; QR Code de acompanhamento na via do cliente |
| Cupom do orçamento | Térmica | |
| OS / orçamento completo | A4 ou **PDF** | Com logo, termos, QR Code e campos de assinatura |
| Etiqueta do aparelho | Térmica ou etiquetadora | Nº da OS, cliente, aparelho, defeito, código de barras |
| Etiquetas de produtos | Térmica ou etiquetadora | Nome, preço, código e código de barras |

**Impressão das 2 vias em partes** — em *Configurações → Ordens* você escolhe como imprimir cliente + loja:
- **Juntas** — uma tira só, com linha de corte no meio;
- **Páginas separadas** — cada via em uma página, para a **guilhotina da Elgin i9 cortar entre elas**;
- **Impressões separadas** — cada via é um trabalho de impressão independente.

No menu *Imprimir* da OS também dá para imprimir **só a via do cliente** ou **só a via da loja**.

Tudo é configurável em **Configurações**:

- **Impressoras**: perfis com impressora do Windows, largura/altura do papel, margem, fonte, cópias, logo e impressão direta (sem diálogo). Perfis prontos: Elgin i9 80mm, térmica 58mm, A4, etiquetadora 40×25 e 50×30. Botão de **página de teste**.
- **Uso padrão**: qual perfil cada documento usa.
- **Etiquetas**: tamanho, colunas, espaçamento, campos visíveis, tamanho das fontes, altura do código de barras, borda, linha de corte — com **pré-visualização ao vivo**.

### Configurando a Elgin i9

1. Instale o driver da Elgin i9 no Windows.
2. Em *Preferências de impressão* da impressora, ajuste o papel para 80mm (ou 58mm).
3. No app: **Configurações → Impressoras**, selecione a impressora na lista (o nome deve ser igual ao do Windows).
4. Clique em **Imprimir página de teste**. Se o texto cortar nas laterais, aumente a margem.
5. Opcional: ative **Impressão direta** para imprimir sem abrir a janela do Windows.

## Limpeza Android (adware/bloatware via USB)

Aba **Limpeza Android**. Com o aparelho do cliente conectado por USB e com a Depuração USB autorizada, o sistema usa o **ADB** para fazer uma limpeza honesta — não é um "antivírus" que inventa ameaças:

1. **Escaneia** os apps instalados e destaca os suspeitos com o **motivo real**: app sem ícone (oculto), origem desconhecida (fora da loja), pode exibir sobreposição/anúncios, usa acessibilidade, é administrador do dispositivo, ou está na sua lista de adware conhecido.
2. Mostra a **contagem real** de apps sinalizados por nível de risco (nenhum número falso).
3. **Remove** (para o usuário, de forma reversível) ou **desativa** os apps que você confirmar — nada é removido automaticamente.
4. **Blinda** o aparelho: bloqueia sobreposição dos apps suspeitos e a instalação de fontes desconhecidas, dificultando a reinfecção.

Tudo é configurável em *Configurações → Limpeza Android* (caminho do ADB, critérios de detecção, lista de adware e instaladores confiáveis).

**Requisitos / testes:** precisa do **ADB (Android Platform Tools)** instalado no Windows. Como depende de um aparelho real, essa função deve ser testada com um celular conectado. Sem aparelho, use o **modo demonstração** para conhecer a tela. Os comandos usados (`pm`, `appops`, `dumpsys`) são os padrões de administração do Android.

## Acompanhamento do cliente (QR Code em tempo real)

Cada ordem de serviço pode gerar um **QR Code na via do cliente**. Ao escanear, o cliente abre uma **página web** que mostra o status do aparelho em tempo real (“Em manutenção”, “Pronto para retirada” etc.), atualizado automaticamente toda vez que você muda o status no sistema.

A página é **totalmente personalizável** em *Configurações → Acompanhamento do cliente*: título, subtítulo, cor do tema, o que mostrar (aparelho, previsão, contato) e o texto/cor de cada status. Status marcados como ocultos aparecem só como “Em atendimento”, sem expor dados internos. **Nunca** são enviados senha do aparelho, valores ou CPF.

Para funcionar “de qualquer lugar”, há um pequeno servidor na pasta [`status-server/`](status-server/README.md) — sem dependências, pronto para publicar no Render, Railway, Fly.io ou numa VPS. Depois é só informar a URL e a chave de API nas configurações. Veja o README da pasta para o passo a passo. **Esta função precisa ser testada após publicar o servidor.**

## Personalização

- **Empresa**: razão social, nome fantasia, CNPJ, IE, IM, contatos, endereço, logo e mensagem de rodapé
- **Aparência**: tema escuro/claro/sistema, cor principal, densidade e arredondamento
- **Ordens**: prefixos, numeração inicial, garantia e prazo padrão, validade do orçamento, termos da OS e do orçamento, itens do checklist, formas de pagamento, tipos de aparelho e categorias de peças
- **Usuários**: administrador, técnico e atendente (só administradores acessam as configurações)
- **Backup**: backup automático diário (30 dias), exportar/restaurar backup em JSON

---

## Arquitetura

```
electron/            Processo principal (Node)
  main.ts            Janela, instância única, IPC
  preload.ts         Ponte segura (contextIsolation) — a interface não acessa o Node
  storage.ts         Persistência em JSON: escrita atômica + backup diário
  printing.ts        Impressão silenciosa/térmica e geração de PDF
  adb.ts             Integração com o ADB (limpeza Android via USB)

status-server/       Servidor do acompanhamento por QR Code (Node puro, para publicar)

src/
  domain/            Tipos e regras padrão (sem dependência de UI)
  services/          Regras de negócio: OS, orçamentos, catálogo, autenticação, backup
  data/store.ts      Repositório central observável (useSyncExternalStore)
  infra/platform.ts  Adapters: Electron ⇄ navegador (storage, impressão, CEP)
  print/             Templates HTML de impressão (cupom, A4, etiquetas) e código de barras
  components/        Design system (ui/), feedback, impressão e componentes compartilhados
  features/          Telas organizadas por domínio (orders, quotes, customers, parts...)
  lib/               Formatação, máscaras, validação (CPF, CNPJ, IMEI), criptografia
```

Boas práticas aplicadas:

- **TypeScript estrito** em todo o projeto
- **Separação em camadas**: domínio → serviços → dados → interface
- **Padrão Adapter** para rodar no Electron ou no navegador sem mudar o código das telas
- **Segurança**: `contextIsolation`, sem `nodeIntegration`, chaves de armazenamento validadas, senhas com **PBKDF2-SHA256** + salt
- **Integridade dos dados**: escrita atômica, backup diário automático, migração de configurações por *deep merge*
- **Validações** de domínio (CPF, CNPJ, IMEI/Luhn, e-mail, duplicidade de documento/código)
- Design system com tokens CSS (tema, cor, densidade e raio configuráveis em tempo real)

## Onde ficam os dados

`%APPDATA%/Assistec Pro/dados/` — um arquivo JSON por coleção e a pasta `backups/` com cópias diárias. Também é possível abrir a pasta em **Configurações → Backup & dados**.
