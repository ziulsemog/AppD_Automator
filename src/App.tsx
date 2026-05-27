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

                      --- SAÍDA 2: ONEPAGE DASHBOARD (HTML PADRÃO CORPORATIVO YSSY)
            Gere um arquivo HTML5 único, auto-contido, utilizando estritamente a estrutura e classes extraídas do layout padrão da empresa.

            REGRAS DE IDENTIDADE VISUAL E LOGOS:
            1. Use as URLs de imagens exatas fornecidas abaixo para os cabeçalhos (NÃO invente caminhos locais):
               - Se o cliente analisado (${activeClient.name}) for Banco Yamaha (ou contiver 'Yamaha'), use exatamente esta URL de logo do cliente no .logo: 'https://media.licdn.com/dms/image/v2/C4D0BAQHQ7AKqq0Nhcg/company-logo_200_200/company-logo_200_200/0/1630580216813/banco_yamaha_motor_do_brasil_logo?e=1780531200&v=beta&t=lV7us5w9-jNHJUk7-jCqG-Y1ztvM--UqI9x6BVoPncE'
               - Se o cliente analisado (${activeClient.name}) for LogIn Logística (ou contiver 'Login' ou 'LogIn'), use exatamente esta URL de logo do cliente no .logo: 'https://www.loginlogistica.com.br/wp-content/uploads/2023/12/logo.png'
               - Se for outro cliente, use uma representação de texto ou imagem coerente, mas para estes dois acima, use estritamente estas URLs.
               - No rodapé (footer), inclua o logo de parceiro da YSSY usando esta URL exata: 'https://yssy.com.br/wp-content/uploads/2025/09/image-1.svg'
            2. O <head> deve conter rigorosamente a tag '<meta charset="UTF-8">' para anular erros de português.

            CONFIGURAÇÃO DE DESIGN EXCLUSIVA (CSS DETERMINÍSTICO):
            Injete exatamente este bloco de estilos dentro da tag <style>:
            <style>
              *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
              body{font-family:'Segoe UI',Arial,sans-serif;background:#f0f2f5;color:#1a1a2e;font-size:13px}
              .container{max-width:1280px;margin:0 auto;padding:18px}
              .header-container{background:linear-gradient(135deg,#0d1b3e 0%,#1a3a6e 60%,#0d1b3e 100%);border-radius:14px;padding:22px 28px 18px;margin-bottom:18px;box-shadow:0 4px 20px rgba(0,0,0,.35)}
              .header-title{display:flex;align-items:center;gap:18px;flex-wrap:wrap}
              .logo{height:48px;background:#fff;border-radius:8px;padding:4px 10px}
              .title-text h1{color:#fff;font-size:20px;font-weight:700;letter-spacing:.5px}
              .title-text .subtitle{color:#a8c4e8;font-size:12px;margin-top:3px}
              .status-pills{display:flex;gap:8px;flex-wrap:wrap;margin-left:auto}
              .pill{padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap}
              .pill.critical{background:#c0392b;color:#fff}
              .pill.warn{background:#e67e22;color:#fff}
              .pill.degradado{background:#d35400;color:#fff}
              .pill.ok{background:#27ae60;color:#fff}
              .pill.rec{background:#8e44ad;color:#fff}
              .pill.focus{background:#2980b9;color:#fff}
              .kpi-bar{display:flex;gap:10px;flex-wrap:wrap;background:rgba(255,255,255,.07);border-radius:10px;padding:12px 16px;margin-top:16px}
              .kpi-item{display:flex;flex-direction:column;align-items:center;background:rgba(255,255,255,.12);border-radius:8px;padding:8px 16px;min-width:110px;flex:1}
              .kpi-item .kpi-val{font-size:22px;font-weight:800;color:#fff}
              .kpi-item .kpi-lbl{font-size:10px;color:#a8c4e8;text-transform:uppercase;letter-spacing:.5px;margin-top:2px;text-align:center}
              .kpi-item.red .kpi-val{color:#e74c3c}
              .kpi-item.orange .kpi-val{color:#f39c12}
              .kpi-item.green .kpi-val{color:#2ecc71}
              .kpi-item.purple .kpi-val{color:#bb8fce}
              .grid{display:grid;gap:14px;margin-bottom:14px}
              .g2{grid-template-columns:repeat(2,1fr)}
              .g3{grid-template-columns:repeat(3,1fr)}
              .g4{grid-template-columns:repeat(4,1fr)}
              @media(max-width:900px){.g2,.g3,.g4{grid-template-columns:1fr}}
              .card{background:#fff;border-radius:12px;padding:16px 18px;box-shadow:0 2px 10px rgba(0,0,0,.07);border-left:4px solid #2980b9}
              .card.cc{border-left-color:#c0392b}
              .card.wc{border-left-color:#e67e22}
              .card.dc{border-left-color:#d35400}
              .card.gc{border-left-color:#27ae60}
              .card.tc{border-left-color:#16a085}
              .card h3{font-size:13px;font-weight:700;margin-bottom:10px;color:#1a1a2e;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
              .card ul{padding-left:16px}
              .card ul li{margin-bottom:5px;line-height:1.5;color:#2c3e50}
              .st{background:linear-gradient(90deg,#1a3a6e,#0d1b3e);border-radius:8px;padding:8px 16px;margin:18px 0 12px}
              .st h3{color:#fff;font-size:13px;font-weight:700;display:flex;align-items:center;gap:8px}
              .m{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dashed #ecf0f1}
              .m:last-child{border-bottom:none}
              .m .l{color:#7f8c8d;font-size:12px}
              .m .v{font-weight:700;font-size:12px;color:#2c3e50}
              .m .v.r{color:#c0392b}
              .m .v.o{color:#d35400}
              .m .v.g{color:#27ae60}
              .tbl{width:100%;border-collapse:collapse;font-size:12px}
              .tbl th{background:#1a3a6e;color:#fff;padding:8px 10px;text-align:left;font-weight:700;text-transform:uppercase;letter-spacing:.4px}
              .tbl td{padding:7px 10px;border-bottom:1px solid #ecf0f1;vertical-align:middle}
              .tbl tr:nth-child(even) td{background:#f8f9fa}
              .tbl tr:hover td{background:#eaf2ff}
              .st2{width:100%;border-collapse:collapse;font-size:11.5px}
              .st2 th{background:#1a3a6e;color:#fff;padding:6px 8px;text-align:left;font-size:11px}
              .st2 td{padding:5px 8px;border-bottom:1px solid #f0f0f0;vertical-align:middle}
              .st2 tr:nth-child(even) td{background:#f8f9fa}
              .bdg{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700}
              .bdg.r{background:#fdecea;color:#c0392b}
              .bdg.o{background:#fef3e2;color:#d35400}
              .bdg.g{background:#e9f7ef;color:#27ae60}
              .di{background:#f8f9fa;border-radius:8px;padding:10px 12px;border-left:3px solid #8e44ad;margin-bottom:8px}
              .di.r{border-left-color:#c0392b}
              .di.o{border-left-color:#e67e22}
              .di.g{border-left-color:#27ae60}
              .di .dn{font-weight:700;font-size:12px;color:#1a1a2e;margin-bottom:6px}
              .as{display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-bottom:1px dashed #ecf0f1}
              .as:last-child{border-bottom:none}
              .an{min-width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0;margin-top:1px}
              .an.r{background:#c0392b}
              .an.o{background:#d35400}
              .an.b{background:#2980b9}
              .an.g{background:#27ae60}
              .ab{flex:1;font-size:12px;line-height:1.55;color:#2c3e50}
              .ab strong{color:#1a1a2e}
              .rt{color:#8e44ad;font-weight:700;font-size:11px}
              .esc{color:#c0392b;font-weight:700;font-size:11px}
              .imp{color:#27ae60;font-weight:700;font-size:11px}
              .note{margin-top:8px;font-size:11.5px;color:#7f8c8d;line-height:1.5}
              .alerta{background:#fdecea;border-radius:6px;padding:8px 12px;font-size:12px;color:#c0392b;font-weight:600;margin-bottom:10px}
              .alerta-warn{background:#fef3e2;border-radius:6px;padding:8px 12px;font-size:12px;color:#d35400;font-weight:600;margin-top:10px}
              .footer{text-align:center;margin-top:22px;padding:12px;background:#1a3a6e;border-radius:8px;color:#a8c4e8;font-size:11px}
              .footer strong{color:#fff}

              /* Estrutura Corrigida do Gráfico de Bancos de Dados */
              .db-chart-section { background: #fff; border-radius: 12px; padding: 20px; margin-bottom: 18px; box-shadow: 0 4px 12px rgba(0,0,0,.05); border-left: 4px solid #8e44ad; }
              .chart-wrapper { display: flex; align-items: flex-end; justify-content: space-around; height: 160px; border-bottom: 2px solid #e9ecef; padding-bottom: 10px; margin-top: 15px; }
              .bar-group { display: flex; flex-direction: column; align-items: center; flex: 1; max-width: 60px; }
              .bar-value { font-size: 11px; font-weight: bold; margin-bottom: 4px; color: #333; }
              .bar-fill { width: 100%; min-height: 5px; border-radius: 4px 4px 0 0; background: #28a745; transition: height 0.4s ease; }
              .bar-fill.critico { background: #dc3545; }
              .bar-fill.warning { background: #ffc107; }
              .bar-label { font-size: 10px; font-weight: 700; color: #555; text-align: center; margin-top: 8px; white-space: nowrap; transform: rotate(-25deg); }
            </style>

            ESTRUTURA E CONTEÚDO DO HTML:
            O HTML5 gerado deve conter TODAS as seguintes seções estruturadas e preenchidas dinamicamente a partir dos dados do API:
            1. div class="container" principal.
            2. HEADER-CONTAINER:
               - Exiba o logo correto da Regra de Logos no img class="logo".
               - Título elegante ${activeClient.name} — AppDynamics com legenda (subtitle), e os badges de estado gerais no .status-pills (ex: critical, warn, degradado, ok).
               - Renderize a .kpi-bar populando os .kpi-item com valores consolidados referentes a Apps (Critical, Warning, Degradado, OK), Servidores e DBs (Critical, Warning), além do Total de Servidores.
            3. SUMÁRIO + KPIs (usando div class="grid g2"):
               - Um card com classe .card.cc para o "Sumário Executivo" contendo análises de escalação qualificadas.
               - Um card padrão .card para os "KPIs do Dia" consolidados.
            4. APLICAÇÕES:
               - Título da seção no bloco .st contendo h3 "🚀 Aplicações".
               - Uma grade flexível div class="grid g2" ou div class="grid g3" contendo os cards individuais de aplicações problemáticas classificados por cor: .card.cc (crítico), .card.wc (warning), .card.dc (degradado), .card.gc (ok).
               - Exiba as métricas usando a estrutura div class="m" com span class="l" Label e span class="v" Valor. Use classes .v.r (vermelho), .v.o (laranja), .v.g (verde).
               - Abaixo da grade de problemas, exiba a tabela de pontos residuais ou aplicações saudáveis table class="st2".
            5. INFRAESTRUTURA:
               - Bloco .st contendo h3 "🖥️ Infraestrutura".
               - No topo desta seção, coloque caixas ou cards individuais destacados (em um grid div class="grid g2" ou similar) para cada host / servidor que apresente criticidade ou sob estresse de recursos de CPU, memória ou disco (com classe .card.cc para crítico ou .card.wc para atenção). Inclua dentro de cada card destacado o hostname / ID do servidor, a métrica sob pressão (ex: "Critical CPU Saturation", "Disk Space Exhaustion", "Memory Overload") e um breve diagnóstico clínico / técnico.
               - Abaixo dos destaques, apresente a tabela detalhada .st2 listando dados de CPU, GPU, Disco, Memória e o diagnóstico correspondente para todos os hospedeiros monitorados.
            6. BANCO DE DADOS:
               - Bloco .st contendo h3 "🗄️ Banco de Dados".
               - No topo desta seção, coloque caixas ou cards individuais destacados, lado a lado (utilizando um grid div class="grid g2" ou similar), exclusivamente para as instâncias de Banco de Dados com maior criticidade de recursos ou gargalos severos no dia analisado (por exemplo, "BYMDPDB002 - Critical CPU Saturation" em um card com classe .card.cc e "BYMDPDB008 - Memory Pressure" em um card com classe .card.wc, ou diagnóstico similar para outras instâncias sob alto estresse técnico).
               - Abaixo dos blocos com os alertas destacados mais graves, apresente TODAS as instâncias do Banco de Dados listadas em formato de tabela estruturada sob a classe .st2 (idêntica à tabela da seção de servidores / infraestrutura). A tabela deve conter colunas para: Instância, Tipo / Tecnologia, Queries, Time in DB, CPU (%) atual, Status diário (ou Tendência) e Observação / Diagnóstico técnico detalhado. Não exiba o gráfico visual de DB Waits bar-fill ou db-chart-section.
            7. AÇÕES DE CURTO PRAZO:
               - Bloco .st contendo h3 "🛠️ Ações de Curto Prazo — [DATA_ATUAL]".
               - Um grid div class="grid g2" dividindo em cards para "🚀 Aplicações" e "🖥️ Infraestrutura & Banco de Dados".
               - Use a lista de ações .as com o círculo numbered .an.r (crítico), .an.o (warning), .an.b (azul), etc. e o conteúdo na div .ab.
            8. TABELA DE RECORRÊNCIA:
               - Bloco .st contendo h3 "📋 Tabela de Recorrência — Ações não implementadas".
               - Exiba a tabela consolidada .tbl contendo as colunas: Item (com tag .rt se recorrente), Categoria (.bdg.r ou .bdg.o), Evidência acumulada, Risco, Dias, Tendência, Status.
            9. FOOTER:
               - Bloco do rodapé div class="footer" com créditos detalhados à YSSY Solutions e fonte de dados.
               - Inclua uma representação centralizada ou elegante do logo de parceiro da YSSY 'https://yssy.com.br/wp-content/uploads/2025/09/image-1.svg' logo abaixo do texto com altura máxima de 20px.

            DIRETRIZ DE DESTAQUES DE INFRAESTRUTURA:
            Ao montar os cards destacados de servidores sob sobrecarga:
            - Se um servidor possuir métricas alarmantes (CPU > 80%, Memória > 85%, ou Disco > 85%), crie um card de destaque visual com a classe correspondente (.card.cc para crítico ou .card.wc para atenção).
            - Coloque um cabeçalho curto contendo o nome do host e o problema detectado, seguido por um parágrafo que descreve numericamente o gargalo e propõe um breve diagnóstico técnico ou recomendação preventiva (ex: limpeza de logs IIS ou scale-up).

            DIRETRIZ DE DESTAQUES DE BANCO DE DADOS:
            Ao montar as caixas ou cards individuais destacados no topo da seção de bancos de dados:
            - Se a instância possuir violação de consumo (ex: CPU > 95% ou memória extrema), crie um card elegante (utilizando classes como .card.cc para crítico ou .card.wc para atenção) contendo em destaque o ID da instância e a causa (Ex: "BYMDPDB002 - Critical CPU Saturation" ou "BYMDPDB008 - Memory Pressure") e embaixo a descrição exata do status (Ex: "Instância operando em 99.5% de CPU. Alto risco de travamento de conexões transacionais." ou "Uso de memória em 96% (Threshold 95%). Recomendado expurgo de buffers ou scale-up.").
            - Se o tempo do banco de dados (Time spent in DB / waits) ou erro for crítico por mais de 24 horas consecutivas, certifique-se de que essa instância esteja em destaque nestas caixas e também listada com prioridade na lista detalhada.

            LÓGICA DE ANÁLISE (SRE BRAIN):
            1. ANOMALIA DE SAÚDE: Se uma App tiver Health "Green" mas Erro % > 5%, force o Card para CRÍTICO (e use a classe .card.cc) e adicione um aviso: "🚨 Detecção de falha silenciosa".
            2. RECORRÊNCIA: Se o dado indicar que o problema persiste por > 24h, use obrigatoriamente a classe '.rt' com o texto "[REPETIDO]".
            3. INFRAESTRUTURA: Liste hosts sem Machine Agent na seção de infra com a tag "Monitoramento Cego".
            4. BANCOS DE DADOS: Destaque os gargalos de recursos mais severos em caixas separadas no topo e mapeie todas as demais em uma lista de tabela estilo servidores .st2.

            IMPORTANTE: Todos os textos devem estar em Português (Brasil). Mantenha o tom executivo e técnico. Deixe a visualização limpa, sem tags CSS ou HTML quebradas no output.
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
