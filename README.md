# Gineco-AI (versão própria, sem Base44)

Assistente para protocolos de ginecologia e obstetrícia, adaptado do export
do Base44 para hospedagem própria. Frontend React + Vite + Tailwind, backend
próprio em Node sem dependências (`server.mjs`) servindo o build e a API.

## O que funciona

- Início, Protocolos, Calculadoras (DUM, USG, peso fetal Hadlock, Bishop),
  Busca Inteligente, Publicidade, Histórico e Créditos, tudo em pt-BR.
- Análise de caso clínico (desde 2026-10-28, módulo novo, código próprio):
  profissional logado descreve um caso anonimizado e recebe hipóteses
  ranqueadas com a favor e contra, sinais de alerta, exames sugeridos
  (com "se indicado"), conduta em passos e referências, em abas
  Hipóteses, Exames, Conduta e Referências, com histórico próprio e
  favoritos. A prescrição, quando aparece, é só rascunho para revisão e
  assinatura. Sem chave do Gemini, nenhuma análise é inventada. O caso
  nunca deve ter nome, CPF, endereço ou qualquer identificador.
- Login local com e-mail e senha (scrypt, token aleatório). Contas de
  administrador na interface: rlambaia@yahoo.com e rlambaia2023@gmail.com.
- Protocolos, propagandas (limite de 3 por dia por conta) e histórico salvos
  no servidor, com upload de imagem/PDF para `/uploads/`.
- Busca por IA: só Gemini, sem OpenAI. Com `GEMINI_API_KEY` configurada, usa o Gemini (Google AI Studio, grátis) pela base compatível com OpenAI do Gemini.
  Sem a chave, a busca não inventa resposta clínica: valida o escopo por
  palavras-chave e devolve um aviso honesto com as fontes oficiais
  (FEBRASGO, ACOG, OMS, PubMed). A geração de imagem sem chave devolve uma
  imagem genérica local.

## O que mudou em relação ao Base44 (e por quê)

- Login com Google e verificação por código de e-mail foram removidos: não
  existem mais sem o backend do Base44. O cadastro já ativa a conta na hora.
- Redefinição de senha por e-mail ainda não está ativa (não há envio de
  e-mail configurado). A página "Esqueceu a senha?" diz isso abertamente,
  em vez de fingir que um link foi enviado.
- Os dados antigos do Base44 não vieram no ZIP: protocolos, propagandas e
  histórico começam vazios nesta versão e são recriados aqui.

## Rodar localmente

```bash
npm install
npm run build
npm start
```

Abra http://localhost:8080. Para desenvolvimento do frontend, `npm run dev`
aponta para a mesma API quando o servidor estiver rodando na porta 8080
(por padrão o Vite não faz proxy; prefira `npm run build && npm start` para
testar o conjunto completo).

## Variáveis de ambiente

- `PORT` (padrão 8080)
- `DATA_DIR` (padrão: `/app/data` se existir, senão `./data`)
- `GEMINI_API_KEY` (opcional; sem ela, a IA fica no modo honesto descrito acima)
- `GEMINI_MODEL` (padrão `gemini-3.5-flash-lite`; o modelo efetivo é sempre o Flash-Lite em primeiro, mesmo que esta variável aponte para outro modelo, e em cota 429 não há retry nem troca de modelo)
- `GEMINI_IMAGE_MODEL` (padrão `gemini-2.5-flash-image`)
- `BRAVE_API_KEY` (opcional; com ela, a busca de protocolos usa resultados reais da web antes de responder; sem ela, o Gemini responde só com o conhecimento do modelo)

## Deploy (Railway)

Dockerfile + `railway.json`. O serviço precisa de um volume montado em
`/app/data` para os dados (protocolos, propagandas, histórico, uploads e
contas) sobreviverem a redeploys. Sem volume, os dados são efêmeros.

## Análise de caso: limites honestos

- Só ginecologia, obstetrícia e saúde da mulher. Fora disso, o servidor
  recusa com 400, em vez de responder outro assunto.
- Só para profissional logado. O histórico de casos é só do próprio
  usuário; outra conta vê lista vazia e recebe 404 no caso alheio.
- Caso idêntico já analisado volta do histórico, sem gastar cota do
  Gemini. Em cota 429, o servidor para na hora, sem tentar outro modelo.
- Referências: só protocolos salvos no sistema e fontes oficiais
  (FEBRASGO, ACOG, OMS, Ministério da Saúde, RCOG). Referência não
  confirmada aparece marcada como tal; sem referência segura, a lista
  vem vazia, em vez de inventar artigo, autor, ano ou link.
- Endpoints: `GET /api/casos`, `GET /api/casos/:id`,
  `POST /api/casos/analisar`, `POST /api/casos/:id/favorito`,
  `DELETE /api/casos/:id`.

## Aviso importante

As informações são para fins educacionais e de referência. Não substituem
o julgamento clínico nem os protocolos institucionais. A análise de caso
é apoio ao raciocínio: não fecha diagnóstico sozinha, não prescreve
sozinha e, em sinal de emergência, a orientação é atendimento de
emergência imediato, sem esperar a IA.
