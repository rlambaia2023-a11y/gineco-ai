import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Heart, Sparkles, Code } from "lucide-react";

export default function Credits() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-pink-400 rounded-xl flex items-center justify-center">
              <Info className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Créditos</h1>
          </div>
          <p className="text-gray-600">Conheça a equipe por trás do Gineco-AI</p>
        </div>

        <Card className="border-none shadow-xl mb-6 bg-gradient-to-br from-blue-500 to-pink-500">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-10 h-10 text-blue-500" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Gineco-AI</h2>
            <p className="text-blue-50 text-lg">@2025</p>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl flex items-center justify-center">
                  <Heart className="w-6 h-6 text-pink-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Ideia</CardTitle>
                  <p className="text-sm text-gray-500">Concepção e visão</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-800">Dra. Mayara Miranda</p>
              <p className="text-gray-600 mt-2">
                Responsável pela idealização e concepção do projeto Gineco-AI, 
                com foco em melhorar o acesso a protocolos médicos atualizados de ginecologia e obstetrícia.
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                  <Code className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Criação</CardTitle>
                  <p className="text-sm text-gray-500">Desenvolvimento e implementação</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-800">Harrison Ribeiro Costa</p>
              <p className="text-gray-600 mt-2">
                Responsável pelo desenvolvimento e implementação técnica da aplicação, 
                incluindo a integração com inteligência artificial e design da interface.
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-r from-blue-50 to-pink-50">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-800 mb-3">Sobre o Projeto</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                O <strong>Gineco-AI</strong> é uma aplicação médica inovadora que utiliza inteligência artificial 
                para fornecer acesso rápido e atualizado a protocolos de ginecologia e obstetrícia, 
                artigos científicos recentes e soluções para casos clínicos.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Nossa missão é auxiliar profissionais de saúde com informações precisas, 
                atualizadas e baseadas em evidências científicas, sempre priorizando o 
                melhor cuidado aos pacientes.
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg border-l-4 border-blue-500">
            <CardContent className="p-6">
              <p className="text-sm text-gray-600 italic leading-relaxed">
                <strong>Aviso importante:</strong> As informações fornecidas por esta aplicação são para fins 
                educacionais e de referência. Sempre consulte protocolos institucionais e 
                profissionais especializados para decisões clínicas. Não substitui o julgamento 
                clínico profissional.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}