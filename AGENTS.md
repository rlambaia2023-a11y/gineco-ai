# Gineco-AI

App adaptado de um export do Base44 para hospedagem própria. Sem SDK Base44,
sem `base44 dev`, sem retorno ao Base44.

Frontend Vite + React + Tailwind + shadcn. Backend próprio sem dependências
em `server.mjs`: serve `dist/` com fallback SPA e API em `/api/*` (auth
local, entidades Protocol/Advertisement/SearchHistory, upload, IA).
O arquivo `src/api/base44Client.js` é só um adaptador com o mesmo formato
que as páginas já usavam; ele chama a API própria, não o Base44.

Dados em DATA_DIR ou `/app/data` (volume na Railway). Sem volume, os dados
somem a cada redeploy. IA: só Gemini, sem OpenAI. Com GEMINI_API_KEY usa Gemini (modelo gemini-3.8-flash); sem chave, o
servidor devolve resposta honesta sem inventar conduta clínica (ver
`server.mjs`, função fallbackAi). Nunca inventar diretriz, artigo ou link.

Login local: e-mail + senha (scrypt). Sem login Google, sem OTP por e-mail.
Redefinição de senha por e-mail ainda não existe; a página de esqueci a
senha diz isso abertamente. Contas admin na interface: rlambaia@yahoo.com
e rlambaia2023@gmail.com.

Deploy: Dockerfile + railway.json, serviço `gineco-ai` na Railway.
