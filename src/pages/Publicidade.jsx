
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Megaphone,
  Upload,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Phone,
  MapPin,
  Loader2,
  Shield,
  Clock,
  Heart,
  Baby,
  Sparkles,
  Trash2,
  ZoomIn // Added ZoomIn icon
} from "lucide-react";
import AIAdGenerator from "../components/publicidade/AIAdGenerator";

export default function Publicidade() {
  const [showForm, setShowForm] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [user, setUser] = useState(null);
  const [canPost, setCanPost] = useState(true);
  const [postsToday, setPostsToday] = useState(0);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    clinic_name: "",
    website_link: "",
    contact_phone: "",
    specialty: "ambos",
    image_url: ""
  });
  const [imageFile, setImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false); // State for image modal
  const [selectedImage, setSelectedImage] = useState(""); // State for selected image in modal

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const userAds = await base44.entities.Advertisement.filter({
          created_by: currentUser.email
        }, '-created_date', 100);
        
        const adsToday = userAds.filter(ad => {
          const adDate = new Date(ad.created_date);
          adDate.setHours(0, 0, 0, 0);
          return adDate.getTime() === today.getTime();
        });
        
        setPostsToday(adsToday.length);
        setCanPost(adsToday.length < 3);
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      }
    };
    loadUser();
  }, []);

  const { data: advertisements, isLoading } = useQuery({
    queryKey: ['advertisements'],
    queryFn: () => base44.entities.Advertisement.list('-created_date'),
    initialData: [],
  });

  const createAdMutation = useMutation({
    mutationFn: async (adData) => {
      let imageUrl = adData.image_url || formData.image_url;
      
      if (imageFile && !adData.image_url) {
        const { file_url } = await base44.integrations.Core.UploadFile({
          file: imageFile
        });
        imageUrl = file_url;
      }

      return base44.entities.Advertisement.create({
        ...adData,
        image_url: imageUrl
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advertisements'] });
      setShowForm(false);
      setShowAIGenerator(false);
      setPostsToday(prev => prev + 1);
      setCanPost(postsToday + 1 < 3);
      setFormData({
        title: "",
        description: "",
        clinic_name: "",
        website_link: "",
        contact_phone: "",
        specialty: "ambos",
        image_url: ""
      });
      setImageFile(null);
      alert("Propaganda publicada com sucesso!");
    },
  });

  const deleteAdMutation = useMutation({
    mutationFn: (id) => base44.entities.Advertisement.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advertisements'] });
      alert("Propaganda excluída com sucesso!");
    },
  });

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("A imagem deve ter no máximo 5MB");
        return;
      }
      setImageFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      alert("Você precisa estar logado para publicar");
      base44.auth.redirectToLogin();
      return;
    }

    if (!canPost) {
      alert("Você já publicou 3 propagandas hoje. Aguarde até amanhã.");
      return;
    }

    setIsUploading(true);
    await createAdMutation.mutateAsync(formData);
    setIsUploading(false);
  };

  const handleAIComplete = async (generatedAd) => {
    if (!user) {
      alert("Você precisa estar logado para publicar");
      base44.auth.redirectToLogin();
      return;
    }

    if (!canPost) {
      alert("Você já publicou 3 propagandas hoje. Aguarde até amanhã.");
      return;
    }

    await createAdMutation.mutateAsync(generatedAd);
  };

  const handleDelete = async (adId) => {
    if (window.confirm("Tem certeza que deseja excluir esta propaganda?")) {
      await deleteAdMutation.mutateAsync(adId);
    }
  };

  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
    setIsModalOpen(true);
  };

  const isAdmin = user && (user.email === "rlambaia@yahoo.com" || user.email === "rlambaia2023@gmail.com");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center">
              <Megaphone className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Publicidade Médica</h1>
          </div>
          <p className="text-gray-600">Espaço gratuito para divulgação de serviços médicos em ginecologia e obstetrícia</p>
        </div>

        <Card className="mb-8 border-none shadow-lg bg-gradient-to-r from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Normas de Boa Conduta para Publicidade Médica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700">
            <p><strong>✓</strong> Respeite o Código de Ética Médica (CFM)</p>
            <p><strong>✓</strong> Não faça propaganda enganosa ou sensacionalista</p>
            <p><strong>✓</strong> Não garanta resultados ou prometa curas milagrosas</p>
            <p><strong>✓</strong> Não utilize imagens de pacientes sem autorização</p>
            <p><strong>✓</strong> Não divulgue preços ou promoções de procedimentos</p>
            <p><strong>✓</strong> Mantenha linguagem técnica e profissional</p>
            <p><strong>✓</strong> Cada usuário pode publicar até 3 propagandas por dia</p>
            <p className="text-green-700 font-medium mt-4">
              <CheckCircle className="w-4 h-4 inline mr-1" />
              Suas propagandas são publicadas imediatamente
            </p>
          </CardContent>
        </Card>

        <div className="mb-8 grid md:grid-cols-2 gap-4">
          <Card className="border-2 border-purple-200 hover:border-purple-400 transition-all cursor-pointer"
                onClick={() => !showForm && canPost && user && setShowAIGenerator(true)}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-800 mb-1">Gerar com IA</h3>
                  <p className="text-sm text-gray-600">Design profissional criado automaticamente</p>
                </div>
              </div>
              <Button
                onClick={() => canPost && user && setShowAIGenerator(true)}
                disabled={!canPost || !user}
                className="w-full mt-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {canPost ? "Criar com IA" : `Limite atingido (${postsToday}/3)`}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-200 hover:border-blue-400 transition-all cursor-pointer"
                onClick={() => !showAIGenerator && canPost && user && setShowForm(true)}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Upload className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-800 mb-1">Upload Manual</h3>
                  <p className="text-sm text-gray-600">Faça upload da sua própria propaganda</p>
                </div>
              </div>
              <Button
                onClick={() => canPost && user && setShowForm(true)}
                disabled={!canPost || !user}
                variant="outline"
                className="w-full mt-4"
              >
                <Upload className="w-4 h-4 mr-2" />
                {canPost ? "Fazer Upload" : `Limite atingido (${postsToday}/3)`}
              </Button>
            </CardContent>
          </Card>
        </div>

        {!canPost && user && (
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <Clock className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Você já publicou {postsToday} propaganda(s) hoje (limite: 3 por dia). Você poderá publicar novamente amanhã.
            </AlertDescription>
          </Alert>
        )}

        {canPost && user && postsToday > 0 && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-gray-700">
              Você já publicou {postsToday} propaganda(s) hoje. Ainda pode publicar mais {3 - postsToday}.
            </AlertDescription>
          </Alert>
        )}

        {!user && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-gray-700">
              <strong>Faça login</strong> para publicar seu anúncio gratuito com ou sem IA (até 3 por dia).
            </AlertDescription>
          </Alert>
        )}

        {showAIGenerator && user && canPost && (
          <div className="mb-8">
            <AIAdGenerator
              onClose={() => setShowAIGenerator(false)}
              onComplete={handleAIComplete}
            />
          </div>
        )}

        {showForm && user && canPost && (
          <Card className="mb-8 border-none shadow-xl">
            <CardHeader>
              <CardTitle>Nova Propaganda - Upload Manual</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Ex: Clínica de Ginecologia Dra. Maria Silva"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="clinic_name">Nome da Clínica/Local *</Label>
                  <Input
                    id="clinic_name"
                    value={formData.clinic_name}
                    onChange={(e) => setFormData({...formData, clinic_name: e.target.value})}
                    placeholder="Ex: Clínica Saúde da Mulher"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descrição *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Descreva seus serviços, horários de atendimento, diferenciais..."
                    className="h-32"
                    required
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
                  <Label htmlFor="website_link">Link do Site/Instagram</Label>
                  <Input
                    id="website_link"
                    value={formData.website_link}
                    onChange={(e) => setFormData({...formData, website_link: e.target.value})}
                    placeholder="https://www.suaclinica.com.br ou @instagram"
                  />
                </div>

                <div>
                  <Label htmlFor="contact_phone">Telefone de Contato</Label>
                  <Input
                    id="contact_phone"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                    placeholder="(75) 98148-7519"
                  />
                </div>

                <div>
                  <Label htmlFor="image">Imagem da Propaganda (máx 5MB)</Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="mt-2"
                  />
                  {imageFile && (
                    <p className="text-sm text-gray-600 mt-2">
                      Arquivo: {imageFile.name}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isUploading}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Publicar
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <p className="col-span-full text-center text-gray-500">Carregando...</p>
          ) : advertisements.length > 0 ? (
            advertisements.map((ad) => {
              const SpecialtyIcon = ad.specialty === "ginecologia" ? Heart : 
                                   ad.specialty === "obstetricia" ? Baby : Megaphone;
              
              return (
                <Card key={ad.id} className="border-none shadow-lg hover:shadow-xl transition-all duration-300">
                  {ad.image_url && (
                    <div 
                      className="relative w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-lg overflow-hidden border-b cursor-pointer group"
                      onClick={() => handleImageClick(ad.image_url)}
                    >
                      <img
                        src={ad.image_url}
                        alt={ad.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 rounded-full p-3">
                          <ZoomIn className="w-6 h-6 text-gray-800" />
                        </div>
                      </div>
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <CardTitle className="text-lg">{ad.title}</CardTitle>
                      <Badge className={
                        ad.specialty === "ginecologia" ? "bg-pink-100 text-pink-700" :
                        ad.specialty === "obstetricia" ? "bg-blue-100 text-blue-700" :
                        "bg-purple-100 text-purple-700"
                      }>
                        <SpecialtyIcon className="w-3 h-3 mr-1" />
                        {ad.specialty}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {ad.clinic_name}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-gray-700 line-clamp-3">
                      {ad.description}
                    </p>
                    
                    {ad.contact_phone && (
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {ad.contact_phone}
                      </p>
                    )}
                    
                    {ad.website_link && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        asChild
                      >
                        <a
                          href={ad.website_link.startsWith('http') ? ad.website_link : `https://${ad.website_link}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Visitar Site
                        </a>
                      </Button>
                    )}

                    {isAdmin && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => handleDelete(ad.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </Button>
                    )}

                    <div className="pt-3 border-t text-xs text-gray-500">
                      <span>Publicado por: {ad.created_by}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="col-span-full text-center py-12">
              <Megaphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                Nenhuma propaganda publicada ainda
              </h3>
              <p className="text-gray-500">
                Seja o primeiro a divulgar seus serviços!
              </p>
            </div>
          )}
        </div>

        <Card className="mt-8 border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Temas Permitidos para Publicidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-3 text-sm text-gray-700">
              <div className="flex items-start gap-2">
                <Heart className="w-4 h-4 text-pink-600 mt-0.5" />
                <span>Consultórios de Ginecologia</span>
              </div>
              <div className="flex items-start gap-2">
                <Baby className="w-4 h-4 text-blue-600 mt-0.5" />
                <span>Clínicas de Obstetrícia</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <span>Serviços de Ultrassom Obstétrico</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <span>Laboratórios de Análises Clínicas</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <span>Cursos e Eventos da Especialidade</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <span>Serviços de Saúde da Mulher</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div className="relative max-w-4xl max-h-full overflow-auto" onClick={(e) => e.stopPropagation()}>
            <img src={selectedImage} alt="Expanded Advertisement" className="max-w-full max-h-full object-contain" />
            <Button
              className="absolute top-4 right-4 bg-white text-gray-800 hover:bg-gray-100 rounded-full p-2"
              onClick={() => setIsModalOpen(false)}
            >
              Fechar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
