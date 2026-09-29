import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const PORT = process.env.APP_PORT ? parseInt(process.env.APP_PORT, 10) : 3000;

  // AppDynamics API Proxy & Data Aggregator
  app.post("/api/appdynamics-data", async (req, res) => {
    try {
      const { 
        clientId: clientIdParam,
        controllerUrl: rawUrl, 
        accountName: accountNameReq, 
        clientName: clientNameReq, 
        clientSecret: clientSecretReq 
      } = req.body;

      let controllerUrl = (rawUrl || "").trim();
      let accountName = (accountNameReq || "").trim();
      let clientName = (clientNameReq || "").trim();
      let clientSecret = (clientSecretReq || "").trim();

      // Override / Fallback to server-side secure environment variables
      if (clientIdParam === 'yssy-solucoes') {
        controllerUrl = process.env.YSSY_CONTROLLER_URL || controllerUrl;
        accountName = process.env.YSSY_ACCOUNT_NAME || accountName;
        clientName = process.env.YSSY_CLIENT_NAME || clientName;
        clientSecret = process.env.YSSY_CLIENT_SECRET || clientSecret;
      } else if (clientIdParam === 'login-logistica') {
        controllerUrl = process.env.LOGIN_CONTROLLER_URL || controllerUrl;
        accountName = process.env.LOGIN_ACCOUNT_NAME || accountName;
        clientName = process.env.LOGIN_CLIENT_NAME || clientName;
        clientSecret = process.env.LOGIN_CLIENT_SECRET || clientSecret;
      } else if (clientIdParam === 'banco-yamaha') {
        controllerUrl = process.env.YAMAHA_CONTROLLER_URL || controllerUrl;
        accountName = process.env.YAMAHA_ACCOUNT_NAME || accountName;
        clientName = process.env.YAMAHA_CLIENT_NAME || clientName;
        clientSecret = process.env.YAMAHA_CLIENT_SECRET || clientSecret;
      } else if (clientIdParam === 'stallantis') {
        controllerUrl = process.env.STELLANTIS_CONTROLLER_URL || controllerUrl;
        accountName = process.env.STELLANTIS_ACCOUNT_NAME || accountName;
        clientName = process.env.STELLANTIS_CLIENT_NAME || clientName;
        clientSecret = process.env.STELLANTIS_CLIENT_SECRET || clientSecret;
      }

      // Generic default if empty
      if (!controllerUrl || controllerUrl === "" || controllerUrl.includes("your-controller")) {
        controllerUrl = (process.env.APPDYNAMICS_CONTROLLER_URL || "").trim();
      }
      if (!accountName || accountName === "" || accountName.includes("your-account")) {
        accountName = (process.env.APPDYNAMICS_ACCOUNT_NAME || "").trim();
      }
      if (!clientName || clientName === "" || clientName.includes("your-client")) {
        clientName = (process.env.APPDYNAMICS_CLIENT_NAME || "").trim();
      }
      if (!clientSecret || clientSecret === "" || clientSecret.includes("your-client-secret")) {
        clientSecret = (process.env.APPDYNAMICS_CLIENT_SECRET || "").trim();
      }

      if (!controllerUrl || !accountName || !clientName || !clientSecret) {
        return res.status(400).json({ error: "Configurações do cliente incompletas ou não configuradas no servidor." });
      }

      controllerUrl = controllerUrl.replace(/\/$/, "");
      
      // 0. Get OAuth2 Token
      const tokenUrl = `${controllerUrl}/controller/api/oauth/access_token`;
      
      let clientId = clientName.trim();
      if (!clientId.includes("@")) {
        clientId = `${clientId}@${accountName.trim()}`;
      }

      const authHeader = Buffer.from(`${clientId}:${clientSecret.trim()}`).toString('base64');
      
      const tokenParams = new URLSearchParams();
      tokenParams.append('grant_type', 'client_credentials');
      tokenParams.append('client_id', clientId);
      tokenParams.append('client_secret', clientSecret.trim());

      console.log(`Attempting to get token for ${clientId} at ${tokenUrl}`);

      const tokenRes = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authHeader}`
        },
        body: tokenParams.toString()
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error(`AppDynamics Token Error Response (${tokenRes.status}):`, errText);
        throw new Error(`Falha ao obter token (OAuth2): ${tokenRes.status} - ${errText.substring(0, 500)}`);
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      };

      // 1. Fetch Applications
      const appsRes = await fetch(`${controllerUrl}/controller/rest/applications?output=JSON`, { headers });
      if (!appsRes.ok) {
        const text = await appsRes.text();
        throw new Error(`AppDynamics Applications API failed: ${appsRes.status} ${text}`);
      }
      const applications = await appsRes.json();

      // 2. Fetch Health Rule Violations and Events for each app
      const healthViolations = [];
      const events = [];
      
      // Also try to fetch from "hidden" applications like SIM or DB Monitoring
      const allAppsToQuery = [...applications];
      
      // Add SIM and DB Monitoring if not already in the list
      const simAppName = "Server & Infrastructure Monitoring";
      const dbAppName = "Database Monitoring";
      
      if (!allAppsToQuery.find(a => a.name === simAppName)) {
        allAppsToQuery.push({ name: simAppName });
      }
      if (!allAppsToQuery.find(a => a.name === dbAppName)) {
        allAppsToQuery.push({ name: dbAppName });
      }
      
      for (const appItem of allAppsToQuery) {
        if (appItem.name.toUpperCase().includes("HML")) continue;

        // Fetch Violations
        try {
          const violationsRes = await fetch(
            `${controllerUrl}/controller/rest/applications/${encodeURIComponent(appItem.name)}/problems/healthrule-violations?time-range-type=BEFORE_NOW&duration-in-mins=1440&output=JSON`,
            { headers }
          );
          if (violationsRes.ok) {
            const violations = await violationsRes.json();
            if (violations && violations.length > 0) {
              healthViolations.push({ appName: appItem.name, violations });
            }
          }
        } catch (e) { console.error(`Failed to fetch violations for ${appItem.name}`, e); }

        // Fetch Events (last 24h)
        try {
          const eventsRes = await fetch(
            `${controllerUrl}/controller/rest/applications/${encodeURIComponent(appItem.name)}/events?time-range-type=BEFORE_NOW&duration-in-mins=1440&event-types=APPLICATION_ERROR,DIAGNOSTIC_SESSION,HEALTH_RULE_VIOLATION_CRITICAL,HEALTH_RULE_VIOLATION_WARNING&output=JSON`,
            { headers }
          );
          if (eventsRes.ok) {
            const appEvents = await eventsRes.json();
            if (appEvents && appEvents.length > 0) {
              events.push({ appName: appItem.name, events: appEvents });
            }
          }
        } catch (e) { console.error(`Failed to fetch events for ${appItem.name}`, e); }
      }

      // 3. Fetch Servers (Machine Agents) and their health
      let servers = [];
      try {
        const serversRes = await fetch(`${controllerUrl}/controller/rest/markethistory/machine-agents?output=JSON`, { headers });
        if (serversRes.ok) {
          servers = await serversRes.json();
        }
      } catch (e) { console.error("Servers API failed", e); }

      // 4. Fetch Databases and their health
      let databases = [];
      try {
        const dbsRes = await fetch(`${controllerUrl}/controller/rest/databases/instances?output=JSON`, { headers });
        if (dbsRes.ok) {
          databases = await dbsRes.json();
        }
      } catch (e) { console.error("Databases API failed", e); }

      res.json({
        applications: applications.filter((a: any) => !a.name.toUpperCase().includes("HML")),
        healthViolations,
        events,
        servers: servers.filter((s: any) => !s.name?.toUpperCase().includes("HML")),
        databases: databases.filter((d: any) => !d.name?.toUpperCase().includes("HML")),
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error("Error fetching AppDynamics data:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/send-teams", async (req, res) => {
    try {
      const { clientId, message, webhookUrl: webhookUrlReq } = req.body;

      let webhookUrl = (webhookUrlReq || "").trim();

      // Override / Fallback to server-side secure environment variables
      if (clientId === 'yssy-solucoes') {
        webhookUrl = process.env.YSSY_TEAMS_WEBHOOK_URL || webhookUrl;
      } else if (clientId === 'login-logistica') {
        webhookUrl = process.env.LOGIN_TEAMS_WEBHOOK_URL || webhookUrl;
      } else if (clientId === 'banco-yamaha') {
        webhookUrl = process.env.YAMAHA_TEAMS_WEBHOOK_URL || webhookUrl;
      } else if (clientId === 'stallantis') {
        webhookUrl = process.env.STELLANTIS_TEAMS_WEBHOOK_URL || webhookUrl;
      }

      // Default generic fallback URL
      if (!webhookUrl || webhookUrl === "" || webhookUrl.includes("outlook.office")) {
        webhookUrl = (process.env.TEAMS_WEBHOOK_URL || "").trim();
      }

      if (!webhookUrl || webhookUrl === "") {
        return res.status(400).json({ error: "Teams Webhook URL não configurado no servidor." });
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message
        })
      });

      if (response.ok) {
        res.json({ success: true });
      } else {
        const errText = await response.text();
        res.status(500).json({ error: `Teams API error: ${response.status} ${errText}` });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI-Powered SRE Checklist & OnePage Generator
  app.post("/api/generate-report", async (req, res) => {
    try {
      const { clientName, rawData, attachedImages } = req.body;
      const today = new Date().toLocaleDateString('pt-BR');

      const parts: any[] = [
        {
          text: `
            Você é um Engenheiro de Observabilidade SRE especialista em AppDynamics e ${clientName || 'Cliente'}.
            Sua missão é processar os seguintes dados brutos do AppDynamics e as imagens anexadas (se houver) para gerar duas saídas: 1) Um checklist para Teams e 2) Uma OnePage visual em HTML.

            --- REGRAS DE CODIFICAÇÃO E IDIOMA
            1. O output DEVE ser em Português (Brasil).
            2. O HTML DEVE iniciar obrigatoriamente com <meta charset="UTF-8"> no início do <head>.
            3. Não use bibliotecas externas. Todo o CSS deve estar dentro da tag <style>.

            Dados brutos do API:
            ${JSON.stringify(rawData || {}, null, 2)}

            --- SAÍDA 1: CHECKLIST TEAMS (Texto Plano)
            Não utilize apenas asteriscos para ênfase. Use separadores visuais e letras maiúsculas para os títulos de seção. Siga este modelo EXATAMENTE:

            ==================================================
            [${clientName || 'Cliente'}] – Checklist Diário AppDynamics – ${today}
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

            --- SAÍDA 2: ONEPAGE DASHBOARD (HTML PADRÃO CORPORATIVO SRE OBSERVABILITY)
            Gere um arquivo HTML5 único, auto-contido, utilizando estritamente a estrutura e classes extraídas do layout padrão da empresa.

            REGRAS DE IDENTIDADE VISUAL E LOGOS:
            1. Use as URLs de imagens exatas fornecidas abaixo para os cabeçalhos (NÃO invente caminhos locais):
               - Se o cliente analisado (${clientName || ''}) for Banco Yamaha (ou contiver 'Yamaha'), use exatamente esta URL de logo do cliente no .logo: 'https://media.licdn.com/dms/image/v2/C4D0BAQHQ7AKqq0Nhcg/company-logo_200_200/company-logo_200_200/0/1630580216813/banco_yamaha_motor_do_brasil_logo?e=1780531200&v=beta&t=lV7us5w9-jNHJUk7-jCqG-Y1ztvM--UqI9x6BVoPncE'
               - Se o cliente analisado (${clientName || ''}) for LogIn Logística (ou contiver 'Login' ou 'LogIn'), use exatamente esta URL de logo do cliente no .logo: 'https://www.loginlogistica.com.br/wp-content/uploads/2023/12/logo.png'
               - Se o cliente analisado (${clientName || ''}) for Stellantis (ou contiver 'Stellantis' ou 'STELLANTIS'), use exatamente esta URL de logo do cliente no .logo: 'https://stellantisportalinstitucional.cdn.prismic.io/stellantisportalinstitucional/Z0SPBa8jQArT1Ryy_logo-footer.svg'
               - Se for outro cliente, use uma representação de texto ou imagem coerente, mas para estes acima, use estritamente estas URLs.
               - PROIBIÇÃO ABSOLUTA: REMOVER TODOS OS LOGOS DA YSSY. NÃO exiba nenhum logo da Yssy, NUNCA inclua imagem ou link de logo da Yssy. No cabeçalho deve constar apenas o logo do cliente analisado.
            2. O <head> deve conter rigorosamente a tag '<meta charset="UTF-8">' para anular erros de português.
            3. No RODAPÉ (.footer): É TERMINANTEMENTE PROIBIDO colocar "YSSY". Remover "YSSY" e colocar obrigatoriamente "SRE Observability Team". Exemplo: "SRE Observability Team | Gerado em ${today}".

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
              .meta-strip{display:flex;gap:20px;padding-top:14px;margin-top:14px;border-top:1px solid rgba(255,255,255,.15);flex-wrap:wrap}
              .meta-item{color:#c5d8f5;font-size:11px}
              .meta-item b{color:#fff}
              .kpi-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:18px}
              .kpi{background:#fff;border-radius:10px;padding:14px 16px;box-shadow:0 2px 8px rgba(0,0,0,.06);text-align:center;border-left:4px solid #1a3a6e}
              .kpi.alert{border-left-color:#c0392b}
              .kpi.warn{border-left-color:#e67e22}
              .kpi.good{border-left-color:#27ae60}
              .kpi .num{font-size:24px;font-weight:700;color:#0d1b3e}
              .kpi.alert .num{color:#c0392b}
              .kpi.warn .num{color:#e67e22}
              .kpi.good .num{color:#27ae60}
              .kpi .lbl{font-size:11px;color:#7f8c8d;text-transform:uppercase;margin-top:2px}
              .st{background:#fff;border-radius:10px;padding:16px 20px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,.06)}
              .st h3{font-size:14px;font-weight:700;color:#0d1b3e;margin-bottom:12px;display:flex;align-items:center;gap:8px}
              .st2{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}
              .card{background:#f8f9fb;border-radius:8px;padding:12px 14px;border:1px solid #e1e8ed}
              .card.cc{border-left:4px solid #c0392b}
              .card.wc{border-left:4px solid #e67e22}
              .card.ok{border-left:4px solid #27ae60}
              .card-header{font-weight:700;font-size:13px;display:flex;justify-content:space-between;margin-bottom:6px}
              .card-detail{font-size:12px;color:#555;line-height:1.4}
              .tbl{width:100%;border-collapse:collapse;font-size:12px}
              .tbl th{background:#f1f4f9;padding:8px 10px;text-align:left;font-weight:600;color:#333;border-bottom:2px solid #ddd}
              .tbl td{padding:8px 10px;border-bottom:1px solid #eee}
              .bdg{display:inline-block;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;text-transform:uppercase}
              .bdg.r{background:#fadbd8;color:#922b21}
              .bdg.o{background:#fdebd0;color:#b9770e}
              .bdg.g{background:#d4efdf;color:#196f3d}
              .rt{color:#c0392b;font-weight:700;font-size:11px}
              .footer{text-align:center;font-size:11px;color:#888;margin-top:20px;padding:12px}
            </style>

            ESTRUTURA DE SEÇÕES MANDATÓRIAS (ONPAGE DASHBOARD):
            1. HEADER (.header-container) com logomarca do cliente (apenas do cliente, sem logo da Yssy), título, status geral e meta-strip.
            2. KPI BAR (.kpi-row) com 5 KPIs: Total Apps Monitoradas, Health Rule Violations Críticas, Warning, Servidores sob Risco, Instâncias de Banco com Erro/Waits.
            3. BLOCO RESUMO EXECUTIVO (.st) com análise de impacto.
            4. BLOCO APLICAÇÕES (.st com .st2) contendo cada app relevante.
            5. BLOCO INFRAESTRUTURA (.st com .st2) listando servidores com foco em anomalias (CPU/Memória/Disco).
            6. BLOCO BANCO DE DADOS (.st com .st2) destacando gargalos e instâncias críticas.
            7. BLOCO AÇÕES RECOMENDADAS (.st) com lista numerada de ações preventivas imediatas.
            8. BLOCO RECORRÊNCIA (.st) tabela .tbl com colunas: Item, Categoria, Evidência acumulada, Risco, Dias, Tendência, Status.
            9. FOOTER (.footer): Deve exibir obrigatoriamente "SRE Observability Team | Gerado em ${today}" (SEM mencionar YSSY).

            DIRETRIZ DE DESTAQUES DE INFRAESTRUTURA:
            - Se um servidor possuir métricas alarmantes (CPU > 80%, Memória > 85%, ou Disco > 85%), crie um card de destaque visual (.card.cc para crítico ou .card.wc para atenção).
            - Coloque um cabeçalho curto contendo o nome do host e o problema detectado, seguido por um parágrafo que descreve numericamente o gargalo e propõe um breve diagnóstico técnico ou recomendação preventiva.

            DIRETRIZ DE DESTAQUES DE BANCO DE DADOS:
            - Se a instância possuir violação de consumo (ex: CPU > 95% ou memória extrema), crie um card elegante (.card.cc para crítico ou .card.wc para atenção) contendo em destaque o ID da instância e a causa e embaixo a descrição exata do status.
            - Se o tempo do banco de dados ou erro for crítico por mais de 24 horas consecutivas, certifique-se de que essa instância esteja em destaque nestas caixas.

            LÓGICA DE ANÁLISE (SRE BRAIN):
            1. ANOMALIA DE SAÚDE: Se uma App tiver Health "Green" mas Erro % > 5%, force o Card para CRÍTICO (.card.cc) e adicione: "🚨 Detecção de falha silenciosa".
            2. RECORRÊNCIA: Se o dado indicar que o problema persiste por > 24h, use a classe '.rt' com o texto "[REPETIDO]".
            3. INFRAESTRUTURA: Liste hosts sem Machine Agent com a tag "Monitoramento Cego".
            4. BANCOS DE DADOS: Destaque os gargalos de recursos mais severos no topo e mapeie as demais.

            IMPORTANTE: Todos os textos em Português (Brasil). Mantenha o tom executivo e técnico.
            O HTML deve ser auto-contido e pronto para visualização em iframe.
            Retorne um JSON com os campos "teamsChecklist" e "onePageHtml".
          `
        }
      ];

      if (Array.isArray(attachedImages)) {
        attachedImages.forEach((img: any) => {
          if (img?.data && img?.mimeType) {
            parts.push({
              inlineData: {
                mimeType: img.mimeType,
                data: img.data
              }
            });
          }
        });
      }

      const candidateModels = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];
      let modelResponse: any = null;
      let lastError: any = null;

      for (const model of candidateModels) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            console.log(`[AI] Generating report with ${model} (attempt ${attempt})...`);
            modelResponse = await ai.models.generateContent({
              model,
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
              contents: [{ role: "user", parts }]
            });
            break;
          } catch (err: any) {
            lastError = err;
            console.warn(`[AI] ${model} attempt ${attempt} failed:`, err?.message || err);
            await new Promise(r => setTimeout(r, 1000 * attempt));
          }
        }
        if (modelResponse?.text) break;
      }

      if (!modelResponse?.text) {
        throw lastError || new Error("Não foi possível obter resposta da IA após múltiplas tentativas.");
      }

      const text = modelResponse.text;
      const result = JSON.parse(text);
      res.json(result);
    } catch (error: any) {
      console.error("Error generating report on server:", error);
      res.status(500).json({ error: error?.message || "Falha ao gerar relatório com IA." });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
