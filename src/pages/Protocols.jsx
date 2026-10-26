
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, Heart, Baby, BookOpen, FileText, Loader2, AlertCircle, RefreshCw, Upload } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ProtocolModal from "../components/protocols/ProtocolModal";
import ProtocolUploadForm from "../components/protocols/ProtocolUploadForm";

export default function Protocols() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedProtocol, setSelectedProtocol] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [user, setUser] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        setUser(null);
      }
    };
    loadUser();
  }, []);

  const isAdmin = user && (user.email === "rlambaia@yahoo.com" || user.email === "rlambaia2023@gmail.com");

  const { data: protocols, isLoading } = useQuery({
    queryKey: ['protocols'],
    queryFn: () => base44.entities.Protocol.list("-created_date"),
    initialData: [],
  });

  const createProtocolMutation = useMutation({
    mutationFn: (protocolData) => base44.entities.Protocol.create(protocolData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['protocols'] });
    },
  });

  const updateProtocolMutation = useMutation({
    mutationFn: ({ id, protocolData }) => base44.entities.Protocol.update(id, protocolData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['protocols'] });
    },
  });

  const deleteProtocolMutation = useMutation({
    mutationFn: (id) => base44.entities.Protocol.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['protocols'] });
    },
  });

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setActiveSearch(searchTerm);
    setSearchError(null);

    const searchLower = searchTerm.toLowerCase();
    const foundInSystem = protocols.find(protocol =>
      (protocol.name || "").toLowerCase().includes(searchLower) ||
      (protocol.summary || "").toLowerCase().includes(searchLower) ||
      (protocol.tags || []).some(tag => (tag || "").toLowerCase().includes(searchLower))
    );

    if (foundInSystem) {
      setIsSearching(true);
      
      try {
        const response = await base44.integrations.Core.InvokeLLM({
          prompt: `Você é um especialista em protocolos médicos de GINECOLOGIA e OBSTETRÍCIA.

TAREFA: Buscar a VERSÃO MAIS ATUALIZADA do protocolo oficial sobre "${searchTerm}"

FONTES OBRIGATÓRIAS (busque APENAS nestes sites oficiais):
1. FEBRASGO (Federação Brasileira das Associações de Ginecologia e Obstetrícia) - https://www.febrasgo.org.br/
2. Ministério da Saúde do Brasil - https://www.saude.gov.br/
3. ACOG (American College of Obstetricians and Gynecologists) - https://www.acog.org/
4. OMS (Organização Mundial da Saúde) - https://www.who.int/
5. RCOG (Royal College of Obstetricians and Gynaecologists) - https://www.rcog.org.uk/

INSTRUÇÕES:
1. Busque o protocolo MAIS RECENTE E ATUALIZADO (2023-2024)
2. Verifique se há novas diretrizes ou atualizações
3. Inclua TODAS as informações atualizadas

FORMATO DA RESPOSTA (JSON):
{
  "status": "ENCONTRADO" | "NÃO_ENCONTRADO" | "NÃO_RELACIONADO",
  "name": "Nome completo do protocolo",
  "category": "ginecologia" | "obstetricia",
  "summary": "RESUMO DETALHADO COMPLETO",
  "full_content": "PROTOCOLO COMPLETO DETALHADO",
  "tags": ["tag1", "tag2", "tag3"],
  "fonte_oficial": "Nome da instituição, ano e link"
}`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              status: { type: "string" },
              name: { type: "string" },
              category: { type: "string" },
              summary: { type: "string" },
              full_content: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
              fonte_oficial: { type: "string" }
            }
          }
        });

        if (response.ia_configurada === false) {
          setSearchError("Atualização automática indisponível: a IA ainda não está configurada neste servidor. Configure a GEMINI_API_KEY nas variáveis da Railway e tente de novo. O protocolo atual continua salvo abaixo.");
          setSelectedProtocol(foundInSystem);
        } else if (response.status === "ENCONTRADO") {
          await updateProtocolMutation.mutateAsync({
            id: foundInSystem.id,
            protocolData: {
              name: response.name,
              category: response.category,
              summary: response.summary,
              full_content: response.full_content,
              tags: response.tags || []
            }
          });

          const updatedProtocols = await base44.entities.Protocol.list("-created_date");
          const updatedProtocol = updatedProtocols.find(p => p.id === foundInSystem.id);

          setSelectedProtocol(updatedProtocol);

          alert("Protocolo atualizado com sucesso");
        } else if (response.status === "NÃO_RELACIONADO") {
          setSearchError("Esta busca não está relacionada a ginecologia ou obstetrícia. O protocolo atual continua salvo abaixo.");
          setSelectedProtocol(foundInSystem);
        } else {
          // NÃO_ENCONTRADO ou qualquer outro status: antes esse caminho
          // terminava sem mostrar nada, e parecia que a busca travou.
          setSearchError("Não encontramos uma versão atualizada deste protocolo nas fontes oficiais. O protocolo atual continua salvo abaixo.");
          setSelectedProtocol(foundInSystem);
        }
        
      } catch (error) {
        console.error("Erro ao atualizar protocolo:", error);
        setSelectedProtocol(foundInSystem);
      }
      
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um especialista em protocolos médicos de GINECOLOGIA e OBSTETRÍCIA.

