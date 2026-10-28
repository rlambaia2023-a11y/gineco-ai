import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Stethoscope, Brain, FlaskConical, ClipboardList, BookOpen, Star, Trash2, Loader2, AlertTriangle, ShieldAlert, History as HistoryIcon } from "lucide-react";

// Análise de caso clínico — módulo novo dentro do Gineco-AI, código próprio.
// Função inspirada no que um app de apoio clínico faz, refeita do zero para
// ginecologia e obstetrícia. Só para profissional logado, só com o caso
// anonimizado, e sempre com o aviso de que não substitui o julgamento do
// profissional. A prescrição, quando aparece, é só rascunho para revisão.
const AVISO = "Apoio ao raciocínio clínico. Não substitui o julgamento profissional, não fecha diagnóstico sozinho e não prescreve sozinho. Em sinal de emergência, atenda pela via de emergência, sem esperar a IA.";

function probColor(p) {
  if (p === "alta") return "bg-red-100 text-red-700 border-red-200";
  if (p === "baixa") return "bg-gray-100 text-gray-700 border-gray-200";
  return "bg-yellow-100 text-yellow-700 border-yellow-200";
}

export default function CaseAnalysis() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [caso, setCaso] = useState("");
  const [examesTexto, setExamesTexto] = useState("");
  const [anonimo, setAnonimo] = useState(false);
  const [atual, setAtual] = useState(null);
  const [erro, setErro] = useState(null);
  const [analisando, setAnalisando] = useState(false);
  const [casos, setCasos] = useState([]);
  const [soFavoritos, setSoFavoritos] = useState(false);

  const carregarCasos = async (favoritos) => {
    try {
      const lista = await base44.cases.list(favoritos);
      setCasos(lista);
    } catch { setCasos([]); }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);
        carregarCasos(false);
      } catch { setUser(null); }
      finally { setLoadingUser(false); }
    };
    init();
  }, []);

  const handleAnalisar = async () => {
    setErro(null);
    if (!anonimo) { setErro("Confirme que o caso não tem nome, CPF, endereço ou qualquer identificador, antes de analisar."); return; }
    if (caso.trim().length < 20) { setErro("Descreva o caso com mais detalhes (pelo menos 20 caracteres)."); return; }
    setAnalisando(true);
    try {
      const item = await base44.cases.analyze({ caso: caso.trim(), examesTexto: examesTexto.trim() });
      setAtual(item);
      carregarCasos(soFavoritos);
    } catch (e) {
      setErro(e?.message || "Erro ao analisar o caso. Tente de novo.");
    } finally { setAnalisando(false); }
  };

  const handleFavorito = async (id) => {
    try {
      const item = await base44.cases.toggleFavorite(id);
      setCasos((lista) => lista.map((c) => (c.id === id ? item : c)));
      if (atual && atual.id === id) setAtual(item);
    } catch (e) { setErro(e?.message || "Erro ao favoritar."); }
  };

  const handleExcluir = async (id) => {
    if (!window.confirm("Excluir este caso do seu histórico?")) return;
    try {
      await base44.cases.delete(id);
      setCasos((lista) => lista.filter((c) => c.id !== id));
      if (atual && atual.id === id) setAtual(null);
    } catch (e) { setErro(e?.message || "Erro ao excluir."); }
  };

  if (loadingUser) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Stethoscope className="w-5 h-5 text-blue-600" /> Análise de caso clínico</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">A análise de caso é uma ferramenta do profissional, por isso exige login. Entre com sua conta para analisar um caso, ver seu histórico e favoritar análises.</p>
              <p className="text-gray-600 text-sm mb-4">{AVISO}</p>
              <Link to="/Login"><Button className="bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white">Entrar</Button></Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const a = atual?.analise;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-pink-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-pink-400 rounded-xl flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Análise de caso clínico</h1>
          </div>
          <p className="text-gray-600">Seu professor clínico com IA, para apoiar o raciocínio à beira-leito — só ginecologia e obstetrícia.</p>
        </div>

        <Alert className="mb-6 border-amber-200 bg-amber-50">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-gray-700">{AVISO} Nunca digite nome, CPF, endereço ou qualquer identificador da paciente.</AlertDescription>
        </Alert>

        <Card className="border-none shadow-xl mb-8">
          <CardHeader>
            <CardTitle>Novo caso</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Exemplo: mulher, 32 anos, atraso menstrual de 6 semanas, dor pélvica há 2 dias, sangramento vaginal leve, sem febre. Exame físico: estável, dor à palpação anexial à direita."
              value={caso}
              onChange={(e) => setCaso(e.target.value)}
              className="min-h-[140px] mb-4 text-base border-gray-200 focus:border-blue-300"
              disabled={analisando}
            />
            <Textarea
              placeholder="Exames já disponíveis (opcional): ultrassom, beta-hCG, hemograma, com valores e datas, sem identificadores."
              value={examesTexto}
              onChange={(e) => setExamesTexto(e.target.value)}
              className="min-h-[80px] mb-4 text-base border-gray-200 focus:border-blue-300"
              disabled={analisando}
            />
            <label className="flex items-start gap-2 text-sm text-gray-700 mb-4 cursor-pointer">
              <input type="checkbox" checked={anonimo} onChange={(e) => setAnonimo(e.target.checked)} className="mt-1" />
              <span>Confirmo que este caso não tem nome, CPF, endereço ou qualquer identificador da paciente.</span>
            </label>
            <Button
              onClick={handleAnalisar}
              disabled={!caso.trim() || analisando}
              className="w-full h-12 bg-gradient-to-r from-blue-500 to-pink-500 hover:from-blue-600 hover:to-pink-600 text-white font-medium"
            >
              {analisando ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Analisando caso...</>) : (<><Brain className="w-5 h-5 mr-2" /> Analisar caso</>)}
            </Button>
          </CardContent>
        </Card>

        {erro && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        {a && (
          <Card className="border-none shadow-xl mb-8">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span>Resultado da análise {atual.cache ? "(reaproveitado do seu histórico, sem gastar cota)" : ""}</span>
                <Button variant="outline" size="sm" onClick={() => handleFavorito(atual.id)}>
                  <Star className={`w-4 h-4 mr-1 ${atual.favorito ? "fill-yellow-400 text-yellow-500" : ""}`} />
                  {atual.favorito ? "Favorito" : "Favoritar"}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {a.resumo && <p className="text-gray-700 mb-4">{a.resumo}</p>}
              {a.alertas && a.alertas.length > 0 && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    <strong>Sinais de alerta:</strong>
                    <ul className="list-disc ml-5 mt-1">{a.alertas.map((x, i) => <li key={i}>{x}</li>)}</ul>
                  </AlertDescription>
                </Alert>
              )}
              <Tabs defaultValue="hipoteses">
                <TabsList className="flex flex-wrap h-auto">
                  <TabsTrigger value="hipoteses"><Brain className="w-4 h-4 mr-1" /> Hipóteses</TabsTrigger>
                  <TabsTrigger value="exames"><FlaskConical className="w-4 h-4 mr-1" /> Exames</TabsTrigger>
                  <TabsTrigger value="conduta"><ClipboardList className="w-4 h-4 mr-1" /> Conduta</TabsTrigger>
                  <TabsTrigger value="referencias"><BookOpen className="w-4 h-4 mr-1" /> Referências</TabsTrigger>
                </TabsList>
                <TabsContent value="hipoteses">
                  <ol className="space-y-4 mt-2">
                    {a.hipoteses.map((h, i) => (
                      <li key={i} className="border border-gray-100 rounded-xl p-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-800">{i + 1}. {h.nome}</span>
                          <Badge className={probColor(h.probabilidade)}>Probabilidade {h.probabilidade}</Badge>
                        </div>
                        {h.aFavor.length > 0 && <p className="text-sm text-gray-700 mt-2"><strong>A favor:</strong> {h.aFavor.join("; ")}</p>}
                        {h.contra.length > 0 && <p className="text-sm text-gray-700 mt-1"><strong>Contra:</strong> {h.contra.join("; ")}</p>}
                        {h.proximoPasso && <p className="text-sm text-gray-700 mt-1"><strong>Próximo passo:</strong> {h.proximoPasso}</p>}
                      </li>
                    ))}
                  </ol>
                </TabsContent>
                <TabsContent value="exames">
                  <ul className="space-y-3 mt-2">
                    {a.exames.length === 0 && <li className="text-gray-600">Nenhum exame sugerido nesta análise.</li>}
                    {a.exames.map((e, i) => (
                      <li key={i} className="border border-gray-100 rounded-xl p-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-800">{e.nome}</span>
                          <Badge variant="outline">{e.quando}</Badge>
                          <Badge variant="outline">{e.prioridade}</Badge>
                        </div>
                        {e.motivo && <p className="text-sm text-gray-700 mt-1">{e.motivo}</p>}
                      </li>
                    ))}
                  </ul>
                </TabsContent>
                <TabsContent value="conduta">
                  <ol className="list-decimal ml-5 space-y-2 mt-2 text-gray-700">
                    {a.conduta.map((c, i) => <li key={i}>{c}</li>)}
                  </ol>
                  {a.prescricaoRascunho && (
                    <Alert className="mt-4 border-amber-200 bg-amber-50">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <AlertDescription className="text-gray-700">
                        <strong>Rascunho de prescrição, para revisão e assinatura do profissional. Não usar sem revisão:</strong>
                        <p className="mt-1 whitespace-pre-wrap">{a.prescricaoRascunho}</p>
                      </AlertDescription>
                    </Alert>
                  )}
                </TabsContent>
                <TabsContent value="referencias">
                  <ul className="space-y-3 mt-2">
                    {a.referencias.length === 0 && <li className="text-gray-600">Nenhuma referência segura foi confirmada para este caso. Consulte os protocolos salvos na aba Protocolos.</li>}
                    {a.referencias.map((r, i) => (
                      <li key={i} className="border border-gray-100 rounded-xl p-4">
                        <span className="font-medium text-gray-800">{r.titulo}</span>
                        <span className="text-sm text-gray-600"> — {r.fonte}</span>
                        {!r.confirmado && <Badge variant="outline" className="ml-2">não confirmada</Badge>}
                        {r.url && <div><a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">{r.url}</a></div>}
                      </li>
                    ))}
                  </ul>
                </TabsContent>
              </Tabs>
              <p className="text-xs text-gray-500 mt-4">{AVISO}</p>
            </CardContent>
          </Card>
        )}

        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><HistoryIcon className="w-5 h-5 text-blue-600" /> Meus casos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Button variant={soFavoritos ? "outline" : "default"} size="sm" onClick={() => { setSoFavoritos(false); carregarCasos(false); }}>Todos</Button>
              <Button variant={soFavoritos ? "default" : "outline"} size="sm" onClick={() => { setSoFavoritos(true); carregarCasos(true); }}><Star className="w-4 h-4 mr-1" /> Favoritos</Button>
            </div>
            {casos.length === 0 && <p className="text-gray-600">Nenhum caso salvo ainda. A primeira análise que você fizer aparece aqui.</p>}
            <ul className="space-y-3">
              {casos.map((c) => (
                <li key={c.id} className="border border-gray-100 rounded-xl p-4 flex items-start justify-between gap-3">
                  <button className="text-left flex-1" onClick={() => setAtual(c)}>
                    <span className="font-medium text-gray-800 block">{String(c.caso || "").slice(0, 90)}{String(c.caso || "").length > 90 ? "..." : ""}</span>
                    <span className="text-xs text-gray-500">{new Date(c.created_date).toLocaleString("pt-BR")}{c.cache ? " · reaproveitado" : ""} · {c.analise?.hipoteses?.length || 0} hipóteses</span>
                  </button>
                  <Button variant="ghost" size="sm" onClick={() => handleFavorito(c.id)}><Star className={`w-4 h-4 ${c.favorito ? "fill-yellow-400 text-yellow-500" : ""}`} /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleExcluir(c.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
