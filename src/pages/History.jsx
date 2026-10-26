import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History as HistoryIcon, Search, Clock, FileText, Calendar, ExternalLink, FileDown, Share2, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import HistoryModal from "../components/history/HistoryModal";

export default function History() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHistory, setSelectedHistory] = useState(null);
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

  const { data: history, isLoading } = useQuery({
    queryKey: ['search-history'],
    queryFn: () => base44.entities.SearchHistory.list("-created_date"),
    initialData: [],
  });

  const deleteHistoryMutation = useMutation({
    mutationFn: (id) => base44.entities.SearchHistory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search-history'] });
      alert("Histórico excluído com sucesso!");
    },
  });

  const handleDelete = async (historyId) => {
    if (window.confirm("Tem certeza que deseja excluir este histórico?")) {
      await deleteHistoryMutation.mutateAsync(historyId);
      if (selectedHistory && selectedHistory.id === historyId) {
        setSelectedHistory(null);
      }
    }
  };

  const isAdmin = user && (user.email === "rlambaia@yahoo.com" || user.email === "rlambaia2023@gmail.com");

  const filteredHistory = history.filter(item => 
    (item.query || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.result || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeColor = (type) => {
    const colors = {
      protocolo: "bg-blue-100 text-blue-700 border-blue-200",
      artigo: "bg-purple-100 text-purple-700 border-purple-200",
      busca_geral: "bg-pink-100 text-pink-700 border-pink-200"
    };
    return colors[type] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  const getFirstLink = (sources) => {
    if (!sources || sources.length === 0) return null;
    
    for (const source of sources) {
      const urlMatch = source.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        return urlMatch[0];
      }
    }
    return null;
  };

  const handleGeneratePDF = (item) => {
    const currentDate = format(new Date(item.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    
    const pdfContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #3B82F6 0%, #EC4899 100%);
      color: white;
      padding: 20px;
      border-radius: 10px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 24px;
    }
    .header p {
      margin: 5px 0;
      font-size: 14px;
    }
    .question {
      background: #E3F2FD;
      padding: 15px;
      border-left: 4px solid #3B82F6;
      margin-bottom: 20px;
      border-radius: 5px;
    }
    .question strong {
      color: #1976D2;
    }
    .content {
      margin-bottom: 30px;
    }
    .sources {
      background: #F3E5F5;
      padding: 15px;
      border-left: 4px solid #9C27B0;
      border-radius: 5px;
      margin-top: 30px;
    }
    .sources h3 {
      color: #7B1FA2;
      margin-top: 0;
    }
    .sources ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    .sources li {
      margin-bottom: 8px;
      line-height: 1.5;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #E0E0E0;
      font-size: 12px;
      color: #757575;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Gineco-AI @2025</h1>
    <p>Plataforma Médica de Ginecologia e Obstetrícia</p>
    <p>Pesquisa realizada em: ${currentDate}</p>
  </div>
  
  <div class="question">
    <strong>Pergunta:</strong> ${item.query}
  </div>
  
  <div class="content">
    ${item.result.replace(/\n/g, '<br>').replace(/#{1,3} /g, '<br><strong>').replace(/\*\*/g, '</strong>')}
  </div>
  
  ${item.sources && item.sources.length > 0 ? `
  <div class="sources">
    <h3>📚 Fontes Científicas Utilizadas:</h3>
    <ul>
      ${item.sources.map(source => `<li>${source}</li>`).join('')}
    </ul>
  </div>
  ` : ''}
  
  <div class="footer">
    <p><strong>Aviso Importante:</strong> Esta informação foi gerada pela plataforma Gineco-AI baseada em protocolos médicos e artigos científicos atualizados. Sempre consulte protocolos institucionais e profissionais especializados para decisões clínicas.</p>
    <p><strong>Ideia:</strong> Dra. Mayara Miranda | <strong>Criação:</strong> Harrison Ribeiro Costa</p>
    <p><strong>GINECO-AI</strong> @2025</p>
  </div>
</body>
</html>
    `;

    const blob = new Blob([pdfContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    } else {
      alert('Por favor, permita pop-ups para gerar o PDF');
    }
  };

  const handleShare = async (item) => {
    const shareText = `Gineco-AI - Pesquisa Médica

Pergunta: ${item.query}

${item.result}

${item.sources && item.sources.length > 0 ? `\nFontes Científicas:\n${item.sources.map((s, i) => `${i + 1}. ${s}`).join('\n')}` : ''}

---
Gineco-AI @2025`;

    try {
      await navigator.clipboard.writeText(shareText);
      alert('✅ Texto copiado para a área de transferência!');
    } catch (error) {
      const textArea = document.createElement('textarea');
      textArea.value = shareText;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        alert('✅ Texto copiado!');
      } catch (err) {
        alert('❌ Não foi possível copiar');
      }
      textArea.remove();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center">
              <HistoryIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-gray-800">Histórico de Pesquisas</h1>
          </div>
          <p className="text-sm md:text-base text-gray-600">Revise todas as suas consultas e pesquisas anteriores</p>
        </div>

        <Card className="mb-6 md:mb-8 border-none shadow-lg">
          <CardContent className="p-4 md:p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Buscar no histórico..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 md:h-12 border-gray-200 focus:border-blue-300"
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {isLoading ? (
            Array(5).fill(0).map((_, i) => (
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
          ) : filteredHistory.length > 0 ? (
            filteredHistory.map((item) => {
              const firstLink = getFirstLink(item.sources);
              
              return (
                <Card 
                  key={item.id}
                  className="border-none shadow-lg hover:shadow-xl transition-all duration-300 bg-white"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3">
                          <div className="flex items-center gap-2 bg-gray-50 px-2 md:px-3 py-1.5 rounded-full">
                            <Calendar className="w-3 h-3 md:w-4 md:h-4 text-gray-500" />
                            <span className="text-xs md:text-sm font-medium text-gray-700">
                              {format(new Date(item.created_date), "dd/MM/yyyy")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 bg-blue-50 px-2 md:px-3 py-1.5 rounded-full">
                            <Clock className="w-3 h-3 md:w-4 md:h-4 text-blue-600" />
                            <span className="text-xs md:text-sm font-medium text-blue-700">
                              {format(new Date(item.created_date), "HH:mm")}
                            </span>
                          </div>
                          <Badge variant="secondary" className={`text-xs ${getTypeColor(item.search_type)}`}>
                            {item.search_type === "busca_geral" ? "Busca" : item.search_type || "Geral"}
                          </Badge>
                        </div>
                        <CardTitle className="text-base md:text-lg text-gray-800 cursor-pointer hover:text-blue-600 transition-colors"
                          onClick={() => setSelectedHistory(item)}>
                          {item.query || "Consulta sem título"}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-xs md:text-sm line-clamp-3 leading-relaxed mb-4">
                      {item.result || "Sem resultado disponível"}
                    </p>
                    
                    {item.sources && item.sources.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Fontes Científicas:</p>
                        <div className="flex flex-wrap gap-2">
                          {item.sources.slice(0, 2).map((source, idx) => {
                            const hasLink = source.match(/(https?:\/\/[^\s]+)/);
                            return (
                              <Badge 
                                key={idx} 
                                variant="outline" 
                                className="text-xs max-w-full"
                              >
                                <span className="truncate">
                                  {source.split(' - ')[0]}
                                </span>
                                {hasLink && (
                                  <ExternalLink className="w-3 h-3 ml-1 flex-shrink-0" />
                                )}
                              </Badge>
                            );
                          })}
                          {item.sources.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{item.sources.length - 2} mais
                            </Badge>
                          )}
                        </div>
                        
                        {firstLink && (
                          <a
                            href={firstLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-2"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Ver fonte completa
                          </a>
                        )}
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                      <Button
                        onClick={() => setSelectedHistory(item)}
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-none text-xs"
                      >
                        Ver Detalhes
                      </Button>
                      <Button
                        onClick={() => handleGeneratePDF(item)}
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-none text-xs"
                      >
                        <FileDown className="w-3 h-3 mr-1" />
                        PDF
                      </Button>
                      <Button
                        onClick={() => handleShare(item)}
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-none text-xs"
                      >
                        <Share2 className="w-3 h-3 mr-1" />
                        Compartilhar
                      </Button>
                      {isAdmin && (
                        <Button
                          onClick={() => handleDelete(item.id)}
                          variant="destructive"
                          size="sm"
                          className="flex-1 sm:flex-none text-xs"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Excluir
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">Nenhuma pesquisa encontrada</h3>
              <p className="text-gray-500">Comece realizando buscas para ver seu histórico aqui</p>
            </div>
          )}
        </div>
      </div>

      <HistoryModal 
        history={selectedHistory}
        onClose={() => setSelectedHistory(null)}
      />
    </div>
  );
}