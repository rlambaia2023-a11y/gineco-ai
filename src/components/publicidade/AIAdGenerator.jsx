import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Loader2, Wand2, X, Check, Upload as UploadIcon, Image as ImageIcon } from "lucide-react";

export default function AIAdGenerator({ onClose, onComplete }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    clinic_name: "",
    doctor_name: "",
    specialty: "ambos",
    services: "",
    location: "",
    contact_phone: "",
    website_link: "",
    style: "profissional"
  });
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedImageFile, setUploadedImageFile] = useState(null);
  const [generatedAd, setGeneratedAd] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("A imagem deve ter no máximo 5MB");
        return;
      }
      
      // Preview da imagem
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result);
      };
      reader.readAsDataURL(file);
      setUploadedImageFile(file);
    }
  };

  const handleGenerateAd = async () => {
    setIsGenerating(true);
    
    try {
      // Gerar texto profissional com IA
      const textPrompt = `Você é um especialista em marketing médico. Crie um texto CURTO e PROFISSIONAL para propaganda de ${formData.specialty === "ambos" ? "ginecologia e obstetrícia" : formData.specialty}.

Informações:
- Nome do médico/clínica: ${formData.clinic_name}${formData.doctor_name ? ` - ${formData.doctor_name}` : ""}
- Serviços: ${formData.services}
- Localização: ${formData.location}

IMPORTANTE:
- Máximo 200 caracteres
- Linguagem profissional e ética
- Não prometa curas ou resultados garantidos
- Foco em qualidade, experiência e cuidado
- Respeitando o Código de Ética Médica

Retorne APENAS o texto da propaganda, sem título ou explicações.`;

      const descriptionText = await base44.integrations.Core.InvokeLLM({
        prompt: textPrompt,
        add_context_from_internet: false
      });

      // Gerar título atrativo
      const titlePrompt = `Crie um título CURTO e PROFISSIONAL (máximo 60 caracteres) para esta propaganda médica:
"${descriptionText}"

Retorne APENAS o título, sem aspas ou explicações.`;

      const titleText = await base44.integrations.Core.InvokeLLM({
        prompt: titlePrompt,
        add_context_from_internet: false
      });

      let imageUrl = "";

      // Se usuário fez upload de imagem, usar ela
      if (uploadedImageFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({
          file: uploadedImageFile
        });
        imageUrl = file_url;
      } else {
        // Se não, gerar imagem única com IA
        const styleDescriptions = {
          profissional: "Clean, professional medical office with modern equipment, bright lighting, organized workspace, medical professional aesthetic, stethoscope and medical tools visible",
          moderno: "Modern minimalist clinic design, elegant pastel colors (soft pink and blue), contemporary medical aesthetic, sleek furniture, natural lighting, calm atmosphere",
          acolhedor: "Warm, welcoming healthcare environment, soft comfortable lighting, caring atmosphere, gentle colors, patient-friendly space, comfortable seating area"
        };

        const specialtyElements = {
          ginecologia: "gynecology clinic, women's health center, pink and purple tones, feminine healthcare symbols, comfortable consultation room",
          obstetricia: "obstetrics clinic, maternity care, baby-related symbols, soft blue and pink colors, prenatal care environment, heartwarming atmosphere",
          ambos: "women's health and maternity clinic, comprehensive care center, balanced pink and blue tones, both gynecology and obstetrics symbols"
        };

        // Adicionar variação aleatória para garantir imagens diferentes
        const variations = [
          "with medical books on shelves",
          "with plants and natural elements",
          "with modern medical technology",
          "with certificates on walls",
          "with comfortable waiting area",
          "with natural window lighting",
          "with professional medical equipment"
        ];
        
        const randomVariation = variations[Math.floor(Math.random() * variations.length)];
        const randomSeed = Math.floor(Math.random() * 1000000);

        const imagePrompt = `Professional medical advertisement photograph for ${formData.specialty === "ambos" ? "gynecology and obstetrics" : formData.specialty} clinic.

Main style: ${styleDescriptions[formData.style]}

Specialty elements: ${specialtyElements[formData.specialty]}

Additional details: ${randomVariation}

Design requirements:
- High quality professional photography
- Medical and healthcare focused
- Trustworthy and ethical appearance
- Clean, organized composition
- Professional color palette appropriate for medical services
- NO text, NO words, NO letters on the image
- Unique composition (seed: ${randomSeed})
- ${formData.specialty === "ginecologia" ? "Focus on women's health" : formData.specialty === "obstetricia" ? "Focus on maternity and prenatal care" : "Balance between gynecology and obstetrics themes"}

IMPORTANT: Create a UNIQUE image, NO text or words visible.`;

        const { url: generatedImageUrl } = await base44.integrations.Core.GenerateImage({
          prompt: imagePrompt
        });
        imageUrl = generatedImageUrl;
      }

      setGeneratedAd({
        title: titleText.trim(),
        description: descriptionText.trim(),
        clinic_name: formData.clinic_name,
        website_link: formData.website_link,
        contact_phone: formData.contact_phone,
        specialty: formData.specialty,
        image_url: imageUrl
      });

      setStep(2);
    } catch (error) {
      console.error("Erro ao gerar propaganda:", error);
      alert("❌ Erro ao gerar propaganda. Tente novamente.");
    }
    
    setIsGenerating(false);
  };

  const handleConfirm = () => {
    onComplete(generatedAd);
  };

  return (
    <Card className="border-none shadow-xl">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Gerar Propaganda com IA
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {step === 1 && (
          <div className="space-y-4">
            <Alert className="border-purple-200 bg-purple-50">
              <Wand2 className="w-4 h-4 text-purple-600" />
              <AlertDescription className="text-sm text-gray-700">
                Nossa IA criará uma propaganda profissional com design moderno e texto otimizado seguindo as normas de ética médica.
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="clinic_name">Nome da Clínica/Consultório *</Label>
              <Input
                id="clinic_name"
                value={formData.clinic_name}
                onChange={(e) => setFormData({...formData, clinic_name: e.target.value})}
                placeholder="Ex: Clínica Saúde da Mulher"
                required
              />
            </div>

            <div>
              <Label htmlFor="doctor_name">Nome do Médico (opcional)</Label>
              <Input
                id="doctor_name"
                value={formData.doctor_name}
                onChange={(e) => setFormData({...formData, doctor_name: e.target.value})}
                placeholder="Ex: Dra. Maria Silva"
              />
            </div>

            <div>
              <Label htmlFor="specialty">Especialidade *</Label>
              <Select
                value={formData.specialty}
                onValueChange={(value) => setFormData({...formData, specialty: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ginecologia">Ginecologia</SelectItem>
                  <SelectItem value="obstetricia">Obstetrícia</SelectItem>
                  <SelectItem value="ambos">Ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="services">Principais Serviços *</Label>
              <Textarea
                id="services"
                value={formData.services}
                onChange={(e) => setFormData({...formData, services: e.target.value})}
                placeholder="Ex: Consultas, pré-natal, ultrassom, cirurgias ginecológicas"
                className="h-20"
                required
              />
            </div>

            <div>
              <Label htmlFor="location">Localização *</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="Ex: Centro - Salvador/BA"
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_phone">Telefone</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                  placeholder="(75) 98148-7519"
                />
              </div>

              <div>
                <Label htmlFor="website_link">Site/Instagram</Label>
                <Input
                  id="website_link"
                  value={formData.website_link}
                  onChange={(e) => setFormData({...formData, website_link: e.target.value})}
                  placeholder="@instagram"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="style">Estilo Visual *</Label>
              <Select
                value={formData.style}
                onValueChange={(value) => setFormData({...formData, style: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="profissional">Profissional Clássico</SelectItem>
                  <SelectItem value="moderno">Moderno Minimalista</SelectItem>
                  <SelectItem value="acolhedor">Acolhedor e Humanizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
              <Label className="text-base font-medium mb-3 block">
                <ImageIcon className="w-5 h-5 inline mr-2" />
                Imagem da Propaganda (opcional)
              </Label>
              <p className="text-sm text-gray-600 mb-4">
                Você pode fazer upload da sua própria imagem ou deixar em branco para a IA gerar uma imagem profissional automaticamente.
              </p>
              
              {uploadedImage ? (
                <div className="space-y-3">
                  <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={uploadedImage}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUploadedImage(null);
                        setUploadedImageFile(null);
                      }}
                      className="flex-1"
                    >
                      Remover Imagem
                    </Button>
                    <Label htmlFor="image-upload" className="flex-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        asChild
                      >
                        <span>
                          <UploadIcon className="w-4 h-4 mr-2" />
                          Trocar Imagem
                        </span>
                      </Button>
                    </Label>
                  </div>
                </div>
              ) : (
                <Label htmlFor="image-upload">
                  <div className="flex flex-col items-center justify-center py-8 cursor-pointer hover:bg-gray-100 rounded-lg transition-colors">
                    <UploadIcon className="w-12 h-12 text-gray-400 mb-3" />
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Clique para fazer upload de imagem
                    </p>
                    <p className="text-xs text-gray-500">
                      Ou deixe em branco para a IA gerar automaticamente
                    </p>
                  </div>
                </Label>
              )}
              
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            <Button
              onClick={handleGenerateAd}
              disabled={!formData.clinic_name || !formData.services || !formData.location || isGenerating}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Gerando propaganda com IA...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Gerar Propaganda
                </>
              )}
            </Button>
          </div>
        )}

        {step === 2 && generatedAd && (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <Check className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-sm text-gray-700">
                <strong>Propaganda gerada com sucesso!</strong> Revise e confirme para publicar.
              </AlertDescription>
            </Alert>

            <div className="bg-gradient-to-r from-blue-50 to-pink-50 p-6 rounded-xl">
              <h3 className="font-bold text-lg mb-4 text-gray-800">Preview da Propaganda:</h3>
              
              {generatedAd.image_url && (
                <div className="mb-4 rounded-lg overflow-hidden shadow-lg">
                  <img
                    src={generatedAd.image_url}
                    alt="Propaganda gerada"
                    className="w-full h-64 object-cover"
                  />
                </div>
              )}

              <div className="bg-white p-4 rounded-lg shadow space-y-3">
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">TÍTULO</p>
                  <p className="font-bold text-lg text-gray-800">{generatedAd.title}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">DESCRIÇÃO</p>
                  <p className="text-gray-700 leading-relaxed">{generatedAd.description}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">LOCAL</p>
                  <p className="text-gray-700">{generatedAd.clinic_name}</p>
                </div>

                {generatedAd.contact_phone && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">CONTATO</p>
                    <p className="text-gray-700">{generatedAd.contact_phone}</p>
                  </div>
                )}

                {generatedAd.website_link && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">SITE/REDE SOCIAL</p>
                    <p className="text-blue-600">{generatedAd.website_link}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1"
              >
                Gerar Novamente
              </Button>
              <Button
                onClick={handleConfirm}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                <Check className="w-4 h-4 mr-2" />
                Confirmar e Publicar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}