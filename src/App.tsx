import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
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
}

export default function App() {
  const [report, setReport] = useState<string>('');
  const [status, setStatus] = useState<ReportStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [teamsSent, setTeamsSent] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'report' | 'settings' | 'clients'>('dashboard');
  const [isSendingTeams, setIsSendingTeams] = useState(false);

  // Multi-client state
  const [clients, setClients] = useState<ClientConfig[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [newClient, setNewClient] = useState<Partial<ClientConfig>>({});
  const [editingClientId, setEditingClientId] = useState<string | null>(null);

  useEffect(() => {
    const savedClients = localStorage.getItem('appd_automator_clients');
    if (savedClients) {
      const parsed = JSON.parse(savedClients);
      setClients(parsed);
      if (parsed.length > 0) setSelectedClientId(parsed[0].id);
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

      // 2. Call Gemini on frontend
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY não encontrada.");

      const ai = new GoogleGenAI({ apiKey });
      const modelResponse = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `
          Aqui estão os dados brutos do AppDynamics do cliente "${activeClient.name}":
          ${JSON.stringify(rawData, null, 2)}

          Por favor, gere o checklist diário seguindo rigorosamente as instruções do prompt abaixo:

          --- INSTRUÇÕES DO PROMPT ---
          Você é um especialista em Observabilidade/SRE, com foco em AppDynamics.
          Preciso que você gere diariamente um checklist/resumo para envio via chat (Teams) sobre a saúde do ambiente do cliente, usando sempre a janela das últimas 24 horas do AppDynamics.

          Contexto do cliente:
          Nome: ${activeClient.name}
          Área: [cliente financeiro, possui aplicações bancarias, consórcio e seguradora].
          Ferramenta principal de observabilidade: AppDynamics (APM, Servers, Databases).
          Objetivo: comunicação rápida, clara e objetiva.

          Regras para a saída:
          - Formato de mensagem para Teams, texto plano, em blocos curtos e scanáveis.
          - Sempre em português.
          - Só mencionar o que estiver em WARNING ou CRITICAL.
          - REGRA DE OURO: Analise o campo 'healthViolations' com atenção total. Se houver qualquer alerta com status 'OPEN', 'CONTINUE' ou que tenha ocorrido nas últimas 24h, ele DEVE ser reportado. 
          - Se o alerta for de 'Memory Usage', 'CPU Usage' ou 'Disk Usage' e afetar um servidor (como 'docker-gcp'), coloque-o obrigatoriamente no Bloco 3 (Infraestrutura).
          - Use os detalhes da violação (como 'description' ou 'name') para descrever o problema.
          - Se houver alertas críticos abertos, o 'Status Geral' deve refletir isso (ex: "Ambiente com alertas críticos de infraestrutura pendentes").
          - Não listar aplicações/servidores/DB em OK.
          - DESCONSIDERAR APLICAÇÃO OU SERVIDOR QUE CONTENHA HML.

          Estrutura fixa da mensagem:
          Linha 1 – Título: "[${activeClient.name}] – Checklist Diário AppDynamics – DD/MM/AAAA (últimas 24h)"
          Bloco 1 – Status Geral: 2 a 3 linhas sobre riscos principais.
          Bloco 2 – Aplicações (somente Warning/Crítico): 🟠 para Warning, 🔴 para Crítico. Nome, Volume, RT, Erro%, e comentário de negócio.
          Bloco 3 – Infraestrutura (somente servidores em Crítico): Nome, %disco, %CPU, %memória, comentário. Se não tiver as porcentagens exatas, descreva o alerta (ex: "🔴 docker-gcp: Uso de memória muito alto").
          Bloco 4 – Banco de Dados (somente DB em Crítico): Nome, CPU, memória, waits, comentário.
          Bloco 5 – Ações Recomendadas (curto prazo): 3 a 5 bullets objetivos baseados nos problemas reais.
          --- FIM DAS INSTRUÇÕES ---
        `
      });

      if (!modelResponse.text) throw new Error("IA não retornou texto.");
      
      setReport(modelResponse.text);
      setStatus('success');
      setActiveTab('report');
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
              <header className="mb-12">
                <h2 className="text-4xl font-bold tracking-tight mb-4">Dashboard</h2>
                <p className="text-lg opacity-60">Selecione um cliente e gere o checklist diário.</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                <div className="bg-white p-8 rounded-3xl border border-[#141414]/5 shadow-sm">
                  <h3 className="font-bold text-sm uppercase tracking-widest opacity-40 mb-6">Seleção de Cliente</h3>
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard icon={<Server className="text-blue-600" />} title="Servidores" value={activeClient ? "Monitorando" : "-"} desc="Infraestrutura SIM" />
                <StatCard icon={<Activity className="text-emerald-600" />} title="APM" value={activeClient ? "Ativo" : "-"} desc="Aplicações de Negócio" />
                <StatCard icon={<Database className="text-amber-600" />} title="Databases" value={activeClient ? "Conectado" : "-"} desc="Instâncias DB" />
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
                            <p className="text-xs opacity-40 font-mono truncate max-w-xs">{client.controllerUrl}</p>
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
                        <li className="flex justify-between border-bottom border-[#141414]/5 pb-2">
                          <span className="opacity-60">Janela:</span>
                          <span className="font-medium">24 Horas</span>
                        </li>
                        <li className="flex justify-between border-bottom border-[#141414]/5 pb-2">
                          <span className="opacity-60">Filtro HML:</span>
                          <span className="font-medium text-emerald-600">Ativo</span>
                        </li>
                        <li className="flex justify-between border-bottom border-[#141414]/5 pb-2">
                          <span className="opacity-60">Modelo AI:</span>
                          <span className="font-medium">Gemini 3.1 Pro</span>
                        </li>
                      </ul>
                    </div>
                  </div>
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
