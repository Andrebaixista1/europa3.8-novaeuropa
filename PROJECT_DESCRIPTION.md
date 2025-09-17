# Nova Europa - Sistema de Consultas

## Visão Geral
Aplicação web React/TypeScript para consultas de dados e gestão de usuários. Interface segura com autenticação, consultas individuais/lote e administração completa.

## Stack Técnico
- React 18.3.1 + TypeScript
- Vite 5.4.2 + Tailwind CSS
- React Router + Context API
- Framer Motion + React Toastify

## Funcionalidades

**Autenticação**
- Login seguro + sessão persistente
- Rotas protegidas
- Logout com limpeza

**Consultas**
- Individual: CPF/NB com validação
- Lote: Upload + processamento assíncrono
- FGTS: Consultas específicas
- Maciça: Grandes volumes

**Gestão Usuários**
- CRUD completo
- Filtros + ordenação
- Sistema créditos

**Especiais**
- Chat IA Lua
- WhatsApp integration
- Download bulk
- Painel admin

## Estrutura
```
src/
├── components/  # UI reutilizáveis
├── context/     # Estado global
├── pages/       # Dashboards
└── utils/       # Auxiliares
```

## Componentes Core
- ProtectedRoute: Proteção auth
- AuthContext: Estado usuário
- Modais: Add/Delete users
- UI: Button, Header, Loading

## API Endpoints
- /webhook/api/login
- /webhook/api/usuarios
- /webhook/api/criar
- /webhook/api/excluir

## Segurança
- Validação rigorosa
- Tokens seguros
- Proteção CSRF/XSS

## Deploy
- Vercel optimized
- Environment vars
- Bundle optimization