# AppD Automator 🚀

O **AppD Automator** é uma ferramenta profissional de SRE e Observabilidade que automatiza a geração de checklists diários do AppDynamics utilizando Inteligência Artificial (Gemini 1.5 Pro). Projetado para ambientes multicliente, ele consolida dados de APM, Infraestrutura e Bancos de Dados em relatórios executivos prontos para o Microsoft Teams.

## 🛠 Tecnologias

- **Frontend**: React 18, TypeScript, Tailwind CSS, Framer Motion (animações).
- **Backend**: Node.js, Express (Proxy de API e agregação de dados).
- **IA**: Google Gemini API (Análise inteligente e formatação de relatórios).
- **Observabilidade**: AppDynamics REST API (OAuth2 Authentication).
- **Integração**: Microsoft Teams Webhooks.
- **Ícones**: Lucide React.

## ✨ Funcionalidades

- **Gerenciamento Multicliente**: Cadastre e alterne entre múltiplos perfis de clientes com persistência local (`localStorage`).
- **Automação de Checklist**: Coleta automática de violações de Health Rules, métricas de servidores e bancos de dados.
- **Inteligência Artificial**: Processamento de dados brutos para identificar apenas alertas críticos e warnings relevantes.
- **Filtro Inteligente**: Ignora automaticamente ambientes de homologação (HML) conforme regras de negócio.
- **Envio Direto**: Integração nativa com webhooks do Teams para envio instantâneo do relatório.
- **Interface Moderna**: UI/UX inspirada em ferramentas de alto nível, com suporte a edição de perfis e feedback em tempo real.

## 🚀 Como Implementar

### Pré-requisitos

1.  **AppDynamics**: Criar um *API Client* no Controller (Settings -> Administration -> API Clients).
2.  **Gemini API**: Obter uma chave de API no [Google AI Studio](https://aistudio.google.com/).
3.  **Teams**: Configurar um *Incoming Webhook* ou um fluxo no Power Automate.

### Instalação

1.  Clone o repositório:
    ```bash
    git clone https://github.com/ziulsemog/appd-automator.git
    cd appd-automator
    ```

2.  Instale as dependências:
    ```bash
    npm install
    ```

3.  Configure as variáveis de ambiente:
    Crie um arquivo `.env` baseado no `.env.example`:
    ```env
    GEMINI_API_KEY=sua_chave_aqui
    ```

4.  Inicie o servidor de desenvolvimento:
    ```bash
    npm run dev
    ```

## 📖 Estrutura do Projeto

- `/server.ts`: Servidor Express que atua como proxy para contornar CORS e gerenciar autenticação OAuth2 do AppDynamics.
- `/src/App.tsx`: Aplicação React principal com lógica de gerenciamento de estado e integração com Gemini.
- `/src/main.tsx`: Ponto de entrada do React.
- `/package.json`: Gerenciamento de dependências e scripts.

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

---
Desenvolvido por [Luiz Gomes](https://github.com/ziulsemog)
