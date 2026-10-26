
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { 
  BookOpen, 
  Search, 
  History, 
  Sparkles,
  ArrowRight,
  Heart,
  Baby,
  Calculator,
  Megaphone,
  ZoomIn
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import AdModal from "../components/publicidade/AdModal";

export default function Home() {
  const [selectedAd, setSelectedAd] = useState(null);

  const features = [
    {
      icon: BookOpen,
      title: "Protocolos Médicos",
      description: "Acesse protocolos completos e resumidos de ginecologia e obstetrícia",
      link: createPageUrl("Protocols"),
      gradient: "from-blue-400 to-blue-500"
    },
    {
      icon: Calculator,
      title: "Calculadoras",
      description: "Calcule idade gestacional, peso fetal e outras medidas obstétricas",
      link: createPageUrl("Calculator"),
      gradient: "from-purple-400 to-purple-500"
    },
    {
      icon: Search,
      title: "Busca Inteligente",
      description: "Pesquise casos e obtenha soluções atualizadas com IA",
      link: createPageUrl("Search"),
      gradient: "from-pink-400 to-pink-500"
    },
    {
      icon: Megaphone,
      title: "Publicidade",
      description: "Publique gratuitamente propagandas de sua clínica ou serviços",
      link: createPageUrl("Publicidade"),
      gradient: "from-emerald-400 to-emerald-500"
    },
    {
      icon: History,
      title: "Histórico",
      description: "Revise todas as suas consultas e pesquisas anteriores",
      link: createPageUrl("History"),
      gradient: "from-indigo-400 to-indigo-500"
    }
  ];

  const specialties = [
    {
      icon: Heart,
      title: "Ginecologia",
      count: "Protocolos completos"
    },
    {
      icon: Baby,
      title: "Obstetrícia",
      count: "Guias atualizados"
    }
  ];

  const { data: recentAds } = useQuery({
    queryKey: ['recent-advertisements'],
    queryFn: () => base44.entities.Advertisement.list('-created_date', 6),
    initialData: [],
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 lg:py-12">
        <div className="text-center mb-6 sm:mb-8 md:mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-pink-100 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full mb-3 sm:mb-4 md:mb-6">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
            <span className="text-xs sm:text-sm font-medium text-gray-700">Inteligência Artificial Médica</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-2 sm:mb-3 md:mb-4 bg-gradient-to-r from-blue-600 to-pink-600 bg-clip-text text-transparent px-2 sm:px-4">
            Gineco-AI
          </h1>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed px-4">
            Sua assistente inteligente para protocolos de ginecologia e obstetrícia com ferramentas práticas
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8 md:mb-12">
          {specialties.map((specialty, index) => (
            <Card key={index} className="border-none shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
              <CardContent className="p-4 sm:p-6 md:p-8">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-blue-100 to-pink-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <specialty.icon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">{specialty.title}</h3>
                    <p className="text-xs sm:text-sm md:text-base text-gray-600">{specialty.count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8 md:mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="border-none shadow-lg bg-white hover:shadow-xl transition-all duration-300 group">
              <CardHeader className="p-4 sm:p-6">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-2 sm:mb-3 md:mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
                </div>
                <CardTitle className="text-base sm:text-lg md:text-xl text-gray-800">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <p className="text-gray-600 mb-3 sm:mb-4 leading-relaxed text-xs sm:text-sm md:text-base">{feature.description}</p>
                <Link to={feature.link}>
                  <Button variant="ghost" className="w-full group/btn hover:bg-gradient-to-r hover:from-blue-50 hover:to-pink-50 text-xs sm:text-sm">
                    Acessar
                    <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {recentAds.length > 0 && (
          <div className="mb-6 sm:mb-8 md:mb-12">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-1 sm:mb-2">
                  Publicidade Médica
                </h2>
                <p className="text-sm sm:text-base text-gray-600">Serviços e clínicas de ginecologia e obstetrícia</p>
              </div>
              <Link to={createPageUrl("Publicidade")}>
                <Button variant="outline" className="w-full sm:w-auto text-xs sm:text-sm">
                  Ver Todas
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-2" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {recentAds.map((ad) => {
                const SpecialtyIcon = ad.specialty === "ginecologia" ? Heart : 
                                     ad.specialty === "obstetricia" ? Baby : Sparkles;
                
                return (
                  <Card 
                    key={ad.id} 
                    className="border-none shadow-lg hover:shadow-xl transition-all duration-300 group cursor-pointer"
                    onClick={() => setSelectedAd(ad)}
                  >
                    {ad.image_url && (
                      <div className="relative w-full h-40 sm:h-48 md:h-52 bg-gradient-to-br from-gray-100 to-gray-200 rounded-t-lg overflow-hidden border-b">
                        <img
                          src={ad.image_url}
                          alt={ad.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 rounded-full p-2 sm:p-3">
                            <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-gray-800" />
                          </div>
                        </div>
                      </div>
                    )}
                    <CardHeader className="p-3 sm:p-4 md:p-6">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <CardTitle className="text-sm sm:text-base md:text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {ad.title}
                        </CardTitle>
                        <SpecialtyIcon className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${
                          ad.specialty === "ginecologia" ? "text-pink-600" :
                          ad.specialty === "obstetricia" ? "text-blue-600" :
                          "text-purple-600"
                        }`} />
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-gray-600">
                        {ad.clinic_name}
                      </p>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0 md:p-6 md:pt-0">
                      <p className="text-xs sm:text-sm text-gray-700 line-clamp-2 mb-3">
                        {ad.description}
                      </p>
                      {ad.website_link && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs sm:text-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(
                              ad.website_link.startsWith('http') ? ad.website_link : `https://${ad.website_link}`,
                              '_blank',
                              'noopener,noreferrer'
                            );
                          }}
                        >
                          Visitar
                          <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-2" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <Card className="border-none shadow-xl bg-gradient-to-r from-blue-500 to-pink-500">
          <CardContent className="p-4 sm:p-6 md:p-8 lg:p-12 text-center">
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white mb-2 sm:mb-3 md:mb-4">
              Comece sua pesquisa agora
            </h2>
            <p className="text-blue-50 mb-3 sm:mb-4 md:mb-6 max-w-2xl mx-auto text-xs sm:text-sm md:text-base">
              Utilize nossa busca inteligente para encontrar protocolos, artigos científicos e soluções para casos clínicos
            </p>
            <Link to={createPageUrl("Search")}>
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 font-medium px-4 sm:px-6 md:px-8 text-sm sm:text-base">
                Iniciar Busca
                <Search className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <AdModal ad={selectedAd} onClose={() => setSelectedAd(null)} />
    </div>
  );
}
