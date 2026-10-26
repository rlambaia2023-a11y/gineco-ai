# Gineco-AI (versão própria, sem Base44)

Assistente para protocolos de ginecologia e obstetrícia, adaptado do export
do Base44 para hospedagem própria. Frontend React + Vite + Tailwind, backend
próprio em Node sem dependências (`server.mjs`) servindo o build e a API.

## O que funciona

- Início, Protocolos, Calculadoras (DUM, USG, peso fetal Hadlock, Bishop),
  Busca Inteligente, Publicidade, Histórico e Créditos, tudo em pt-BR.
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
- `GEMINI_MODEL` (padrão `gemini-3.8-flash`, com fallback automático para o mesmo modelo se o configurado der 404)
- `GEMINI_IMAGE_MODEL` (padrão `gemini-2.5-flash-image`)

## Deploy (Railway)

Dockerfile + `railway.json`. O serviço precisa de um volume montado em
`/app/data` para os dados (protocolos, propagandas, histórico, uploads e
contas) sobreviverem a redeploys. Sem volume, os dados são efêmeros.

## Aviso importante

As informações são para fins educacionais e de referência. Não substituem
o julgamento clínico nem os protocolos institucionais.
