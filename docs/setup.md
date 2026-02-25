# Guia de Configuração Passo a Passo 📖

Este guia detalha como configurar o **AppD Automator** do zero para um ambiente profissional.

## 1. Configuração no AppDynamics

Para que a aplicação possa coletar dados, você precisa de um **API Client**.

1.  Acesse o seu Controller do AppDynamics.
2.  Vá em **Settings** (ícone de engrenagem) > **Administration**.
3.  Clique na aba **API Clients**.
4.  Clique em **+ Add**.
5.  **Client Name**: Escolha um nome (ex: `automator`).
6.  **Account Name**: O nome da sua conta AppDynamics.
7.  **Roles**: Atribua permissões de leitura (ex: `Applications and Dashboards Viewer`).
8.  **Generate Secret**: Salve o `Client Secret` gerado.

> **Dica**: O seu `Client ID` final será `nome_do_client@nome_da_conta`.

## 2. Configuração do Microsoft Teams

1.  No canal do Teams onde deseja receber os relatórios, clique nos três pontos `...` > **Workflows**.
2.  Procure por **"Post to a channel when a webhook request is received"**.
3.  Siga o assistente e copie a **URL do Webhook** gerada.

## 3. Configuração da Gemini API

1.  Acesse o [Google AI Studio](https://aistudio.google.com/).
2.  Clique em **Get API Key**.
3.  Crie uma nova chave de API.

## 4. Rodando a Aplicação

1.  No **AppD Automator**, vá na aba **Clientes**.
2.  Clique em **Novo Cliente**.
3.  Preencha os campos com as informações coletadas nos passos acima.
4.  Clique em **Salvar Cliente**.
5.  No **Dashboard**, selecione o cliente e clique em **Gerar Checklist**.

## 5. Teste de Conexão (Opcional)

Você pode testar se as suas credenciais do AppDynamics estão funcionando usando o comando `curl` abaixo:

```bash
curl -X POST -H "Content-Type: application/x-www-form-urlencoded" \
"https://<CONTROLLER_URL>/controller/api/oauth/access_token" \
-d 'grant_type=client_credentials&client_id=<CLIENT_ID>&client_secret=<CLIENT_SECRET>'
```