TAREFA: Buscar protocolo oficial sobre "${searchTerm}"

FONTES OBRIGATÓRIAS (busque APENAS nestes sites oficiais):
1. FEBRASGO
2. Ministério da Saúde do Brasil
3. ACOG
4. OMS
5. RCOG

FORMATO DA RESPOSTA (JSON):
{
  "status": "ENCONTRADO" | "NÃO_ENCONTRADO" | "NÃO_RELACIONADO",
  "name": "Nome completo do protocolo",
  "category": "ginecologia" | "obstetricia",
  "summary": "RESUMO DETALHADO COMPLETO",
  "full_content": "PROTOCOLO COMPLETO DETALHADO",
  "tags": ["tag1", "tag2"],
  "fonte_oficial": "Nome da instituição"
}`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            status: { type: "string" },
            name: { type: "string" },
            category: { type: "string" },
            summary: { type: "string" },
            full_content: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
            fonte_oficial: { type: "string" }
          }
        }
      });

      if (response.ia_configurada === false) {
        setSearchError("Busca de protocolo indisponível: a IA ainda não está configurada neste servidor. Configure a GEMINI_API_KEY nas variáveis da Railway e tente de novo.");
        setIsSearching(false);
        return;
      }

      if (response.status === "NÃO_RELACIONADO") {
        setSearchError("Esta busca não está relacionada a ginecologia ou obstetrícia.");
        setIsSearching(false);
        return;
      }

      if (response.status === "NÃO_ENCONTRADO") {
        setSearchError("Não encontramos protocolo oficial sobre este tema.");
        setIsSearching(false);
        return;
      }

      const newProtocol = await createProtocolMutation.mutateAsync({
        name: response.name,
        category: response.category,
        summary: response.summary,
        full_content: response.full_content,
        tags: response.tags || []
      });

      setSelectedProtocol(newProtocol);
      alert("Protocolo encontrado e salvo");

    } catch (error) {
      console.error("Erro na busca:", error);
      setSearchError("Erro ao buscar protocolo. Tente novamente.");
    }

    setIsSearching(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isSearching) {
      handleSearch();
    }
  };

  const filteredProtocols = protocols.filter(protocol => {
    const searchLower = activeSearch.toLowerCase();
    const matchesSearch = activeSearch === "" || 
                         (protocol.name || "").toLowerCase().includes(searchLower) ||
                         (protocol.summary || "").toLowerCase().includes(searchLower) ||
                         (protocol.tags || []).some(tag => (tag || "").toLowerCase().includes(searchLower));
    const matchesCategory = category === "all" || protocol.category === category;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (cat) => {
    return cat === "ginecologia" ? Heart : Baby;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
              <h1 className="text-2xl md:text-4xl font-bold text-gray-900">Protocolos Médicos</h1>
            </div>
            <Button
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload PDF
            </Button>
          </div>
          <p className="text-sm md:text-base text-gray-600">Protocolos completos e resumidos de ginecologia e obstetrícia</p>
        </div>

        {showUploadForm && (
          <div className="mb-6">
            <ProtocolUploadForm onClose={() => setShowUploadForm(false)} />
          </div>
        )}

        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <RefreshCw className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-gray-700">
            <strong>Atualização Automática:</strong> Quando você busca um protocolo que já existe, 
            automaticamente buscamos a versão mais atualizada nos sites oficiais.
          </AlertDescription>
        </Alert>

        <Card className="mb-6 md:mb-8 border-none shadow-lg">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Digite o protocolo que procura"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="pl-10 h-11 md:h-12 border-gray-200 focus:border-blue-300"
                    disabled={isSearching}
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={!searchTerm.trim() || isSearching}
                  className="h-11 md:h-12 px-6 bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white font-medium"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Buscando...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2" />
                      Buscar
                    </>
                  )}
                </Button>
              </div>

              {searchError && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{searchError}</AlertDescription>
                </Alert>
              )}

              {activeSearch && !isSearching && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">Buscando por:</span>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    {activeSearch}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setActiveSearch("");
                      setSearchError(null);
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Limpar busca
                  </Button>
                </div>
              )}

              <Tabs value={category} onValueChange={setCategory} className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-gray-100">
                  <TabsTrigger value="all" className="text-xs md:text-sm">Todos</TabsTrigger>
                  <TabsTrigger value="ginecologia" className="text-xs md:text-sm">
                    <Heart className="w-4 h-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Ginecologia</span>
                    <span className="sm:hidden">Gine</span>
                  </TabsTrigger>
                  <TabsTrigger value="obstetricia" className="text-xs md:text-sm">
                    <Baby className="w-4 h-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Obstetrícia</span>
                    <span className="sm:hidden">Obs</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {isSearching && (
          <Card className="mb-6 border-none shadow-lg bg-gradient-to-r from-blue-50 to-pink-50">
            <CardContent className="p-8 text-center">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {filteredProtocols.length > 0 && activeSearch ? 
                  "Atualizando protocolo com versão mais recente..." : 
                  "Buscando protocolo oficial..."}
              </h3>
              <p className="text-sm text-gray-600">
                Consultando fontes oficiais
              </p>
            </CardContent>
          </Card>
        )}

        {activeSearch && !isSearching && (
          <div className="mb-4 text-sm text-gray-600">
            <span className="font-medium">{filteredProtocols.length}</span> protocolo(s) encontrado(s)
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {isLoading ? (
            Array(6).fill(0).map((_, i) => (
              <Card key={i} className="border-none shadow-lg">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))
          ) : filteredProtocols.length > 0 ? (
            filteredProtocols.map((protocol) => {
              const CategoryIcon = getCategoryIcon(protocol.category);
              
              return (
                <Card 
                  key={protocol.id}
                  className="border-none shadow-lg hover:shadow-xl transition-all duration-300 group bg-white"
                >
                  <CardHeader onClick={() => setSelectedProtocol(protocol)} className="cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        protocol.category === "ginecologia" 
                          ? "bg-gradient-to-br from-pink-100 to-pink-200" 
                          : "bg-gradient-to-br from-blue-100 to-blue-200"
                      }`}>
                        <CategoryIcon className={`w-5 h-5 md:w-6 md:h-6 ${
                          protocol.category === "ginecologia" ? "text-pink-600" : "text-blue-600"
                        }`} />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Badge variant="secondary" className={`text-xs ${
                          protocol.category === "ginecologia" 
                            ? "bg-pink-100 text-pink-700 border-pink-200" 
                            : "bg-blue-100 text-blue-700 border-blue-200"
                        }`}>
                          {protocol.category}
                        </Badge>
                        {protocol.file_url && (
                          <Badge className="text-xs bg-green-100 text-green-700 border-green-200">
                            <FileText className="w-3 h-3 mr-1" />
                            PDF
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardTitle className="text-base md:text-lg group-hover:text-blue-600 transition-colors">
                      {protocol.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-xs md:text-sm line-clamp-3 leading-relaxed mb-4 cursor-pointer" onClick={() => setSelectedProtocol(protocol)}>
                      {protocol.summary 
                        ? (protocol.summary.length > 150 ? protocol.summary.substring(0, 150) + "..." : protocol.summary) 
                        : "Sem resumo disponível"}
                    </p>
                    {protocol.tags && protocol.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4 cursor-pointer" onClick={() => setSelectedProtocol(protocol)}>
                        {protocol.tags.slice(0, 3).map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {protocol.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{protocol.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                    {isAdmin && (
                      <div className="pt-3 border-t">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const confirmDelete = window.confirm("Tem certeza que deseja excluir o protocolo?");
                            if (confirmDelete) {
                              try {
                                await deleteProtocolMutation.mutateAsync(protocol.id);
                                alert("Protocolo excluído com sucesso");
                                setSelectedProtocol(null);
                              } catch (error) {
                                console.error("Erro ao excluir:", error);
                                alert("Erro ao excluir protocolo");
                              }
                            }
                          }}
                        >
                          Excluir Protocolo
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          ) : activeSearch && !isSearching ? (
            <div className="col-span-full text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">Nenhum protocolo encontrado</h3>
              <p className="text-gray-500 mb-4">
                Não encontramos resultados para sua busca
              </p>
              <Button
                onClick={() => {
                  setSearchTerm("");
                  setActiveSearch("");
                  setSearchError(null);
                }}
                variant="outline"
              >
                Limpar busca
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <ProtocolModal 
        protocol={selectedProtocol}
        onClose={() => setSelectedProtocol(null)}
      />
    </div>
  );
}
