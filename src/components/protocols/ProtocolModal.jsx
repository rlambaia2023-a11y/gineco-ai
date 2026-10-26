import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Heart, Baby, FileText, BookOpen, ExternalLink, Download } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function ProtocolModal({ protocol, onClose }) {
  const [activeTab, setActiveTab] = useState("summary");

  // Se tiver PDF, mostrar o PDF por padrão
  React.useEffect(() => {
    if (protocol?.file_url) {
      setActiveTab("pdf");
    }
  }, [protocol]);

  if (!protocol) return null;

  const CategoryIcon = protocol.category === "ginecologia" ? Heart : Baby;

  return (
    <Dialog open={!!protocol} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              protocol.category === "ginecologia" 
                ? "bg-gradient-to-br from-pink-100 to-pink-200" 
                : "bg-gradient-to-br from-blue-100 to-blue-200"
            }`}>
              <CategoryIcon className={`w-6 h-6 ${
                protocol.category === "ginecologia" ? "text-pink-600" : "text-blue-600"
              }`} />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl">{protocol.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className={`${
                  protocol.category === "ginecologia" 
                    ? "bg-pink-100 text-pink-700 border-pink-200" 
                    : "bg-blue-100 text-blue-700 border-blue-200"
                }`}>
                  {protocol.category}
                </Badge>
                {protocol.file_url && (
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    <FileText className="w-3 h-3 mr-1" />
                    PDF Oficial
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="w-full bg-gray-100">
            {protocol.file_url && (
              <TabsTrigger value="pdf" className="flex-1">
                <FileText className="w-4 h-4 mr-2" />
                Documento Original
              </TabsTrigger>
            )}
            <TabsTrigger value="summary" className="flex-1">
              <FileText className="w-4 h-4 mr-2" />
              Resumo
            </TabsTrigger>
            {protocol.full_content && (
              <TabsTrigger value="full" className="flex-1">
                <BookOpen className="w-4 h-4 mr-2" />
                Protocolo Completo
              </TabsTrigger>
            )}
          </TabsList>

          {protocol.file_url && (
            <TabsContent value="pdf">
              <div className="space-y-4">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(protocol.file_url, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrir em Nova Aba
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={protocol.file_url} download>
                      <Download className="w-4 h-4 mr-2" />
                      Baixar PDF
                    </a>
                  </Button>
                </div>
                <div className="border rounded-lg overflow-hidden bg-gray-50">
                  <iframe
                    src={protocol.file_url}
                    className="w-full h-[600px]"
                    title={`PDF - ${protocol.name}`}
                  />
                </div>
              </div>
            </TabsContent>
          )}

          <TabsContent value="summary">
            <ScrollArea className="h-[500px] pr-4">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown
                  className="text-gray-700 leading-relaxed"
                  components={{
                    h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-800 border-b-2 border-blue-200 pb-2" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-5 mb-3 text-gray-800" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-800" {...props} />,
                    h4: ({node, ...props}) => <h4 className="text-base font-semibold mt-3 mb-2 text-gray-700" {...props} />,
                    p: ({node, ...props}) => <p className="mb-3 text-gray-700 leading-relaxed" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 space-y-2" {...props} />,
                    li: ({node, ...props}) => <li className="text-gray-700" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-bold text-gray-900" {...props} />,
                    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500 pl-4 italic my-4 text-gray-600" {...props} />,
                  }}
                >
                  {protocol.summary}
                </ReactMarkdown>
              </div>
            </ScrollArea>
          </TabsContent>

          {protocol.full_content && (
            <TabsContent value="full">
              <ScrollArea className="h-[500px] pr-4">
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown
                    className="text-gray-700 leading-relaxed"
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-800 border-b-2 border-blue-200 pb-2" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-5 mb-3 text-gray-800" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-800" {...props} />,
                      h4: ({node, ...props}) => <h4 className="text-base font-semibold mt-3 mb-2 text-gray-700" {...props} />,
                      p: ({node, ...props}) => <p className="mb-3 text-gray-700 leading-relaxed" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 space-y-2" {...props} />,
                      li: ({node, ...props}) => <li className="text-gray-700" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-bold text-gray-900" {...props} />,
                      blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500 pl-4 italic my-4 text-gray-600" {...props} />,
                      table: ({node, ...props}) => <table className="min-w-full border-collapse border border-gray-300 my-4" {...props} />,
                      thead: ({node, ...props}) => <thead className="bg-gray-100" {...props} />,
                      th: ({node, ...props}) => <th className="border border-gray-300 px-4 py-2 text-left font-semibold" {...props} />,
                      td: ({node, ...props}) => <td className="border border-gray-300 px-4 py-2" {...props} />,
                    }}
                  >
                    {protocol.full_content}
                  </ReactMarkdown>
                </div>
              </ScrollArea>
            </TabsContent>
          )}
        </Tabs>

        {protocol.tags && protocol.tags.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-600 mb-2">Tags:</h4>
            <div className="flex flex-wrap gap-2">
              {protocol.tags.map((tag, idx) => (
                <Badge key={idx} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t bg-blue-50 rounded-lg p-4 -mx-6 -mb-6">
          <p className="text-xs text-gray-600">
            <strong>Fonte:</strong> Hospital Inácia Pinto dos Santos (HIPS) - 2025
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}