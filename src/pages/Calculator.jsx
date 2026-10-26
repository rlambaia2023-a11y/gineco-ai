import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calculator as CalculatorIcon, Calendar, Baby, AlertCircle, Stethoscope } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Data "AAAA-MM-DD" interpretada no fuso local. Antes, new Date(dum)
// era meia-noite UTC, que no Brasil vira o dia anterior, e a DPP saía
// 1 dia antes do correto.
function parseDateLocal(value) {
  const [y, m, d] = String(value).split("-").map(Number);
  return new Date(y, m - 1, d);
}
function todayMidnight() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

export default function Calculator() {
  // Estado para cálculo por DUM
  const [dum, setDum] = useState("");
  const [resultDum, setResultDum] = useState(null);

  // Estado para cálculo por USG
  const [usgDate, setUsgDate] = useState("");
  const [usgWeeks, setUsgWeeks] = useState("");
  const [usgDays, setUsgDays] = useState("");
  const [resultUsg, setResultUsg] = useState(null);

  // Estado para cálculo de peso fetal
  const [dbp, setDbp] = useState("");
  const [cc, setCc] = useState("");
  const [ca, setCa] = useState("");
  const [fl, setFl] = useState("");
  const [resultWeight, setResultWeight] = useState(null);

  // Estado para Escore de Bishop
  const [dilatacao, setDilatacao] = useState("");
  const [esvaecimento, setEsvaecimento] = useState("");
  const [consistencia, setConsistencia] = useState("");
  const [posicao, setPosicao] = useState("");
  const [altura, setAltura] = useState("");
  const [resultBishop, setResultBishop] = useState(null);

  const calculateByDum = () => {
    if (!dum) {
      alert("Por favor, insira a data da última menstruação");
      return;
    }

    const dumDate = parseDateLocal(dum);
    const today = todayMidnight();

    const diffTime = Math.abs(today - dumDate);
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    const weeks = Math.floor(diffDays / 7);
    const days = diffDays % 7;
    
    const dpp = new Date(dumDate);
    dpp.setDate(dpp.getDate() + 280);
    
    let trimester = "";
    if (weeks < 13) trimester = "1º Trimestre";
    else if (weeks < 27) trimester = "2º Trimestre";
    else trimester = "3º Trimestre";
    
    setResultDum({
      weeks,
      days,
      dpp: dpp.toLocaleDateString('pt-BR'),
      trimester,
      totalDays: diffDays
    });
  };

  const calculateByUsg = () => {
    if (!usgDate || !usgWeeks) {
      alert("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    const usgDateObj = parseDateLocal(usgDate);
    const today = todayMidnight();

    const diffTime = Math.abs(today - usgDateObj);
    const daysSinceUsg = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    const usgWeeksInt = parseInt(usgWeeks) || 0;
    const usgDaysInt = parseInt(usgDays) || 0;
    const usgTotalDays = (usgWeeksInt * 7) + usgDaysInt;
    
    const currentTotalDays = usgTotalDays + daysSinceUsg;
    const currentWeeks = Math.floor(currentTotalDays / 7);
    const currentDays = currentTotalDays % 7;
    
    const correctedDum = new Date(usgDateObj);
    correctedDum.setDate(correctedDum.getDate() - usgTotalDays);
    
    const dpp = new Date(correctedDum);
    dpp.setDate(dpp.getDate() + 280);
    
    let trimester = "";
    if (currentWeeks < 13) trimester = "1º Trimestre";
    else if (currentWeeks < 27) trimester = "2º Trimestre";
    else trimester = "3º Trimestre";
    
    setResultUsg({
      weeks: currentWeeks,
      days: currentDays,
      dpp: dpp.toLocaleDateString('pt-BR'),
      correctedDum: correctedDum.toLocaleDateString('pt-BR'),
      trimester,
      totalDays: currentTotalDays
    });
  };

  const calculateFetalWeight = () => {
    if (!dbp || !cc || !ca || !fl) {
      alert("Por favor, preencha todas as medidas biométricas");
      return;
    }

    // Fórmula de Hadlock (1985): log10 do peso, com as medidas em cm.
    // A tela pede mm, então converte para cm antes de calcular. O DBP
    // não entra nesta variante da fórmula (usa CC, CA e FL).
    const ccVal = parseFloat(cc) / 10;
    const caVal = parseFloat(ca) / 10;
    const flVal = parseFloat(fl) / 10;

    const logWeight = 1.326 - 0.00326 * caVal * flVal +
                     0.0107 * ccVal + 0.0438 * caVal +
                     0.158 * flVal;
    const weight = Math.pow(10, logWeight);
    
    let percentil = "";
    if (weight < 2500) percentil = "Abaixo do esperado";
    else if (weight <= 3500) percentil = "Adequado para idade gestacional";
    else percentil = "Acima do esperado";

    setResultWeight({
      weight: weight.toFixed(0),
      percentil
    });
  };

  const calculateBishop = () => {
    if (!dilatacao || !esvaecimento || !consistencia || !posicao || !altura) {
      alert("Por favor, preencha todos os campos do Escore de Bishop");
      return;
    }

    const total = parseInt(dilatacao) + parseInt(esvaecimento) + 
                  parseInt(consistencia) + parseInt(posicao) + parseInt(altura);

    let interpretacao = "";
    let recomendacao = "";
    let taxaSucesso = "";
    let color = "";

    if (total >= 9) {
      interpretacao = "Condições Extremamente Favoráveis";
      recomendacao = "Alto índice de sucesso na indução do parto. Condições ideais para iniciar indução.";
      taxaSucesso = "Taxa de sucesso >90%";
      color = "text-green-600 bg-green-50";
    } else if (total >= 8) {
      interpretacao = "Condições Muito Favoráveis";
      recomendacao = "Boas condições cervicais. Indução tem alta probabilidade de sucesso.";
      taxaSucesso = "Taxa de sucesso 85-90%";
      color = "text-green-600 bg-green-50";
    } else if (total >= 6) {
      interpretacao = "Condições Moderadamente Favoráveis";
      recomendacao = "Condições cervicais intermediárias. Indução pode ser tentada, mas considerar amadurecimento cervical.";
      taxaSucesso = "Taxa de sucesso 60-75%";
      color = "text-yellow-600 bg-yellow-50";
    } else if (total >= 4) {
      interpretacao = "Condições Desfavoráveis";
      recomendacao = "Amadurecimento cervical recomendado antes da indução (misoprostol, dinoprostone ou balão).";
      taxaSucesso = "Taxa de sucesso 40-50%";
      color = "text-orange-600 bg-orange-50";
    } else {
      interpretacao = "Condições Muito Desfavoráveis";
      recomendacao = "Amadurecimento cervical OBRIGATÓRIO antes da indução. Considerar cesárea se indicação urgente.";
      taxaSucesso = "Taxa de sucesso <30%";
      color = "text-red-600 bg-red-50";
    }

    setResultBishop({
      total,
      interpretacao,
      recomendacao,
      taxaSucesso,
      color
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-blue-400 rounded-xl flex items-center justify-center">
              <CalculatorIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Calculadoras Obstétricas</h1>
          </div>
          <p className="text-gray-600">Ferramentas para cálculo de idade gestacional e outras medidas obstétricas</p>
        </div>

        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <AlertCircle className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-gray-700">
            <strong>Importante:</strong> Estas calculadoras são ferramentas auxiliares. 
            Sempre considere o contexto clínico completo para decisões obstétricas.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="dum" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 bg-white shadow-lg">
            <TabsTrigger value="dum" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-100 data-[state=active]:to-pink-100">
              <Calendar className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Por DUM</span>
              <span className="sm:inline lg:hidden">DUM</span>
            </TabsTrigger>
            <TabsTrigger value="usg" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-100 data-[state=active]:to-pink-100">
              <Baby className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Por USG</span>
              <span className="sm:inline lg:hidden">USG</span>
            </TabsTrigger>
            <TabsTrigger value="weight" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-100 data-[state=active]:to-pink-100">
              <CalculatorIcon className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Peso Fetal</span>
              <span className="sm:inline lg:hidden">Peso</span>
            </TabsTrigger>
            <TabsTrigger value="bishop" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-100 data-[state=active]:to-pink-100">
              <Stethoscope className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Escore Bishop</span>
              <span className="sm:inline lg:hidden">Bishop</span>
            </TabsTrigger>
          </TabsList>

          {/* Cálculo por DUM */}
          <TabsContent value="dum">
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-pink-50">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Idade Gestacional pela Data da Última Menstruação
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="dum" className="text-base font-medium">
                      Data da Última Menstruação (DUM)
                    </Label>
                    <Input
                      id="dum"
                      type="date"
                      value={dum}
                      onChange={(e) => setDum(e.target.value)}
                      className="mt-2 h-12 text-base"
                    />
                  </div>

                  <Button
                    onClick={calculateByDum}
                    className="w-full h-12 bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white font-medium"
                  >
                    <CalculatorIcon className="w-5 h-5 mr-2" />
                    Calcular Idade Gestacional
                  </Button>

                  {resultDum && (
                    <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-pink-50 rounded-xl border-2 border-blue-200">
                      <h3 className="font-bold text-lg mb-4 text-gray-800">Resultados:</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-lg shadow">
                          <p className="text-sm text-gray-600 mb-1">Idade Gestacional Atual</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {resultDum.weeks} semanas e {resultDum.days} dias
                          </p>
                          <Badge className="mt-2 bg-blue-100 text-blue-700">
                            {resultDum.trimester}
                          </Badge>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                          <p className="text-sm text-gray-600 mb-1">Data Provável do Parto (DPP)</p>
                          <p className="text-2xl font-bold text-pink-600">
                            {resultDum.dpp}
                          </p>
                          <p className="text-sm text-gray-500 mt-2">
                            Total: {resultDum.totalDays} dias
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cálculo por USG */}
          <TabsContent value="usg">
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-pink-50">
                <CardTitle className="flex items-center gap-2">
                  <Baby className="w-5 h-5 text-blue-600" />
                  Idade Gestacional por Ultrassom
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="usgDate" className="text-base font-medium">
                      Data do Ultrassom
                    </Label>
                    <Input
                      id="usgDate"
                      type="date"
                      value={usgDate}
                      onChange={(e) => setUsgDate(e.target.value)}
                      className="mt-2 h-12 text-base"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="usgWeeks" className="text-base font-medium">
                        Semanas no USG
                      </Label>
                      <Input
                        id="usgWeeks"
                        type="number"
                        placeholder="Ex: 12"
                        value={usgWeeks}
                        onChange={(e) => setUsgWeeks(e.target.value)}
                        className="mt-2 h-12 text-base"
                        min="0"
                        max="42"
                      />
                    </div>
                    <div>
                      <Label htmlFor="usgDays" className="text-base font-medium">
                        Dias no USG (opcional)
                      </Label>
                      <Input
                        id="usgDays"
                        type="number"
                        placeholder="Ex: 3"
                        value={usgDays}
                        onChange={(e) => setUsgDays(e.target.value)}
                        className="mt-2 h-12 text-base"
                        min="0"
                        max="6"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={calculateByUsg}
                    className="w-full h-12 bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white font-medium"
                  >
                    <CalculatorIcon className="w-5 h-5 mr-2" />
                    Calcular Idade Gestacional
                  </Button>

                  {resultUsg && (
                    <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-pink-50 rounded-xl border-2 border-blue-200">
                      <h3 className="font-bold text-lg mb-4 text-gray-800">Resultados:</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-lg shadow">
                          <p className="text-sm text-gray-600 mb-1">Idade Gestacional Atual</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {resultUsg.weeks} semanas e {resultUsg.days} dias
                          </p>
                          <Badge className="mt-2 bg-blue-100 text-blue-700">
                            {resultUsg.trimester}
                          </Badge>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow">
                          <p className="text-sm text-gray-600 mb-1">Data Provável do Parto (DPP)</p>
                          <p className="text-2xl font-bold text-pink-600">
                            {resultUsg.dpp}
                          </p>
                          <p className="text-sm text-gray-500 mt-2">
                            DUM corrigida: {resultUsg.correctedDum}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cálculo de Peso Fetal */}
          <TabsContent value="weight">
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-pink-50">
                <CardTitle className="flex items-center gap-2">
                  <CalculatorIcon className="w-5 h-5 text-blue-600" />
                  Estimativa de Peso Fetal (Fórmula de Hadlock)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <Alert className="border-purple-200 bg-purple-50">
                    <AlertCircle className="w-4 h-4 text-purple-600" />
                    <AlertDescription className="text-sm text-gray-700">
                      Insira as medidas biométricas do ultrassom em milímetros (mm). A fórmula de Hadlock usa CC, CA e FL (o DBP fica registrado como dado do exame).
                    </AlertDescription>
                  </Alert>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dbp" className="text-base font-medium">
                        Diâmetro Biparietal (DBP) em mm
                      </Label>
                      <Input
                        id="dbp"
                        type="number"
                        placeholder="Ex: 85"
                        value={dbp}
                        onChange={(e) => setDbp(e.target.value)}
                        className="mt-2 h-12 text-base"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cc" className="text-base font-medium">
                        Circunferência Cefálica (CC) em mm
                      </Label>
                      <Input
                        id="cc"
                        type="number"
                        placeholder="Ex: 310"
                        value={cc}
                        onChange={(e) => setCc(e.target.value)}
                        className="mt-2 h-12 text-base"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ca" className="text-base font-medium">
                        Circunferência Abdominal (CA) em mm
                      </Label>
                      <Input
                        id="ca"
                        type="number"
                        placeholder="Ex: 280"
                        value={ca}
                        onChange={(e) => setCa(e.target.value)}
                        className="mt-2 h-12 text-base"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="fl" className="text-base font-medium">
                        Comprimento do Fêmur (FL) em mm
                      </Label>
                      <Input
                        id="fl"
                        type="number"
                        placeholder="Ex: 65"
                        value={fl}
                        onChange={(e) => setFl(e.target.value)}
                        className="mt-2 h-12 text-base"
                        step="0.1"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={calculateFetalWeight}
                    className="w-full h-12 bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white font-medium"
                  >
                    <CalculatorIcon className="w-5 h-5 mr-2" />
                    Calcular Peso Fetal
                  </Button>

                  {resultWeight && (
                    <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-pink-50 rounded-xl border-2 border-blue-200">
                      <h3 className="font-bold text-lg mb-4 text-gray-800">Resultados:</h3>
                      <div className="bg-white p-6 rounded-lg shadow text-center">
                        <p className="text-sm text-gray-600 mb-2">Peso Fetal Estimado</p>
                        <p className="text-4xl font-bold text-blue-600 mb-2">
                          {resultWeight.weight} gramas
                        </p>
                        <p className="text-lg text-pink-600 font-medium">
                          {(resultWeight.weight / 1000).toFixed(2)} kg
                        </p>
                        <Badge className="mt-4 bg-purple-100 text-purple-700 text-base px-4 py-2">
                          {resultWeight.percentil}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Escore de Bishop */}
          <TabsContent value="bishop">
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-pink-50">
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-blue-600" />
                  Escore de Bishop (Maturidade Cervical)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <Alert className="border-purple-200 bg-purple-50">
                    <AlertCircle className="w-4 h-4 text-purple-600" />
                    <AlertDescription className="text-sm text-gray-700">
                      O Escore de Bishop avalia a maturidade cervical e prediz o sucesso da indução do parto.
                      Pontuação total: 0-13 pontos. ≥8 pontos = condições favoráveis para indução.
                    </AlertDescription>
                  </Alert>

                  {/* Dilatação Cervical */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">
                      1. Dilatação Cervical
                    </Label>
                    <RadioGroup value={dilatacao} onValueChange={setDilatacao}>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value="0" id="dil0" />
                        <Label htmlFor="dil0" className="flex-1 cursor-pointer">
                          Fechado (0 pontos)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value="1" id="dil1" />
                        <Label htmlFor="dil1" className="flex-1 cursor-pointer">
                          1-2 cm (1 ponto)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value="2" id="dil2" />
                        <Label htmlFor="dil2" className="flex-1 cursor-pointer">
                          3-4 cm (2 pontos)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value="3" id="dil3" />
                        <Label htmlFor="dil3" className="flex-1 cursor-pointer">
                          ≥5 cm (3 pontos)
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Esvaecimento/Apagamento */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">
                      2. Esvaecimento/Apagamento Cervical
                    </Label>
                    <RadioGroup value={esvaecimento} onValueChange={setEsvaecimento}>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value="0" id="esv0" />
                        <Label htmlFor="esv0" className="flex-1 cursor-pointer">
                          0-30% (0 pontos)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value="1" id="esv1" />
                        <Label htmlFor="esv1" className="flex-1 cursor-pointer">
                          40-50% (1 ponto)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value="2" id="esv2" />
                        <Label htmlFor="esv2" className="flex-1 cursor-pointer">
                          60-70% (2 pontos)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value="3" id="esv3" />
                        <Label htmlFor="esv3" className="flex-1 cursor-pointer">
                          ≥80% (3 pontos)
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Consistência */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">
                      3. Consistência do Colo
                    </Label>
                    <RadioGroup value={consistencia} onValueChange={setConsistencia}>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value="0" id="cons0" />
                        <Label htmlFor="cons0" className="flex-1 cursor-pointer">
                          Firme (0 pontos)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value="1" id="cons1" />
                        <Label htmlFor="cons1" className="flex-1 cursor-pointer">
                          Médio (1 ponto)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value="2" id="cons2" />
                        <Label htmlFor="cons2" className="flex-1 cursor-pointer">
                          Amolecido (2 pontos)
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Posição */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">
                      4. Posição do Colo
                    </Label>
                    <RadioGroup value={posicao} onValueChange={setPosicao}>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value="0" id="pos0" />
                        <Label htmlFor="pos0" className="flex-1 cursor-pointer">
                          Posterior (0 pontos)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value="1" id="pos1" />
                        <Label htmlFor="pos1" className="flex-1 cursor-pointer">
                          Intermediário (1 ponto)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value="2" id="pos2" />
                        <Label htmlFor="pos2" className="flex-1 cursor-pointer">
                          Anterior (2 pontos)
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Altura da Apresentação */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">
                      5. Altura da Apresentação Fetal (Planos de De Lee)
                    </Label>
                    <RadioGroup value={altura} onValueChange={setAltura}>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value="0" id="alt0" />
                        <Label htmlFor="alt0" className="flex-1 cursor-pointer">
                          -3 (0 pontos) - Alta/móvel
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value="1" id="alt1" />
                        <Label htmlFor="alt1" className="flex-1 cursor-pointer">
                          -2 (1 ponto)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value="2" id="alt2" />
                        <Label htmlFor="alt2" className="flex-1 cursor-pointer">
                          -1, 0 (2 pontos) - Insinuada
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value="3" id="alt3" />
                        <Label htmlFor="alt3" className="flex-1 cursor-pointer">
                          +1, +2 (3 pontos) - Baixa
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Button
                    onClick={calculateBishop}
                    className="w-full h-12 bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white font-medium"
                  >
                    <CalculatorIcon className="w-5 h-5 mr-2" />
                    Calcular Escore de Bishop
                  </Button>

                  {resultBishop && (
                    <div className="mt-6 space-y-4">
                      <div className={`p-6 rounded-xl border-2 ${resultBishop.color}`}>
                        <div className="text-center mb-4">
                          <p className="text-sm font-medium mb-2">Escore Total de Bishop</p>
                          <p className="text-5xl font-bold mb-2">
                            {resultBishop.total}
                          </p>
                          <p className="text-sm">de 13 pontos</p>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="bg-white p-4 rounded-lg">
                            <p className="font-semibold text-lg mb-1">
                              {resultBishop.interpretacao}
                            </p>
                            <p className="text-sm text-gray-600">
                              {resultBishop.taxaSucesso}
                            </p>
                          </div>
                          
                          <div className="bg-white p-4 rounded-lg">
                            <p className="font-semibold mb-2">Recomendação Clínica:</p>
                            <p className="text-gray-700 leading-relaxed">
                              {resultBishop.recomendacao}
                            </p>
                          </div>
                        </div>
                      </div>

                      <Alert className="border-blue-200 bg-blue-50">
                        <AlertCircle className="w-4 h-4 text-blue-600" />
                        <AlertDescription className="text-sm text-gray-700">
                          <strong>Interpretação Geral:</strong>
                          <ul className="mt-2 space-y-1 text-xs">
                            <li>• ≥9 pontos: Condições ideais, alta taxa de sucesso</li>
                            <li>• 8 pontos: Condições muito favoráveis</li>
                            <li>• 6-7 pontos: Condições moderadas, considerar amadurecimento</li>
                            <li>• 4-5 pontos: Amadurecimento cervical recomendado</li>
                            <li>• {'<'}4 pontos: Amadurecimento obrigatório ou considerar cesárea</li>
                          </ul>
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="mt-6 border-none shadow-lg bg-gradient-to-r from-blue-50 to-pink-50">
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-800 mb-3">Informações Importantes:</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>A idade gestacional pela DUM é mais precisa em mulheres com ciclos regulares</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>O USG do 1º trimestre (até 13 semanas) é o método mais preciso para datar gestação</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Discrepâncias {'>'}7 dias entre DUM e USG devem usar a data do USG</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>A estimativa de peso fetal tem margem de erro de ±10-15%</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>O Escore de Bishop deve ser avaliado em conjunto com outros parâmetros clínicos</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}