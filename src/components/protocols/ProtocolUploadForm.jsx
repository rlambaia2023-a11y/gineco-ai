import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Loader2, FileText, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ProtocolUploadForm({ onClose }) {
  const [file, setFile] = useState(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("obstetricia");
  const [tags, setTags] = useState("");

  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (formData) => {
      // Upload do arquivo
      const { file_url } = await base44.integrations.Core.UploadFile({
        file: formData.file
      });

      // Criar protocolo com URL do arquivo
      return base44.entities.Protocol.create({
        name: formData.name,
        category: formData.category,
        summary: `Protocolo ${formData.name} - HIPS 2025`,
        full_content: "",
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
        file_url: file_url
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['protocols'] });
      alert("✅ Protocolo carregado com sucesso!");
      onClose();
    },
    onError: (error) => {
      console.error("Erro ao fazer upload:", error);
      alert("❌ Erro ao fazer upload do arquivo. Tente novamente.");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!file || !name) {
      alert("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    uploadMutation.mutate({
      file,
      name,
      category,
      tags
    });
  };

  return (
    <Card className="border-none shadow-xl">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-pink-50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Upload de Protocolo PDF
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <FileText className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-sm text-gray-700">
            Faça upload do PDF oficial do protocolo. O arquivo será armazenado e poderá ser visualizado na íntegra, sem alterações.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-base font-medium">
              Nome do Protocolo *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Abortamento - Protocolo HIPS 2025"
              className="mt-2"
              required
            />
          </div>

          <div>
            <Label htmlFor="category" className="text-base font-medium">
              Categoria *
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="obstetricia">Obstetrícia</SelectItem>
                <SelectItem value="ginecologia">Ginecologia</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="tags" className="text-base font-medium">
              Tags (separadas por vírgula)
            </Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Ex: abortamento, AMIU, curetagem, HIPS"
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="file" className="text-base font-medium">
              Arquivo PDF *
            </Label>
            <Input
              id="file"
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files[0])}
              className="mt-2"
              required
            />
            {file && (
              <p className="text-sm text-gray-600 mt-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {file.name}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={uploadMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600"
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Carregando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Carregar Protocolo
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}