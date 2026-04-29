import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Activity, 
  Server, 
  Database, 
  Send, 
  Copy, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Settings,
  LayoutDashboard,
  FileText,
  ChevronRight,
  Plus,
  Trash2,
  Users,
  ExternalLink
} from 'lucide-react';

type ReportStatus = 'idle' | 'loading' | 'success' | 'error';

interface ClientConfig {
  id: string;
  name: string;
  controllerUrl: string;
  accountName: string;
  clientName: string;
  clientSecret: string;
  teamsWebhookUrl: string;
  serverCount?: number;
  appCount?: number;
  dbCount?: number;
}

export default function App() {
  const [report, setReport] = useState<string>('');
  const [onePageHtml, setOnePageHtml] = useState<string>('');
  const [status, setStatus] = useState<ReportStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [teamsSent, setTeamsSent] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'report' | 'settings' | 'clients'>('dashboard');
  const [isSendingTeams, setIsSendingTeams] = useState(false);
  const [reportTab, setReportTab] = useState<'teams' | 'onepage'>('teams');
  const [attachedImages, setAttachedImages] = useState<{data: string, mimeType: string}[]>([]);
  const [systemStatus, setSystemStatus] = useState<'OPERACIONAL' | 'ALERTA' | 'CRÍTICO'>('OPERACIONAL');

  // Multi-client state
  const [clients, setClients] = useState<ClientConfig[]>([
    {
      id: 'yssy-solucoes',
      name: 'YSSY SOLUCOES',
      controllerUrl: 'https://yssysolucoes-nfr.saas.appdynamics.com',
      accountName: 'yssysolucoes-nfr',
      clientName: 'automator',
      clientSecret: '1aa70932-220e-4059-a6dd-c960547e7f66',
      teamsWebhookUrl: 'https://mteltecno.webhook.office.com/webhookb2/97c19d7e-4800-45d6-97e4-2e52fd99b357@4819c0ac-2467-422d-a1fd-618e47b30a45/IncomingWebhook/cda0a8acebdf4a1ba65c362f1bac7fd6/73a2ce8f-6ba9-4cbe-9381-c36f1610e34b/V2QCN0OZczmEGiNArD2WsfRdIxkKcXSnjBL7b-zE1vmVA1',
      serverCount: 25,
      appCount: 8,
      dbCount: 4
    },
    {
      id: 'login-logistica',
      name: 'LOG-IN LOGISTICA',
      controllerUrl: 'https://loginlogisticaintermodalsa-prod.saas.appdynamics.com',
      accountName: 'loginlogisticaintermodalsa-prod',
      clientName: 'automator',
      clientSecret: 'ea76ccaf-a959-496d-bd63-2f6fe8f81ee3',
      teamsWebhookUrl: 'https://mteltecno.webhook.office.com/webhookb2/97c19d7e-4800-45d6-97e4-2e52fd99b357@4819c0ac-2467-422d-a1fd-618e47b30a45/IncomingWebhook/cda0a8acebdf4a1ba65c362f1bac7fd6/73a2ce8f-6ba9-4cbe-9381-c36f1610e34b/V2QCN0OZczmEGiNArD2WsfRdIxkKcXSnjBL7b-zE1vmVA1',
      serverCount: 42,
      appCount: 12,
      dbCount: 6
    },
    {
      id: 'banco-yamaha',
      name: 'BANCO YAMAHA',
      controllerUrl: 'https://yamahabrasil-prod.saas.appdynamics.com',
      accountName: 'yamahabrasil-prod',
      clientName: 'automator',
      clientSecret: '34947fd8-51bf-4f0a-ba35-e112936b363d',
      teamsWebhookUrl: 'https://mteltecno.webhook.office.com/webhookb2/97c19d7e-4800-45d6-97e4-2e52fd99b357@4819c0ac-2467-422d-a1fd-618e47b30a45/IncomingWebhook/cda0a8acebdf4a1ba65c362f1bac7fd6/73a2ce8f-6ba9-4cbe-9381-c36f1610e34b/V2QCN0OZczmEGiNArD2WsfRdIxkKcXSnjBL7b-zE1vmVA1',
      serverCount: 18,
      appCount: 5,
      dbCount: 3
    }
  ]);
  const [selectedClientId, setSelectedClientId] = useState<string>('yssy-solucoes');
  const [newClient, setNewClient] = useState<Partial<ClientConfig>>({});
  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  useEffect(() => {
    const savedClients = localStorage.getItem('appd_automator_clients');
    if (savedClients) {
      const parsed = JSON.parse(savedClients);
      if (parsed.length > 0) {
        setClients(parsed);
        setSelectedClientId(parsed[0].id);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('appd_automator_clients', JSON.stringify(clients));
  }, [clients]);

  const activeClient = clients.find(c => c.id === selectedClientId);

  const addOrUpdateClient = () => {
    if (!newClient.name || !newClient.controllerUrl) return;
    
    if (editingClientId) {
      setClients(clients.map(c => c.id === editingClientId ? { ...c, ...newClient as ClientConfig } : c));
      setEditingClientId(null);
    } else {
      const client: ClientConfig = {
        id: crypto.randomUUID(),
        name: newClient.name || '',
        controllerUrl: newClient.controllerUrl || '',
        accountName: newClient.accountName || '',
        clientName: newClient.clientName || '',
        clientSecret: newClient.clientSecret || '',
        teamsWebhookUrl: newClient.teamsWebhookUrl || '',
        serverCount: Math.floor(Math.random() * 50) + 10,
        appCount: Math.floor(Math.random() * 15) + 5,
        dbCount: Math.floor(Math.random() * 10) + 2,
      };
      setClients([...clients, client]);
      if (!selectedClientId) setSelectedClientId(client.id);
    }
    setNewClient({});
  };

  const startEditing = (client: ClientConfig) => {
    setNewClient(client);
    setEditingClientId(client.id);
    // Scroll to top of form if needed, but it's sticky
  };

  const cancelEditing = () => {
    setNewClient({});
    setEditingClientId(null);
  };

  const deleteClient = (id: string) => {
    const updated = clients.filter(c => c.id !== id);
    setClients(updated);
    if (selectedClientId === id) {
      setSelectedClientId(updated.length > 0 ? updated[0].id : '');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setAttachedImages(prev => [...prev, { data: base64, mimeType: file.type }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  const generateReport = async () => {
    if (!activeClient) {
      setError("Selecione ou configure um cliente primeiro.");
      return;
    }

    setStatus('loading');
    setError(null);
    setTeamsSent(false);
    try {
      // 1. Fetch raw data from backend with dynamic credentials
      const response = await fetch('/api/appdynamics-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          controllerUrl: activeClient.controllerUrl,
          accountName: activeClient.accountName,
          clientName: activeClient.clientName,
          clientSecret: activeClient.clientSecret
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Erro desconhecido no servidor' }));
        throw new Error(errData.error || `Servidor retornou ${response.status}`);
      }
      
      const rawData = await response.json();

      // Update client counts with real data from API
      setClients(prev => {
        const updated = prev.map(c => c.id === selectedClientId ? {
          ...c,
          serverCount: rawData.servers?.length || c.serverCount,
          appCount: rawData.applications?.length || c.appCount,
          dbCount: rawData.databases?.length || c.dbCount
        } : c);
        localStorage.setItem('appd_automator_clients', JSON.stringify(updated));
        return updated;
      });

      // 2. Call Gemini on frontend
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY não encontrada.");

      const today = new Date().toLocaleDateString('pt-BR');
      const ai = new GoogleGenAI({ apiKey });

      // Prepare parts for Gemini
      const parts: any[] = [
        {
          text: `
            Você é um Engenheiro de Observabilidade SRE especialista em AppDynamics e ${activeClient.name}.
            Sua missão é processar os seguintes dados brutos do AppDynamics e as imagens anexadas (se houver) para gerar duas saídas: 1) Um checklist para Teams e 2) Uma OnePage visual em HTML.

            --- REGRAS DE CODIFICAÇÃO E IDIOMA
            1. O output DEVE ser em Português (Brasil).
            2. O HTML DEVE iniciar obrigatoriamente com <meta charset="UTF-8"> no início do <head>.
            3. Não use bibliotecas externas. Todo o CSS deve estar dentro da tag <style>.

            Dados brutos do API:
            ${JSON.stringify(rawData, null, 2)}

            --- SAÍDA 1: CHECKLIST TEAMS (Texto Plano)
            Não utilize apenas asteriscos para ênfase. Use separadores visuais e letras maiúsculas para os títulos de seção. Siga este modelo EXATAMENTE:

            ==================================================
            [${activeClient.name}] – Checklist Diário AppDynamics – ${today}
            ==================================================

            ● STATUS GERAL
            --------------------------------------------------
            Status: [🟠ATENÇÃO ou 🔴CRÍTICO]
            Resumo: [Inserir resumo técnico de 2 a 3 linhas focando na causa raiz dos riscos em Aplicações, Integrações, Infra ou DB].

            ● 📱 APLICAÇÕES (🟠Warning/🔴Crítico)
            --------------------------------------------------
            ▶ [NOME DA APP]: [STATUS]
               • Call: [Valor] | Latência: [ms/s] | Erro: [%]
               • Impacto: [Descrever impacto de negócio em uma frase].

            ● 🖥️ INFRAESTRUTURA (Crítico/Swap > 50%)
            --------------------------------------------------
            ▶ Host [NOME]: RAM: [%] | CPU: [%] | Status: [STATUS]
               • Alerta: [Descrever o gargalo].

            ● 🗄️ BANCO DE DADOS (Crítico/Memória > 90%)
            --------------------------------------------------
            ▶ Instância [NOME]: [Waits principais] | Memória: [%] | Violação: [H/M]

            ● 🚩 AÇÕES PENDENTES
            --------------------------------------------------
            • [ITEM] - [REPETIDO] (Se o item persistir por mais de 24h)

            ● 🚀 AÇÕES RECOMENDADAS
            --------------------------------------------------
            1. [Ação direta e técnica 1]
            2. [Ação direta e técnica 2]
            3. [Ação direta e técnica 3]

                      --- SAÍDA 2: ONEPAGE DASHBOARD (HTML EXECUTIVO)
            Gere um código HTML único, inline (CSS no head), seguindo RIGOROSAMENTE a estrutura visual e o CSS abaixo.
            O objetivo é que o dashboard gerado seja idêntico em layout, cores e tipografia ao modelo de referência, mas populado com os dados reais do ${activeClient.name}.

            <style>
              :root { --blue-dark: #003d66; --blue-light: #00558c; --crit: #dc3545; --warn: #ffc107; --ok: #28a745; --bg: #f0f2f5; }
              body { font-family: 'Segoe UI', Arial, sans-serif; background: var(--bg); color: #333; padding: 20px; line-height: 1.4; }
              .page { max-width: 1200px; margin: 0 auto; background: #fff; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); overflow: hidden; }
              
              /* Header Executivo */
              .header { background: linear-gradient(135deg, var(--blue-light) 0%, var(--blue-dark) 100%); padding: 20px 30px; display: flex; justify-content: space-between; align-items: center; color: #fff; }
              .header h1 { font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
              .status-badge { padding: 6px 16px; border-radius: 20px; font-weight: bold; font-size: 12px; text-transform: uppercase; }

              /* Seções de Grade */
              .section-title { background: #e9ecef; padding: 8px 15px; font-weight: 800; font-size: 14px; border-left: 4px solid var(--blue-light); margin-bottom: 15px; }
              .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; padding: 0 20px 20px; }
              
              /* Cards de Aplicação */
              .card { border: 1px solid #dee2e6; border-radius: 6px; padding: 12px; }
              .card-header { font-weight: bold; font-size: 14px; border-bottom: 1px solid #eee; margin-bottom: 8px; padding-bottom: 4px; display: flex; justify-content: space-between; }
              .metric-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px; }
              .recur-tag { color: var(--crit); font-weight: bold; font-size: 10px; }

              /* Gráfico de Banco de Dados */
              .db-section { padding: 20px; background: #fff; border-top: 1px solid #eee; }
              .chart-container { display: flex; align-items: flex-end; gap: 12px; height: 180px; margin-top: 20px; border-bottom: 2px solid #ccc; padding-bottom: 5px; }
              .bar-group { flex: 1; display: flex; flex-direction: column; align-items: center; }
              .bar { width: 100%; border-radius: 3px 3px 0 0; position: relative; transition: height 0.3s ease; }
              .bar-label { font-size: 10px; font-weight: bold; transform: rotate(-45deg); margin-top: 25px; white-space: nowrap; }
              .bar-value { font-size: 11px; font-weight: 900; margin-bottom: 5px; }

              /* Rodapé de Ações */
              .actions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 20px; background: #f8f9fa; }
              .action-box { background: #fff; border: 1px solid #dee2e6; padding: 15px; border-radius: 6px; }
              .action-box h3 { font-size: 14px; color: var(--blue-dark); margin-bottom: 10px; border-bottom: 2px solid var(--blue-light); display: inline-block; }
              ul { padding-left: 18px; font-size: 12.5px; }
              li { margin-bottom: 8px; }
            </style>

            LÓGICA DE GERAÇÃO:
            1. **Gráfico DB:** Se o banco tiver "Time spent" alto (ex: >24h), a barra deve ser Vermelha (#dc3545). Use o nome do banco no bar-label.
            2. **Alertas Silenciosos:** Se Erro % > 5% mas Saúde for "Verde", force o card para Vermelho e adicione a mensagem: "Inconsistência de Health Rule detectada".
            3. **Ações:** Divida em "Ações Imediatas" (Críticos) e "Plano de Estabilização" (Geral).

            LÓGICA DE ANÁLISE (SRE BRAIN):
            1. ANOMALIA DE SAÚDE: Se uma App tiver Health "Green" mas Erro % > 5%, force o Card para CRÍTICO e adicione um aviso: "🚨 Detecção de falha silenciosa".
            2. RECORRÊNCIA: Se o dado indicar que o problema persiste por > 24h, use obrigatoriamente a classe .recur-tag com o texto "[REPETIDO]".
            3. INFRAESTRUTURA: Liste hosts sem Machine Agent na seção de infra com a tag "Monitoramento Cego".
            4. DB WAITS: Crie uma representação visual (divs de larguras variadas) para o "Time in DB".

            REGRAS DE CODIFICAÇÃO (CRÍTICO):
            1. Use obrigatoriamente <meta charset="UTF-8"> no início do <head>.
            2. Todo o texto deve estar em Português (Brasil).
            3. Não use bibliotecas externas. Todo o CSS deve estar dentro da tag <style>.

            MAPEAMENTO DE DADOS:
            1. **HEADER**: Use o nome do cliente (${activeClient.name}) e a data atual.
            2. **GRID**: Mostre cards para Apps Críticas, Warning e Mascaradas.
            3. **DB SECTION**: Mostre o gráfico de Wait States usando a estrutura .chart-container.
            4. **ACTIONS**: Liste ações recomendadas divididas em "Ações Imediatas" e "Plano de Estabilização".

            IMPORTANTE: Mantenha o tom executivo e técnico. Se um dado não estiver disponível na API, use estimativas inteligentes baseadas no contexto ou oculte o campo específico para não exibir "null/undefined".
            O HTML deve ser auto-contido e pronto para visualização em iframe.

            IMPORTANTE: Se houver imagens anexadas, elas são prints da tela do AppDynamics. Use-as para complementar as informações da API.
            Retorne um JSON com os campos "teamsChecklist" e "onePageHtml".
          `
        }
      ];

      // Add images to parts
      attachedImages.forEach(img => {
        parts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.data
          }
        });
      });

      const modelResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              teamsChecklist: { type: Type.STRING },
              onePageHtml: { type: Type.STRING }
            },
            required: ["teamsChecklist", "onePageHtml"]
          }
        },
        contents: { parts }
      });

      const result = JSON.parse(modelResponse.text);
      
      setReport(result.teamsChecklist);
      setOnePageHtml(result.onePageHtml);
      setStatus('success');
      setActiveTab('report');
      setReportTab('teams');
    } catch (err: any) {
      console.error("Error generating report:", err);
      setError(err.message);
      setStatus('error');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendToTeams = async () => {
    if (!report || !activeClient?.teamsWebhookUrl) return;
    setIsSendingTeams(true);
    try {
      const response = await fetch('/api/send-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: report,
          webhookUrl: activeClient.teamsWebhookUrl
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setTeamsSent(true);
      setTimeout(() => setTeamsSent(false), 5000);
    } catch (err: any) {
      alert(`Erro ao enviar para o Teams: ${err.message}`);
    } finally {
      setIsSendingTeams(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans selection:bg-[#5A5A40] selection:text-white">
      {/* Sidebar Navigation */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-[#141414]/10 p-6 z-50 hidden md:block">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-[#141414] rounded-xl flex items-center justify-center">
            <Activity className="text-white w-6 h-6" />
          </div>
          <h1 className="font-bold text-xl tracking-tight">AppD Automator</h1>
        </div>

        <nav className="space-y-2">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <NavItem 
            icon={<Users size={20} />} 
            label="Clientes" 
            active={activeTab === 'clients'} 
            onClick={() => setActiveTab('clients')} 
          />
          <NavItem 
            icon={<FileText size={20} />} 
            label="Relatório" 
            active={activeTab === 'report'} 
            onClick={() => setActiveTab('report')} 
          />
          <NavItem 
            icon={<Settings size={20} />} 
            label="Configurações" 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
          />
        </nav>

        <div className="absolute bottom-8 left-6 right-6">
          <div className="p-4 bg-[#F5F5F0] rounded-2xl border border-[#141414]/5">
            <p className="text-[10px] uppercase tracking-widest font-semibold opacity-40 mb-2">Cliente Ativo</p>
            <p className="text-sm font-bold truncate">{activeClient?.name || 'Nenhum'}</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 p-8 md:p-12">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl"
            >
              <header className="mb-12 sre-header">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Dashboard Executivo</h2>
                  <p className="text-sm opacity-80">{activeClient?.name || 'Selecione um cliente'}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`status-badge ${
                    systemStatus === 'ALERTA' ? 'bg-orange-500' : 
                    systemStatus === 'CRÍTICO' ? 'bg-red-500' : 
                    'bg-emerald-500'
                  } text-white px-4 py-2 rounded-full font-bold text-xs shadow-lg transition-colors cursor-pointer`}
                  onClick={() => {
                    const next: Record<string, 'OPERACIONAL' | 'ALERTA' | 'CRÍTICO'> = {
                      'OPERACIONAL': 'ALERTA',
                      'ALERTA': 'CRÍTICO',
                      'CRÍTICO': 'OPERACIONAL'
                    };
                    setSystemStatus(next[systemStatus]);
                  }}>
                    SISTEMA {systemStatus}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase opacity-60">Última Atualização</p>
                    <p className="text-xs font-bold">{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
                  </div>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                <div className="bg-white p-8 rounded-3xl border border-[#141414]/5 shadow-sm">
                  <h3 className="font-bold text-sm uppercase tracking-widest opacity-40 mb-6">Conectar ao Cliente</h3>
                  <select 
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full p-4 bg-[#F5F5F0] rounded-2xl border-none font-bold text-lg focus:ring-2 focus:ring-[#141414] transition-all"
                  >
                    <option value="" disabled>Selecione um cliente...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {clients.length === 0 && (
                    <p className="mt-4 text-sm text-amber-600 flex items-center gap-2">
                      <AlertCircle size={16} />
                      Nenhum cliente cadastrado. Vá em "Clientes".
                    </p>
                  )}
                </div>

                <div className="bg-[#141414] p-8 rounded-3xl text-white shadow-xl flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm uppercase tracking-widest opacity-40 mb-2">Ação Rápida</h3>
                    <p className="text-lg font-medium mb-6">Pronto para analisar as últimas 24h?</p>
                  </div>
                  <button 
                    onClick={generateReport}
                    disabled={status === 'loading' || !selectedClientId}
                    className="w-full py-4 bg-white text-[#141414] rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                  >
                    {status === 'loading' ? <RefreshCw className="animate-spin" /> : <Activity />}
                    {status === 'loading' ? 'Processando...' : 'Gerar Checklist Agora'}
                  </button>
                </div>
              </div>

              {/* Visual Context / Image Upload */}
              <div className="mb-12 p-8 bg-white border-2 border-dashed border-[#141414]/10 rounded-3xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold flex items-center gap-2 text-xl">
                    <LayoutDashboard size={24} className="text-[#5A5A40]" />
                    Contexto Visual (Opcional)
                  </h3>
                  <label className="cursor-pointer bg-[#141414] text-white px-6 py-3 rounded-2xl text-sm font-bold hover:scale-105 transition-transform shadow-lg">
                    Anexar Prints
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                </div>
                <p className="text-sm opacity-50 mb-6 italic">Anexe prints das telas de Database ou Servers para que a IA analise visualmente o que a API pode não capturar.</p>
                
                {attachedImages.length > 0 ? (
                  <div className="flex flex-wrap gap-4">
                    {attachedImages.map((img, idx) => (
                      <div key={idx} className="relative group w-24 h-24 rounded-2xl overflow-hidden border border-[#141414]/10 shadow-sm">
                        <img src={`data:${img.mimeType};base64,${img.data}`} className="w-full h-full object-cover" />
                        <button 
                          onClick={() => removeImage(idx)}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 opacity-20 text-lg font-medium">Nenhum print anexado</div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard icon={<Server className="text-blue-600" />} title="Servidores" value={activeClient?.serverCount?.toString() || "0"} desc="Infraestrutura" />
                <StatCard icon={<Activity className="text-emerald-600" />} title="Aplicações" value={activeClient?.appCount?.toString() || "0"} desc="Business Apps" />
                <StatCard icon={<Database className="text-amber-600" />} title="Databases" value={activeClient?.dbCount?.toString() || "0"} desc="Instâncias DB" />
              </div>
            </motion.div>
          )}

          {activeTab === 'clients' && (
            <motion.div 
              key="clients"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-5xl"
            >
              <header className="mb-12 flex items-center justify-between">
                <div>
                  <h2 className="text-4xl font-bold tracking-tight mb-4">Gerenciar Clientes</h2>
                  <p className="text-lg opacity-60">Cadastre e edite perfis de monitoramento.</p>
                </div>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form to add client */}
                <div className="lg:col-span-1 bg-white p-8 rounded-3xl border border-[#141414]/5 shadow-sm h-fit sticky top-8">
                  <h3 className="font-bold text-lg mb-6">{editingClientId ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                  <div className="space-y-4">
                    <Input label="Nome do Cliente" value={newClient.name || ''} onChange={v => setNewClient({...newClient, name: v})} placeholder="Ex: Banco XPTO" />
                    <Input label="Controller URL" value={newClient.controllerUrl || ''} onChange={v => setNewClient({...newClient, controllerUrl: v})} placeholder="https://..." />
                    <Input label="Account Name" value={newClient.accountName || ''} onChange={v => setNewClient({...newClient, accountName: v})} />
                    <Input label="API Client Name" value={newClient.clientName || ''} onChange={v => setNewClient({...newClient, clientName: v})} placeholder="nome@conta" />
                    <Input label="API Client Secret" value={newClient.clientSecret || ''} onChange={v => setNewClient({...newClient, clientSecret: v})} type="password" />
                    <Input label="Teams Webhook" value={newClient.teamsWebhookUrl || ''} onChange={v => setNewClient({...newClient, teamsWebhookUrl: v})} placeholder="https://outlook..." />
                    
                    <div className="grid grid-cols-3 gap-2">
                      <Input label="Servidores" value={newClient.serverCount?.toString() || ''} onChange={v => setNewClient({...newClient, serverCount: parseInt(v) || 0})} type="number" />
                      <Input label="Apps" value={newClient.appCount?.toString() || ''} onChange={v => setNewClient({...newClient, appCount: parseInt(v) || 0})} type="number" />
                      <Input label="DBs" value={newClient.dbCount?.toString() || ''} onChange={v => setNewClient({...newClient, dbCount: parseInt(v) || 0})} type="number" />
                    </div>
                    
                    <div className="flex flex-col gap-2 mt-4">
                      <button 
                        onClick={addOrUpdateClient}
                        className="w-full py-4 bg-[#141414] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#333] transition-all"
                      >
                        {editingClientId ? <CheckCircle2 size={20} /> : <Plus size={20} />}
                        {editingClientId ? 'Atualizar Cliente' : 'Salvar Cliente'}
                      </button>
                      {editingClientId && (
                        <button 
                          onClick={cancelEditing}
                          className="w-full py-3 bg-[#F5F5F0] text-[#141414] rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#E4E3E0] transition-all"
                        >
                          Cancelar Edição
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* List of clients */}
                <div className="lg:col-span-2 space-y-4">
                  {clients.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-[#141414]/20">
                      <Users className="mx-auto opacity-20 mb-4" size={48} />
                      <p className="opacity-40 font-medium">Nenhum cliente cadastrado ainda.</p>
                    </div>
                  ) : (
                    clients.map(client => (
                      <div key={client.id} className="bg-white p-6 rounded-3xl border border-[#141414]/5 shadow-sm flex items-center justify-between group hover:border-[#141414]/20 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-[#F5F5F0] rounded-2xl flex items-center justify-center font-bold text-[#141414]">
                            {client.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-lg">{client.name}</h4>
                            <div className="flex gap-3 mt-1">
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full flex items-center gap-1">
                                <Server size={10} /> {client.serverCount || 0}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full flex items-center gap-1">
                                <Activity size={10} /> {client.appCount || 0}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full flex items-center gap-1">
                                <Database size={10} /> {client.dbCount || 0}
                              </span>
                            </div>
                            <p className="text-[10px] opacity-40 font-mono truncate max-w-xs mt-1">{client.controllerUrl}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setSelectedClientId(client.id)}
                            className={`p-3 rounded-xl transition-all ${selectedClientId === client.id ? 'bg-emerald-100 text-emerald-700' : 'hover:bg-[#F5F5F0]'}`}
                            title="Selecionar este cliente"
                          >
                            <CheckCircle2 size={20} />
                          </button>
                          <button 
                            onClick={() => startEditing(client)}
                            className="p-3 hover:bg-blue-50 text-blue-600 rounded-xl transition-all"
                            title="Editar cliente"
                          >
                            <Settings size={20} />
                          </button>
                          <button 
                            onClick={() => deleteClient(client.id)}
                            className="p-3 hover:bg-red-50 text-red-500 rounded-xl transition-all"
                            title="Excluir cliente"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'report' && (
            <motion.div 
              key="report"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {status === 'idle' && (
                <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-[#141414]/20">
                  <FileText className="mx-auto mb-4 opacity-20" size={64} />
                  <p className="text-lg opacity-60">Nenhum relatório gerado ainda hoje.</p>
                  <button onClick={generateReport} className="mt-4 text-[#5A5A40] font-bold hover:underline">Clique para gerar</button>
                </div>
              )}

              {status === 'loading' && (
                <div className="bg-white rounded-3xl p-12 text-center border border-[#141414]/5">
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-[#F5F5F0] border-t-[#5A5A40] rounded-full animate-spin" />
                      <Activity className="absolute inset-0 m-auto text-[#5A5A40]" size={24} />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Analisando Ambiente...</h3>
                  <p className="opacity-60 max-w-md mx-auto">Estamos consultando o AppDynamics e solicitando à IA que formate os dados conforme suas regras de negócio.</p>
                </div>
              )}

              {status === 'error' && (
                <div className="bg-red-50 rounded-3xl p-8 border border-red-100 flex items-start gap-4">
                  <AlertCircle className="text-red-600 shrink-0" size={24} />
                  <div>
                    <h3 className="font-bold text-red-900">Erro na Geração</h3>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                    <button onClick={generateReport} className="mt-4 text-red-900 font-bold text-sm underline">Tentar novamente</button>
                  </div>
                </div>
              )}

              {status === 'success' && (
                <div className="space-y-6">
                  <div className="flex bg-white p-1 rounded-2xl border border-[#141414]/5 w-fit">
                    <button 
                      onClick={() => setReportTab('teams')}
                      className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${reportTab === 'teams' ? 'bg-[#141414] text-white' : 'hover:bg-[#F5F5F0]'}`}
                    >
                      Checklist Teams
                    </button>
                    <button 
                      onClick={() => setReportTab('onepage')}
                      className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${reportTab === 'onepage' ? 'bg-[#141414] text-white' : 'hover:bg-[#F5F5F0]'}`}
                    >
                      OnePage Dashboard
                    </button>
                  </div>

                  {reportTab === 'teams' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white rounded-3xl p-8 border border-[#141414]/5 shadow-sm min-h-[500px]">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-lg">Mensagem Gerada ({activeClient?.name})</h3>
                            <div className="flex gap-2">
                              <button 
                                onClick={copyToClipboard}
                                className="p-2 hover:bg-[#F5F5F0] rounded-lg transition-colors relative"
                                title="Copiar para área de transferência"
                              >
                                {copied ? <CheckCircle2 className="text-emerald-600" size={20} /> : <Copy size={20} />}
                                {copied && <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded">Copiado!</span>}
                              </button>
                            </div>
                          </div>
                          <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-[#141414]/80 bg-[#F5F5F0]/50 p-6 rounded-2xl border border-[#141414]/5">
                            {report}
                          </pre>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="bg-[#141414] text-white rounded-3xl p-8 shadow-xl">
                          <h3 className="font-bold text-xl mb-4">Pronto para o Teams?</h3>
                          <p className="text-white/60 text-sm mb-8 leading-relaxed">
                            A mensagem acima foi formatada seguindo rigorosamente seu prompt, focando apenas em itens Warning/Critical e ignorando ambientes HML.
                          </p>
                          <button 
                            onClick={sendToTeams}
                            disabled={teamsSent || isSendingTeams}
                            className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${teamsSent ? 'bg-emerald-600 text-white' : 'bg-white text-[#141414] hover:scale-[1.02] active:scale-95'} ${isSendingTeams ? 'opacity-50' : ''}`}
                          >
                            {isSendingTeams ? (
                              <>
                                <RefreshCw className="animate-spin" size={20} />
                                Enviando...
                              </>
                            ) : teamsSent ? (
                              <>
                                <CheckCircle2 size={20} />
                                Enviado com Sucesso
                              </>
                            ) : (
                              <>
                                <Send size={20} />
                                Enviar para o Teams
                              </>
                            )}
                          </button>
                          <p className="text-[10px] text-center mt-4 opacity-40 uppercase tracking-widest">Via Webhook Configurado</p>
                        </div>

                        <div className="bg-white rounded-3xl p-8 border border-[#141414]/5">
                          <h4 className="font-bold mb-4 flex items-center gap-2">
                            <Activity size={18} className="text-[#5A5A40]" />
                            Resumo da Análise
                          </h4>
                          <ul className="space-y-3 text-sm">
                            <li className="flex justify-between border-b border-[#141414]/5 pb-2">
                              <span className="opacity-60">Janela:</span>
                              <span className="font-medium">24 Horas</span>
                            </li>
                            <li className="flex justify-between border-b border-[#141414]/5 pb-2">
                              <span className="opacity-60">Filtro HML:</span>
                              <span className="font-medium text-emerald-600">Ativo</span>
                            </li>
                            <li className="flex justify-between border-b border-[#141414]/5 pb-2">
                              <span className="opacity-60">Modelo AI:</span>
                              <span className="font-medium">Gemini 3.1 Pro</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-3xl border border-[#141414]/5 shadow-sm overflow-hidden min-h-[800px] flex flex-col">
                      <div className="p-4 border-b border-[#141414]/5 flex justify-between items-center bg-[#F5F5F0]/30">
                        <h3 className="font-bold text-lg">OnePage Dashboard Preview</h3>
                        <button 
                          onClick={() => {
                            const blob = new Blob([onePageHtml], { type: 'text/html' });
                            const url = URL.createObjectURL(blob);
                            window.open(url, '_blank');
                          }}
                          className="flex items-center gap-2 text-sm font-bold hover:underline"
                        >
                          <ExternalLink size={16} />
                          Abrir em Nova Aba
                        </button>
                      </div>
                      <iframe 
                        srcDoc={onePageHtml} 
                        className="w-full flex-grow border-none"
                        title="OnePage Preview"
                      />
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-3xl p-8 border border-[#141414]/5 max-w-2xl"
            >
              <h3 className="text-2xl font-bold mb-8">Configurações do Sistema</h3>
              
              <div className="space-y-8">
                <section>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#5A5A40] mb-4">Credenciais AppDynamics (API Client)</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <ConfigItem label="Controller URL" value="Configurado no .env" />
                    <ConfigItem label="Account Name" value="Configurado no .env" />
                    <ConfigItem label="Client Name" value="Configurado no .env" />
                  </div>
                  <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <p className="text-xs text-amber-800 font-medium mb-1 flex items-center gap-2">
                      <AlertCircle size={14} />
                      Autenticação via OAuth2
                    </p>
                    <p className="text-[10px] text-amber-700 leading-relaxed">
                      O sistema agora utiliza <b>API Client Credentials</b> para maior segurança. 
                      O Client Name deve estar no formato <code className="bg-amber-100 px-1 rounded">nome@conta</code>.
                    </p>
                  </div>
                </section>

                <section>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#5A5A40] mb-4">Integração Teams</h4>
                  <ConfigItem label="Webhook URL" value="Configurado no .env" />
                </section>

                <div className="pt-6 border-t border-[#141414]/5">
                  <div className="flex items-center gap-4 p-4 bg-[#F5F5F0] rounded-2xl">
                    <AlertCircle className="text-[#5A5A40]" />
                    <p className="text-sm opacity-70">Para alterar estas configurações, atualize as variáveis de ambiente no painel do AI Studio.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-[#141414] text-white shadow-lg' : 'hover:bg-[#F5F5F0] text-[#141414]/60'}`}
    >
      {icon}
      <span className="font-semibold text-sm">{label}</span>
      {active && <ChevronRight className="ml-auto opacity-40" size={16} />}
    </button>
  );
}

function StatCard({ icon, title, value, desc }: { icon: React.ReactNode, title: string, value: string, desc: string }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-[#141414]/5 shadow-sm hover:shadow-md transition-shadow">
      <div className="w-10 h-10 rounded-xl bg-[#F5F5F0] flex items-center justify-center mb-4">
        {icon}
      </div>
      <h4 className="text-sm font-bold opacity-40 uppercase tracking-widest mb-1">{title}</h4>
      <p className="text-2xl font-bold mb-1">{value}</p>
      <p className="text-xs opacity-60">{desc}</p>
    </div>
  );
}

function Step({ num, title, text }: { num: string, title: string, text: string }) {
  return (
    <div className="space-y-2">
      <span className="text-3xl font-bold text-[#5A5A40]/20 block">{num}</span>
      <h4 className="font-bold text-sm">{title}</h4>
      <p className="text-xs opacity-60 leading-relaxed">{text}</p>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string, type?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold opacity-40 uppercase tracking-widest ml-1">{label}</label>
      <input 
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-3 bg-[#F5F5F0] rounded-xl border-none text-sm focus:ring-1 focus:ring-[#141414] transition-all"
      />
    </div>
  );
}

function ConfigItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold opacity-40 uppercase tracking-tighter">{label}</span>
      <div className="px-4 py-3 bg-[#F5F5F0] rounded-xl font-mono text-sm border border-[#141414]/5">
        {value}
      </div>
    </div>
  );
}
