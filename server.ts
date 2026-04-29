import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // AppDynamics API Proxy & Data Aggregator
  app.post("/api/appdynamics-data", async (req, res) => {
    try {
      const { 
        controllerUrl: rawUrl, 
        accountName, 
        clientName, 
        clientSecret 
      } = req.body;

      if (!rawUrl || !accountName || !clientName || !clientSecret) {
        return res.status(400).json({ error: "Configurações do cliente incompletas." });
      }

      let controllerUrl = rawUrl.replace(/\/$/, "");
      
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
      const { message, webhookUrl } = req.body;

      if (!webhookUrl) {
        return res.status(400).json({ error: "Teams Webhook URL not provided." });
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
    } catch (error) {
      res.status(500).json({ error: error.message });
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
