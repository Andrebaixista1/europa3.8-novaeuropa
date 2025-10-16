// Configuração centralizada da API
export const API_BASE = import.meta.env.DEV
  ? 'https://webhook.sistemavieira.com.br'
  : ''; // Em produção usa paths relativos com proxy do Vercel

// Para uso em desenvolvimento local com proxy
export const API_LOCAL = import.meta.env.DEV
  ? ''  // Usa o proxy do Vite
  : '';

// Endpoints da API
export const API_ENDPOINTS = {
  LOGIN: '/webhook/api/login',
  SALDO: '/webhook/api/saldo',
  USUARIOS: '/webhook/api/usuarios',
  CREDITOS: '/webhook/api/creditos',
  LOTES: '/webhook/api/lotes',
  LOG_LOTES: '/webhook/api/log_lotes',
  RESPOSTA: '/webhook/api/resposta',
  ALTERAR: '/webhook/api/alterar',
  CONSULTA_FGTS_ONLINE: '/api/consulta-fgts-online',
  CONSULTA_FGTS_OFFLINE: '/api/consulta-fgts-offline',
  MACICA_ONLINE: '/api/macica-online',
  LUA_IA: '/webhook/api/lua-ia',
  // Adicionar outros endpoints específicos
  GETALL_VANGUARD: '/webhook/api/getall-vanguard',
  ADD_VANGUARD: '/webhook/api/add-vanguard',
  FILTROS_SALVOS: '/webhook/api/filtros-salvos',
  FILTRAR: '/webhook/api/filtrar',
  CONEXOES: '/webhook/api/conexoes',
  EXCLUIR_CONEXOES: '/webhook/api/excluir-conexoes'
} as const;

// Função para construir URL completa
export const buildApiUrl = (endpoint: string, useLocal = false): string => {
  const base = useLocal ? API_LOCAL : API_BASE;
  return `${base}${endpoint}`;
};

// Função para fazer fetch com configuração automática
export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const url = buildApiUrl(endpoint);
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  return fetch(url, {
    ...options,
    headers: defaultHeaders
  });
};