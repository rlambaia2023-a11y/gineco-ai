import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, ExternalLink, Languages, Volume2, VolumeX, Loader2, FileDown, Share2, BookMarked } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function SearchResult({ result, query, sources }) {
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSynthesis] = useState(window.speechSynthesis);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  React.useEffect(() => {
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
    }
  }, [speechSynthesis]);

  const handleTranslate = async () => {
    setIsTranslating(true);
    try {
      const translation = await base44.integrations.Core.InvokeLLM({
        prompt: `Traduza o seguinte texto médico para português brasileiro, mantendo toda a precisão técnica e terminologia médica adequada:

${translatedText || result}

Se o texto já estiver em português, retorne "TEXTO JÁ EM PORTUGUÊS".`,
        add_context_from_internet: false
      });

      if (translation.includes("JÁ EM PORTUGUÊS")) {
        alert("O texto já está em português brasileiro.");
      } else {
        setTranslatedText(translation);
      }
    } catch (error) {
      console.error("Erro na tradução:", error);
      alert("Erro ao traduzir o texto. Por favor, tente novamente.");
    }
    setIsTranslating(false);
  };

  const handleSpeak = () => {
    if (isSpeaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToSpeak = translatedText || result;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.9;
    utterance.pitch = 1;

    const voices = speechSynthesis.getVoices();
    const ptVoice = voices.find(voice => voice.lang.includes('pt-BR') || voice.lang.includes('pt'));
    if (ptVoice) {
      utterance.voice = ptVoice;
    }

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleGeneratePDF = () => {
    setIsGeneratingPDF(true);
    
    const displayText = translatedText || result;
    const currentDate = new Date().toLocaleString('pt-BR');
    
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
    h2 {
      color: #1976D2;
      border-bottom: 2px solid #E3F2FD;
      padding-bottom: 5px;
      margin-top: 25px;
    }
    h3 {
      color: #424242;
      margin-top: 20px;
    }
    ul, ol {
      margin: 10px 0;
      padding-left: 30px;
    }
    li {
      margin-bottom: 8px;
    }
    strong {
      color: #1976D2;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Gineco-AI @2025</h1>
    <p>Plataforma Médica de Ginecologia e Obstetrícia</p>
    <p>Data: ${currentDate}</p>
  </div>
  
  <div class="question">
    <strong>Pergunta:</strong> ${query}
  </div>
  
  <div class="content">
    ${displayText.replace(/\n/g, '<br>').replace(/#{1,3} /g, '<br><strong>').replace(/\*\*/g, '</strong>')}
  </div>
  
  ${sources && sources.length > 0 ? `
  <div class="sources">
    <h3><span style="font-size: 20px;">📚</span> Fontes Científicas Utilizadas:</h3>
    <ul>
      ${sources.map(source => `<li>${source}</li>`).join('')}
    </ul>
  </div>
  ` : ''}
  
  <div class="footer">
    <p><strong>Aviso Importante:</strong> Esta informação foi gerada pela plataforma Gineco-AI baseada em protocolos médicos e artigos científicos atualizados. Sempre consulte protocolos institucionais e profissionais especializados para decisões clínicas. Não substitui o julgamento clínico profissional.</p>
    <p><strong>Ideia:</strong> Dra. Mayara Miranda | <strong>Criação:</strong> Harrison Ribeiro Costa</p>
    <p><strong>Watts:</strong> 75-98148.7519 | <strong>GINECO-AI</strong> @2025</p>
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
        setIsGeneratingPDF(false);
      };
    } else {
      alert('Por favor, permita pop-ups para gerar o PDF');
      setIsGeneratingPDF(false);
    }
  };

  const handleShare = async () => {
    const displayText = translatedText || result;
    const shareText = `Gineco-AI - Pesquisa Médica

Pergunta: ${query}

${displayText}

${sources && sources.length > 0 ? `\nFontes Científicas:\n${sources.map((s, i) => `${i + 1}. ${s}`).join('\n')}` : ''}

---
Gineco-AI @2025
Ideia: Dra. Mayara Miranda | Criação: Harrison Ribeiro Costa`;

    // Tenta copiar para clipboard diretamente
    try {
      await navigator.clipboard.writeText(shareText);
      alert('✅ Texto copiado para a área de transferência! Você pode colá-lo onde desejar.');
    } catch (clipboardError) {
      // Se falhar, tenta o método Web Share API
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Gineco-AI - Pesquisa Médica',
            text: shareText,
          });
        } catch (shareError) {
          // Se Web Share também falhar, usa fallback manual
          if (shareError.name !== 'AbortError') {
            fallbackShare(shareText);
          }
        }
      } else {
        // Se nada funcionar, usa fallback
        fallbackShare(shareText);
      }
    }
  };

  const fallbackShare = (text) => {
    // Cria um elemento textarea temporário
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      textArea.remove();
      alert('✅ Texto copiado! Você pode colá-lo onde desejar.');
    } catch (err) {
      textArea.remove();
      alert('❌ Não foi possível copiar automaticamente. Por favor, selecione e copie o texto manualmente.');
    }
  };

  const renderSourceWithLink = (source) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = source.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline break-all"
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const displayText = translatedText || result;

  return (
    <Card className="border-none shadow-xl bg-white">
      <CardHeader className="border-b border-gray-100">
        <div className="flex items-start justify-between gap-4 mb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Resultado da Pesquisa
          </CardTitle>
          <Badge className="bg-gradient-to-r from-blue-500 to-pink-500 text-white border-none">
            Ginecologia & Obstetrícia
          </Badge>
        </div>
        <p className="text-sm text-gray-600">
          <strong>Pergunta:</strong> {query}
        </p>
        
        <div className="flex flex-wrap gap-3 mt-4">
          <Button
            onClick={handleTranslate}
            disabled={isTranslating}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            {isTranslating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Traduzindo...
              </>
            ) : (
              <>
                <Languages className="w-4 h-4" />
                {translatedText ? "Retraduzir" : "Traduzir"}
              </>
            )}
          </Button>

          <Button
            onClick={handleSpeak}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            {isSpeaking ? (
              <>
                <VolumeX className="w-4 h-4" />
                Parar Áudio
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                Ouvir Texto
              </>
            )}
          </Button>

          <Button
            onClick={handleGeneratePDF}
            disabled={isGeneratingPDF}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                Gerar PDF
              </>
            )}
          </Button>

          <Button
            onClick={handleShare}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Compartilhar
          </Button>

          {translatedText && (
            <Button
              onClick={() => setTranslatedText(null)}
              variant="ghost"
              size="sm"
              className="text-gray-600"
            >
              Ver Original
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {translatedText && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700 font-medium flex items-center gap-2">
              <Languages className="w-4 h-4" />
              Texto traduzido para português brasileiro
            </p>
          </div>
        )}

        <div className="prose prose-sm max-w-none">
          <ReactMarkdown
            className="text-gray-700 leading-relaxed"
            components={{
              h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-800" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-5 mb-3 text-gray-800" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-800" {...props} />,
              p: ({node, ...props}) => <p className="mb-4 text-gray-700" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 space-y-2" {...props} />,
              li: ({node, ...props}) => <li className="text-gray-700" {...props} />,
              strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
              a: ({node, ...props}) => (
                <a 
                  className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  {...props}
                >
                  {props.children}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ),
            }}
          >
            {displayText}
          </ReactMarkdown>
        </div>

        {sources && sources.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-purple-600" />
              Fontes Científicas Utilizadas:
            </h3>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <ul className="space-y-3">
                {sources.map((source, idx) => (
                  <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-purple-600 font-bold mt-0.5 min-w-[24px]">{idx + 1}.</span>
                    <span className="leading-relaxed">
                      {renderSourceWithLink(source)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-500 italic">
            Esta informação foi gerada com base em pesquisa na internet e artigos científicos recentes de ginecologia e obstetrícia. 
            Sempre consulte protocolos institucionais e profissionais especializados para decisões clínicas.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}