import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search as SearchIcon, Sparkles, Loader2, BookOpen, AlertCircle, AlertTriangle } from "lucide-react";
import SearchResult from "../components/search/SearchResult";

export default function Search() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [sources, setSources] = useState([]);
  const [isOutOfScope, setIsOutOfScope] = useState(false);

  const searchMutation = useMutation({
    mutationFn: async (searchQuery) => {
      // Primeiro valida se está dentro do escopo
      const validation = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um validador especializado. Analise se a seguinte pergunta/busca está relacionada a GINECOLOGIA ou OBSTETRÍCIA:

"${searchQuery}"

Responda APENAS com:
- "SIM" se a pergunta for sobre ginecologia, obstetrícia, saúde da mulher, gestação, parto, doenças ginecológicas, contraceptivos, fertilidade, menopausa ou temas relacionados
- "NAO" se for sobre qualquer outra área médica ou assunto não relacionado

Responda com uma única palavra: SIM ou NAO`,
        add_context_from_internet: false
      });

      if (validation.trim().toUpperCase() !== "SIM") {
        setIsOutOfScope(true);
        return null;
      }

      setIsOutOfScope(false);

      // Se validado, faz a busca real
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um assistente médico ESPECIALIZADO EXCLUSIVAMENTE em GINECOLOGIA e OBSTETRÍCIA. 

REGRA PRINCIPAL: Você APENAS responde perguntas sobre ginecologia, obstetrícia e saúde da mulher.

IMPORTANTE: Você DEVE sempre citar e listar as FONTES CIENTÍFICAS utilizadas na resposta COM LINKS quando disponíveis.

Responda à seguinte pergunta/caso clínico em PORTUGUÊS BRASILEIRO de forma clara e profissional:

"${searchQuery}"

Por favor, forneça:
1. Uma resposta direta e objetiva focada em ginecologia/obstetrícia
2. Protocolos e diretrizes atualizadas da especialidade (cite os nomes das diretrizes)
3. Referências a artigos científicos recentes de ginecologia/obstetrícia (cite os artigos com autores e ano)
4. Recomendações práticas baseadas em evidências

Ao final da resposta, inclua uma seção chamada "## FONTES CIENTÍFICAS:" onde você lista TODAS as fontes utilizadas COM LINKS:

Formato das fontes (INCLUA LINKS SEMPRE QUE POSSÍVEL):
## FONTES CIENTÍFICAS:
1. [Nome da fonte/artigo] - https://link-para-fonte.com
2. [Nome da fonte/artigo] - https://link-para-fonte.com
3. [Nome da diretriz] - Disponível em: https://link.com

Exemplos de links válidos:
- PubMed: https://pubmed.ncbi.nlm.nih.gov/
- ACOG: https://www.acog.org/
- FEBRASGO: https://www.febrasgo.org.br/
- OMS: https://www.who.int/
- DOI de artigos: https://doi.org/...

Se não tiver link direto, mencione onde pode ser encontrado (ex: "Disponível no portal da FEBRASGO").

Mantenha um tom profissional e baseado em evidências científicas da área.`,
        add_context_from_internet: true
      });

      // Extrai as fontes da resposta
      let extractedSources = [];
      if (response.includes("FONTES CIENTÍFICAS:") || response.includes("FONTES CIENTIFICAS:")) {
        const sourcesSection = response.split(/FONTES CIENT[ÍI]FICAS?:/)[1];
        if (sourcesSection) {
          // Extrai cada linha numerada
          const sourceLines = sourcesSection.split('\n')
            .filter(line => line.trim().match(/^\d+\./))
            .map(line => line.replace(/^\d+\.\s*/, '').trim())
            .filter(line => line.length > 0);
          extractedSources = sourceLines;
        }
      }

      // Se não encontrou fontes, adiciona fontes genéricas com links
      if (extractedSources.length === 0) {
        extractedSources = [
          "FEBRASGO - Protocolos Brasileiros - https://www.febrasgo.org.br/",
          "ACOG - Guidelines Internacionais - https://www.acog.org/",
          "OMS - Diretrizes da Organização Mundial da Saúde - https://www.who.int/",
          "PubMed - Literatura Científica Indexada - https://pubmed.ncbi.nlm.nih.gov/"
        ];
      }

      setSources(extractedSources);

      // Save to history
      await base44.entities.SearchHistory.create({
        query: searchQuery,
        result: response,
        search_type: "busca_geral",
        sources: extractedSources
      });

      return response;
    },
    onSuccess: (data) => {
      if (data) {
        setResult(data);
      }
    },
  });

  const handleSearch = () => {
    if (query.trim()) {
      setIsOutOfScope(false);
      searchMutation.mutate(query);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-pink-400 rounded-xl flex items-center justify-center">
              <SearchIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Busca Inteligente</h1>
          </div>
          <p className="text-gray-600">Pesquise casos, protocolos e obtenha soluções atualizadas com IA</p>
        </div>

        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-gray-700">
            <strong>Especialidade:</strong> Esta IA é especializada exclusivamente em ginecologia e obstetrícia. 
            Todas as respostas são baseadas em fontes científicas com links para referências.
          </AlertDescription>
        </Alert>

        {isOutOfScope && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              <strong>Atenção:</strong> Esta plataforma é especializada exclusivamente em ginecologia e obstetrícia. 
              Por favor, faça perguntas relacionadas a essas especialidades médicas.
            </AlertDescription>
          </Alert>
        )}

        <Card className="border-none shadow-xl mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Digite sua pergunta sobre ginecologia ou obstetrícia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Exemplo: Qual o protocolo atual para tratamento de pré-eclâmpsia grave? Quais são as últimas evidências sobre manejo de endometriose? Como diagnosticar síndrome dos ovários policísticos?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-[120px] mb-4 text-base border-gray-200 focus:border-blue-300"
              disabled={searchMutation.isPending}
            />
            <Button
              onClick={handleSearch}
              disabled={!query.trim() || searchMutation.isPending}
              className="w-full h-12 bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white font-medium"
            >
              {searchMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Pesquisando na internet...
                </>
              ) : (
                <>
                  <SearchIcon className="w-5 h-5 mr-2" />
                  Pesquisar
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {searchMutation.isError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              Erro ao realizar a pesquisa. Por favor, tente novamente.
            </AlertDescription>
          </Alert>
        )}

        {result && (
          <SearchResult result={result} query={query} sources={sources} />
        )}
      </div>
    </div>
  );
}