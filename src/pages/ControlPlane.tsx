import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, UserCheck, UserX, Clock, RotateCcw, UserMinus, ChevronLeft, ChevronRight, Search, Filter, ChevronUp, ChevronDown, Download, Plus, X, RefreshCw } from "lucide-react";
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';
import DashboardHeader from "../components/DashboardHeader";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";

interface Usuario {
  id: string;
  agencia?: string;
  login?: string;
  nome: string;
  grupo: string;
  dataRenovacao?: string;
  dataVencimento?: string;
  status: 'ativo' | 'inativo' | 'aguardando';
}

interface VanguardAPIResponse {
  id: number;
  codigo: number;
  empresa: string;
  login: string;
  nome: string;
  cargo: string;
  data_cadastro: string;
  renovacao: string | null;
  status: string;
  vencimento: string | null;
  grupo: string;
}

interface Sistema {
  id: string;
  nome: string;
  descricao: string;
  usuarios: Usuario[];
}

type SortField = 'id' | 'agencia' | 'login' | 'nome' | 'dataRenovacao' | 'dataVencimento' | 'status';
type SortDirection = 'asc' | 'desc';

interface Filtros {
  busca: string;
  grupo: string;
  status: string;
  dataRenovacaoInicial: string;
  dataRenovacaoFinal: string;
  dataVencimentoInicial: string;
  dataVencimentoFinal: string;
}

interface NovoUsuarioForm {
  agencia: string;
  empresa: string;
  grupo: string;
  login: string;
  nome: string;
  cargo: string;
  dataCadastro: string;
  dataRenovacao: string;
  status: string;
  vencimento: string;
}

const ControlPlane: React.FC = () => {
  const { user } = useAuth();
  const [sistemas, setSistemas] = useState<Sistema[]>([]);
  const [sistemaAtualIndex, setSistemaAtualIndex] = useState(0);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState<Usuario[]>([]);
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [loading, setLoading] = useState(false);
  const [lastApiCall, setLastApiCall] = useState<number>(0);
  const [cachedVanguardData, setCachedVanguardData] = useState<Usuario[] | null>(null);
  const [filtros, setFiltros] = useState<Filtros>({
    busca: '',
    grupo: '',
    status: '',
    dataRenovacaoInicial: '',
    dataRenovacaoFinal: '',
    dataVencimentoInicial: '',
    dataVencimentoFinal: ''
  });
  const [modalAberto, setModalAberto] = useState(false);
  const [submittingUser, setSubmittingUser] = useState(false);
  const [agenciasDisponiveis, setAgenciasDisponiveis] = useState<VanguardAPIResponse[]>([]);
  const [cargosDisponiveis, setCargosDisponiveis] = useState<string[]>([]);
  const [novoUsuario, setNovoUsuario] = useState<NovoUsuarioForm>({
    agencia: '',
    empresa: '',
    grupo: '',
    login: '',
    nome: '',
    cargo: '',
    dataCadastro: new Date().toISOString().split('T')[0],
    dataRenovacao: new Date().toISOString().split('T')[0],
    status: 'Ativo',
    vencimento: ''
  });

  // Fetch Vanguard data from API with caching
  const fetchVanguardData = async (forceRefresh = false) => {
    const now = Date.now();
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    // Use cached data if available and not expired, unless force refresh
    if (!forceRefresh && cachedVanguardData && (now - lastApiCall) < CACHE_DURATION) {
      console.log('Using cached Vanguard data');
      return cachedVanguardData;
    }
    
    setLoading(true);
    try {
      console.log('Fetching fresh Vanguard data from API');
      const response = await fetch('https://n8n.sistemavieira.com.br/webhook/api/getall-vanguard', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: VanguardAPIResponse[] = await response.json();
      
      // Set available agencies and positions for the modal
      setAgenciasDisponiveis(data);
      const cargos = [...new Set(data.map(item => item.cargo).filter(Boolean))];
      setCargosDisponiveis(cargos);
      
      // Map API response to our Usuario interface
      const usuarios: Usuario[] = data.map((item) => ({
        id: item.id.toString(),
        agencia: item.codigo.toString(),
        login: item.login,
        nome: item.nome, // Use nome field from API
        grupo: item.grupo, // Map grupo field
        dataRenovacao: item.renovacao || new Date().toISOString().split('T')[0],
        dataVencimento: item.vencimento || new Date().toISOString().split('T')[0],
        status: item.status ? (
          item.status.toLowerCase() === 'ativo' ? 'ativo' : 
          item.status.toLowerCase() === 'inativo' ? 'inativo' : 
          item.status.toLowerCase() === 'aguardando' ? 'aguardando' : 'ativo'
        ) as 'ativo' | 'inativo' | 'aguardando' : 'ativo' // Map status correctly
      }));
      
      // Cache the data
      setCachedVanguardData(usuarios);
      setLastApiCall(now);
      
      return usuarios;
    } catch (error) {
      console.error('Error fetching Vanguard data:', error);
      
      // Return cached data if available, even if expired, as fallback
      if (cachedVanguardData) {
        console.log('API failed, using cached data as fallback');
        return cachedVanguardData;
      }
      
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Load system data
  useEffect(() => {
    const loadData = async () => {
      const vanguardUsers = await fetchVanguardData();

      const sistemas: Sistema[] = [
        {
          id: 'vanguard',
          nome: 'Vanguard',
          descricao: 'Sistema de Controle de Usuários',
          usuarios: vanguardUsers
        }
      ];

      setSistemas(sistemas);
    };

    loadData();
  }, []);

  // Get current system
  const sistemaAtual = sistemas[sistemaAtualIndex];
  const usuarios = sistemaAtual?.usuarios || [];

  // Get status color and text - always respect backend status first
  const getStatusDisplay = (usuario: Usuario) => {
    // First, check if we have a status from the backend and use it
    if (usuario.status) {
      console.log('Usuario status from backend:', usuario.status, 'for user:', usuario.login);
      const backendStatus = usuario.status.toLowerCase();
      if (backendStatus === 'ativo') {
        return {
          status: 'ativo',
          text: 'Ativo',
          color: 'bg-green-100 text-green-800'
        };
      } else if (backendStatus === 'inativo') {
        console.log('Returning inativo status for user:', usuario.login);
        return {
          status: 'inativo',
          text: 'Inativo',
          color: 'bg-red-100 text-red-800'
        };
      } else if (backendStatus === 'aguardando') {
        return {
          status: 'aguardando',
          text: 'Aguardando Renovação',
          color: 'bg-yellow-100 text-yellow-800'
        };
      }
    }
    
    console.log('No backend status found for user:', usuario.login, 'falling back to date logic');
    // Fallback to date-based logic only if no backend status is available
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    // If no vencimento date, default to ativo
    if (!usuario.dataVencimento) {
      return {
        status: 'ativo',
        text: 'Ativo',
        color: 'bg-green-100 text-green-800'
      };
    }
    
    const dataVencimento = new Date(usuario.dataVencimento);
    dataVencimento.setHours(0, 0, 0, 0);
    
    const diffTime = dataVencimento.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Date-based logic as fallback:
    // - Before vencimento date = Ativo
    // - On vencimento date or up to 3 days after = Aguardando Renovação
    // - 4th day after vencimento = Inativo
    
    if (diffDays > 0) {
      // Before vencimento date
      return {
        status: 'ativo',
        text: 'Ativo',
        color: 'bg-green-100 text-green-800'
      };
    } else if (diffDays >= -3) {
      // On vencimento date or up to 3 days after (diffDays = 0, -1, -2, -3)
      return {
        status: 'aguardando',
        text: 'Aguardando Renovação',
        color: 'bg-yellow-100 text-yellow-800'
      };
    } else {
      // 4th day after vencimento or later (diffDays <= -4)
      return {
        status: 'inativo',
        text: 'Inativo',
        color: 'bg-red-100 text-red-800'
      };
    }
  };

  // Apply filters and sorting
  useEffect(() => {
    let filtrados = [...usuarios];

    // Apply search filter
    if (filtros.busca) {
      filtrados = filtrados.filter(usuario => 
        (usuario.login?.toLowerCase().includes(filtros.busca.toLowerCase()) || false) ||
        usuario.nome.toLowerCase().includes(filtros.busca.toLowerCase()) ||
        (usuario.agencia?.toLowerCase().includes(filtros.busca.toLowerCase()) || false)
      );
    }

    // Apply group filter
    if (filtros.grupo) {
      filtrados = filtrados.filter(usuario => usuario.grupo === filtros.grupo);
    }

    // Apply status filter
    if (filtros.status) {
      filtrados = filtrados.filter(usuario => {
        const statusDisplay = getStatusDisplay(usuario);
        return statusDisplay.status === filtros.status;
      });
    }

    // Apply renewal date filter
    if (filtros.dataRenovacaoInicial) {
      filtrados = filtrados.filter(usuario => 
        usuario.dataRenovacao && new Date(usuario.dataRenovacao) >= new Date(filtros.dataRenovacaoInicial)
      );
    }
    if (filtros.dataRenovacaoFinal) {
      filtrados = filtrados.filter(usuario => 
        usuario.dataRenovacao && new Date(usuario.dataRenovacao) <= new Date(filtros.dataRenovacaoFinal)
      );
    }

    // Apply expiration date filter
    if (filtros.dataVencimentoInicial) {
      filtrados = filtrados.filter(usuario => 
        usuario.dataVencimento && new Date(usuario.dataVencimento) >= new Date(filtros.dataVencimentoInicial)
      );
    }
    if (filtros.dataVencimentoFinal) {
      filtrados = filtrados.filter(usuario => 
        usuario.dataVencimento && new Date(usuario.dataVencimento) <= new Date(filtros.dataVencimentoFinal)
      );
    }

    // Apply sorting
    filtrados.sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (sortField) {
        case 'id':
          aValue = parseInt(a.id);
          bValue = parseInt(b.id);
          break;
        case 'dataRenovacao':
        case 'dataVencimento':
          aValue = a[sortField] ? new Date(a[sortField]!) : new Date(0);
          bValue = b[sortField] ? new Date(b[sortField]!) : new Date(0);
          break;
        case 'status':
          aValue = getStatusDisplay(a).status;
          bValue = getStatusDisplay(b).status;
          break;
        default:
          aValue = (a[sortField] || '').toLowerCase();
          bValue = (b[sortField] || '').toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setUsuariosFiltrados(filtrados);
  }, [usuarios, filtros, sortField, sortDirection]);

  // Reset filters when changing systems
  useEffect(() => {
    setFiltros({
      busca: '',
      grupo: '',
      status: '',
      dataRenovacaoInicial: '',
      dataRenovacaoFinal: '',
      dataVencimentoInicial: '',
      dataVencimentoFinal: ''
    });
    setSortField('id');
    setSortDirection('asc');
  }, [sistemaAtualIndex]);

  // Calculate user statistics
  const getEstatisticas = () => {
    const total = usuariosFiltrados.length;
    const ativos = usuariosFiltrados.filter(u => {
      const statusDisplay = getStatusDisplay(u);
      return statusDisplay.status === 'ativo';
    }).length;
    const inativos = usuariosFiltrados.filter(u => {
      const statusDisplay = getStatusDisplay(u);
      return statusDisplay.status === 'inativo';
    }).length;
    const aguardando = usuariosFiltrados.filter(u => {
      const statusDisplay = getStatusDisplay(u);
      return statusDisplay.status === 'aguardando';
    }).length;
    
    return { total, ativos, inativos, aguardando };
  };

  const estatisticas = getEstatisticas();

  // Sorting functions
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp size={16} className="inline ml-1" /> : 
      <ChevronDown size={16} className="inline ml-1" />;
  };

  // Navigation functions
  const navegarAnterior = () => {
    setSistemaAtualIndex((prev) => 
      prev === 0 ? sistemas.length - 1 : prev - 1
    );
  };

  const navegarProximo = () => {
    setSistemaAtualIndex((prev) => 
      prev === sistemas.length - 1 ? 0 : prev + 1
    );
  };

  // Unique key for animations
  const sistemaKey = sistemaAtual?.id || sistemaAtualIndex;

  const formatarData = (data: string) => {
    // If data is null, empty, or results in Invalid Date, use today's date
    if (!data || data.trim() === '') {
      return new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
    
    // Handle ISO timestamp format (e.g., "2025-10-17T00:00:00.000Z")
    if (data.includes('T') && data.includes('Z')) {
      try {
        // Extract just the date part to avoid timezone issues
        const datePart = data.split('T')[0]; // Gets "2025-10-17"
        const [year, month, day] = datePart.split('-');
        
        // Ensure we have valid numbers
        const yearNum = parseInt(year, 10);
        const monthNum = parseInt(month, 10);
        const dayNum = parseInt(day, 10);
        
        // Validate the date components
        if (yearNum && monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
          // Format with zero padding
          const dayStr = dayNum.toString().padStart(2, '0');
          const monthStr = monthNum.toString().padStart(2, '0');
          return `${dayStr}/${monthStr}/${yearNum}`;
        }
      } catch (error) {
        console.warn('Error parsing ISO date:', data, error);
      }
    }
    
    // For dates in YYYY-MM-DD format, avoid timezone issues by parsing manually
    if (data.includes('-') && data.length === 10) {
      const [year, month, day] = data.split('-');
      // Ensure we have valid numbers
      const yearNum = parseInt(year, 10);
      const monthNum = parseInt(month, 10);
      const dayNum = parseInt(day, 10);
      
      // Validate the date components
      if (yearNum && monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
        // Format with zero padding
        const dayStr = dayNum.toString().padStart(2, '0');
        const monthStr = monthNum.toString().padStart(2, '0');
        return `${dayStr}/${monthStr}/${yearNum}`;
      }
    }
    
    // Fallback for other date formats - create date in local timezone
    try {
      // For other formats, try to parse and format
      const date = new Date(data);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
    } catch (error) {
      console.warn('Error parsing date:', data, error);
    }
    
    // Final fallback to today's date
    return new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Handle agency selection in modal
  const handleAgenciaChange = (agenciaCodigo: string) => {
    const agenciaSelecionada = agenciasDisponiveis.find(a => a.codigo.toString() === agenciaCodigo);
    if (agenciaSelecionada) {
      setNovoUsuario(prev => ({
        ...prev,
        agencia: agenciaCodigo,
        empresa: agenciaSelecionada.empresa,
        grupo: agenciaSelecionada.grupo
      }));
    }
  };

  // Calculate expiration date (cadastro + 30 days)
  const calcularVencimento = (dataCadastro: string) => {
    const data = new Date(dataCadastro);
    data.setDate(data.getDate() + 30);
    return data.toISOString().split('T')[0];
  };

  // Handle date change and auto-calculate expiration
  const handleDataCadastroChange = (data: string) => {
    const vencimento = calcularVencimento(data);
    setNovoUsuario(prev => ({
      ...prev,
      dataCadastro: data,
      dataRenovacao: data, // Set renovacao to the same as cadastro
      vencimento: vencimento // Set vencimento to cadastro + 30 days
    }));
  };

  // Convert data to CSV format
  const convertToCSV = (data: Usuario[]) => {
    if (data.length === 0) return '';
    
    // Define CSV headers
    const headers = [
      'ID',
      'Agência', 
      'Login',
      'Empresa',
      'Grupo',
      'Data Renovação',
      'Data Vencimento', 
      'Status'
    ];
    
    // Create CSV rows
    const rows = data.map(usuario => {
      const statusDisplay = getStatusDisplay(usuario);
      return [
        usuario.id,
        usuario.agencia,
        usuario.login,
        usuario.nome, // This contains empresa data
        usuario.grupo,
        formatarData(usuario.dataRenovacao || ''),
        formatarData(usuario.dataVencimento || ''),
        statusDisplay.text
      ];
    });
    
    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(';'))
      .join('\n');
    
    return csvContent;
  };

  // Generate filename with current date and time in UTC format
  const generateFilename = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const period = now.getHours() >= 12 ? 'pm' : 'am';
    
    return `${year}${month}${day}${hours}${minutes}${period}.csv`;
  };

  // Handle manual refresh
  const handleRefresh = async () => {
    const vanguardUsers = await fetchVanguardData(true); // Force refresh

    const sistemas: Sistema[] = [
      {
        id: 'vanguard',
        nome: 'Vanguard',
        descricao: 'Sistema de Controle de Usuários',
        usuarios: vanguardUsers
      }
    ];

    setSistemas(sistemas);
    
    toast.success('Dados atualizados com sucesso!', {
      position: "top-right",
      autoClose: 2000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  };
  const handleDownload = async () => {
    try {
      if (usuariosFiltrados.length === 0) {
        toast.warning('Não há dados para fazer download.', {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        return;
      }
      
      const csvContent = convertToCSV(usuariosFiltrados);
      const filename = generateFilename();
      
      // Create blob with BOM for proper UTF-8 encoding
      const blob = new Blob(['\uFEFF' + csvContent], { 
        type: 'text/csv;charset=utf-8;' 
      });
      
      // Download the file
      saveAs(blob, filename);
      
      // Show success toast notification
      toast.success(`Download realizado com sucesso! ${filename}`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      console.log(`Downloaded ${usuariosFiltrados.length} records as ${filename}`);
    } catch (error) {
      console.error('Error downloading CSV:', error);
      
      // Show error toast notification
      toast.error('Erro ao fazer download do arquivo. Tente novamente.', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  // Open modal (only for Vanguard)
  const handleAbrirModal = () => {
    console.log('handleAbrirModal called');
    console.log('Current system:', sistemaAtual);
    console.log('System ID:', sistemaAtual?.id);
    
    if (sistemaAtual?.id === 'vanguard') {
      console.log('Opening modal for Vanguard');
      const today = new Date().toISOString().split('T')[0];
      const vencimento = calcularVencimento(today);
      setNovoUsuario({
        agencia: '',
        empresa: '',
        grupo: '',
        login: '',
        nome: '',
        cargo: '',
        dataCadastro: today,
        dataRenovacao: today,
        status: 'Ativo',
        vencimento: vencimento
      });
      setModalAberto(true);
      console.log('Modal should be open now');
    } else {
      console.log('Not Vanguard system, modal not opened');
    }
  };

  // Close modal and reset form
  const handleFecharModal = () => {
    setModalAberto(false);
    setSubmittingUser(false);
    setNovoUsuario({
      agencia: '',
      empresa: '',
      grupo: '',
      login: '',
      nome: '',
      cargo: '',
      dataCadastro: new Date().toISOString().split('T')[0],
      dataRenovacao: new Date().toISOString().split('T')[0],
      status: 'Ativo',
      vencimento: ''
    });
  };

  // Submit new user
  const handleSubmitNovoUsuario = async () => {
    if (submittingUser) return; // Prevent double submission
    
    setSubmittingUser(true);
    try {
      console.log('Submitting new user:', novoUsuario);
      
      // Prepare the data payload for the API
      const payload = {
        codigo: parseInt(novoUsuario.agencia),
        empresa: novoUsuario.empresa,
        login: novoUsuario.login,
        nome: novoUsuario.nome,
        cargo: novoUsuario.cargo,
        data_cadastro: novoUsuario.dataCadastro,
        renovacao: novoUsuario.dataRenovacao,
        status: novoUsuario.status,
        vencimento: novoUsuario.vencimento,
        grupo: novoUsuario.grupo
      };
      
      console.log('Sending payload:', payload);
      
      const response = await fetch('https://n8n.sistemavieira.com.br/webhook/api/add-vanguard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('User added successfully:', result);
      
      // Show success toast notification
      toast.success('Usuário adicionado com sucesso!', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      // Close modal and refresh data
      handleFecharModal();
      
      // Refresh the user list by calling fetchVanguardData again with force refresh
      const vanguardUsers = await fetchVanguardData(true);

      const sistemas: Sistema[] = [
        {
          id: 'vanguard',
          nome: 'Vanguard',
          descricao: 'Sistema de Controle de Usuários',
          usuarios: vanguardUsers
        }
      ];

      setSistemas(sistemas);
      
      // Remove the console.log since we now have toast notification
      
    } catch (error) {
      console.error('Error adding user:', error);
      
      // Show error toast notification
      toast.error('Erro ao adicionar usuário. Tente novamente.', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleRenovar = async (usuarioId: string) => {
    try {
      console.log('Renovando usuário:', usuarioId);
      
      const response = await fetch('https://n8n.sistemavieira.com.br/webhook/api/up-vanguard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: usuarioId })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('User renewed successfully:', result);
      
      // Show success toast notifiication
      toast.success('Usuário renovado com sucesso!', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      // Refresh the user list
      const vanguardUsers = await fetchVanguardData(true);

      const sistemas: Sistema[] = [
        {
          id: 'vanguard',
          nome: 'Vanguard',
          descricao: 'Sistema de Controle de Usuários',
          usuarios: vanguardUsers
        }
      ];

      setSistemas(sistemas);
      
    } catch (error) {
      console.error('Error renewing user:', error);
      
      // Show error toast notification
      toast.error('Erro ao renovar usuário. Tente novamente.', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  const handleInativar = async (usuarioId: string) => {
    try {
      console.log('Inativando usuário:', usuarioId);
      
      const response = await fetch('https://n8n.sistemavieira.com.br/webhook/api/del-vanguard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: usuarioId })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('User inactivated successfully:', result);
      
      // Show success toast notification
      toast.success('Usuário inativado com sucesso!', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      // Refresh the user list
      const vanguardUsers = await fetchVanguardData(true);

      const sistemas: Sistema[] = [
        {
          id: 'vanguard',
          nome: 'Vanguard',
          descricao: 'Sistema de Controle de Usuários',
          usuarios: vanguardUsers
        }
      ];

      setSistemas(sistemas);
      
    } catch (error) {
      console.error('Error inactivating user:', error);
      
      // Show error toast notification
      toast.error('Erro ao inativar usuário. Tente novamente.', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <DashboardHeader title="Controle Planejamento" />
      
      <div className="flex-1 px-28 py-6">
        <div className="max-w-full mx-auto space-y-6">
          
          {/* Vanguard Card */}
          <motion.div 
            key={`card-${sistemaKey}`}
            className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users size={24} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-neutral-900">{sistemaAtual?.nome || 'Carregando...'}</h2>
                  <p className="text-neutral-600">{sistemaAtual?.descricao || 'Carregando sistema...'}</p>
                </div>
              </div>
              
              {/* Navigation Controls */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={navegarAnterior}
                  disabled={sistemas.length === 0}
                  className="p-2 rounded-lg border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Sistema anterior"
                >
                  <ChevronLeft size={20} className="text-neutral-600" />
                </button>
                
                <div className="px-3 py-1 bg-neutral-100 rounded-lg">
                  <span className="text-sm font-medium text-neutral-700">
                    {sistemaAtualIndex + 1} de {sistemas.length}
                  </span>
                </div>
                
                <button
                  onClick={navegarProximo}
                  disabled={sistemas.length === 0}
                  className="p-2 rounded-lg border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Próximo sistema"
                >
                  <ChevronRight size={20} className="text-neutral-600" />
                </button>
              </div>
            </div>

            {/* Statistics Cards */}
            <motion.div 
              key={`stats-${sistemaKey}`}
              className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1, ease: "easeInOut" }}
            >
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total</p>
                    <p className="text-2xl font-bold text-blue-900">{estatisticas.total}</p>
                  </div>
                  <Users size={20} className="text-blue-500" />
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Ativos</p>
                    <p className="text-2xl font-bold text-green-900">{estatisticas.ativos}</p>
                  </div>
                  <UserCheck size={20} className="text-green-500" />
                </div>
              </div>
              
              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-600">Inativos</p>
                    <p className="text-2xl font-bold text-red-900">{estatisticas.inativos}</p>
                  </div>
                  <UserX size={20} className="text-red-500" />
                </div>
              </div>
              
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-600">Aguardando</p>
                    <p className="text-2xl font-bold text-yellow-900">{estatisticas.aguardando}</p>
                  </div>
                  <Clock size={20} className="text-yellow-500" />
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Users Table */}
          <motion.div 
            key={`table-${sistemaKey}`}
            className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeInOut" }}
          >
            <motion.div 
              key={`table-header-${sistemaKey}`}
              className="px-6 py-4 border-b border-neutral-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                Usuários Cadastrados - {sistemaAtual?.nome}
              </h3>
              
              {/* Filters Section */}
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
                      <input
                        type="text"
                        placeholder="Buscar por login, nome ou agência..."
                        value={filtros.busca}
                        onChange={(e) => setFiltros({...filtros, busca: e.target.value})}
                        className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  {/* Group Filter */}
                  <div className="w-full lg:w-48">
                    <select
                      value={filtros.grupo}
                      onChange={(e) => setFiltros({...filtros, grupo: e.target.value})}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Todos os Grupos</option>
                      {[...new Set(usuarios.map(u => u.grupo).filter(Boolean))].sort().map(grupo => (
                        <option key={grupo} value={grupo}>{grupo}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Status Filter */}
                  <div className="w-full lg:w-48">
                    <select
                      value={filtros.status}
                      onChange={(e) => setFiltros({...filtros, status: e.target.value})}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Todos os Status</option>
                      <option value="ativo">Ativo</option>
                      <option value="inativo">Inativo</option>
                      <option value="aguardando">Aguardando Renovação</option>
                    </select>
                  </div>
                </div>
                
                {/* Date Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">
                      Data Renovação - De:
                    </label>
                    <input
                      type="date"
                      value={filtros.dataRenovacaoInicial}
                      onChange={(e) => setFiltros({...filtros, dataRenovacaoInicial: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">
                      Data Renovação - Até:
                    </label>
                    <input
                      type="date"
                      value={filtros.dataRenovacaoFinal}
                      onChange={(e) => setFiltros({...filtros, dataRenovacaoFinal: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">
                      Data Vencimento - De:
                    </label>
                    <input
                      type="date"
                      value={filtros.dataVencimentoInicial}
                      onChange={(e) => setFiltros({...filtros, dataVencimentoInicial: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 mb-1">
                      Data Vencimento - Até:
                    </label>
                    <input
                      type="date"
                      value={filtros.dataVencimentoFinal}
                      onChange={(e) => setFiltros({...filtros, dataVencimentoFinal: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                {/* Results Counter and Action Buttons */}
                <div className="flex items-center justify-between text-sm text-neutral-600">
                  <div className="flex items-center space-x-4">
                    <span>
                      Mostrando {usuariosFiltrados.length} de {usuarios.length} usuários
                    </span>
                    {/* Cache status indicator */}
                    {cachedVanguardData && sistemaAtual?.id === 'vanguard' && (
                      <span className="text-xs text-neutral-400">
                        Cache: {Math.round((Date.now() - lastApiCall) / 1000 / 60)}min atrás
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    {/* Refresh Button */}
                    <Button
                      onClick={handleRefresh}
                      variant="secondary"
                      icon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />}
                      className="text-sm px-3 py-2"
                      disabled={loading}
                    >
                      Atualizar
                    </Button>
                    
                    {/* Download Button */}
                    <Button
                      onClick={handleDownload}
                      variant="secondary"
                      icon={<Download size={16} />}
                      className="text-sm px-3 py-2"
                    >
                      Download
                    </Button>
                    
                    {/* Add Button (only for Vanguard and hierarchy != 3) */}
                    {sistemaAtual?.id === 'vanguard' && user?.hierarquia !== 3 && (
                      <Button
                        onClick={() => {
                          console.log('Add button clicked!');
                          console.log('Current modal state:', modalAberto);
                          console.log('Current system:', sistemaAtual);
                          handleAbrirModal();
                        }}
                        variant="primary"
                        icon={<Plus size={16} />}
                        className="text-sm px-3 py-2"
                      >
                        Adicionar
                      </Button>
                    )}
                    
                    {(filtros.busca || filtros.grupo || filtros.status || filtros.dataRenovacaoInicial || filtros.dataRenovacaoFinal || filtros.dataVencimentoInicial || filtros.dataVencimentoFinal) && (
                      <button
                        onClick={() => setFiltros({
                          busca: '',
                          grupo: '',
                          status: '',
                          dataRenovacaoInicial: '',
                          dataRenovacaoFinal: '',
                          dataVencimentoInicial: '',
                          dataVencimentoFinal: ''
                        })}
                        className="text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Limpar filtros
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              key={`table-content-${sistemaKey}`}
              className="overflow-x-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              <table className="w-full">
                <thead className="bg-neutral-50">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 transition-colors"
                      onClick={() => handleSort('id')}
                    >
                      ID {getSortIcon('id')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 transition-colors"
                      onClick={() => handleSort('agencia')}
                    >
                      Agência {getSortIcon('agencia')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 transition-colors"
                      onClick={() => handleSort('login')}
                    >
                      Login {getSortIcon('login')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 transition-colors"
                      onClick={() => handleSort('nome')}
                    >
                      Empresa {getSortIcon('nome')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Grupo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 transition-colors"
                      onClick={() => handleSort('dataRenovacao')}
                    >
                      Data Renovação {getSortIcon('dataRenovacao')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 transition-colors"
                      onClick={() => handleSort('dataVencimento')}
                    >
                      Data Vencimento {getSortIcon('dataVencimento')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100 transition-colors"
                      onClick={() => handleSort('status')}
                    >
                      Status {getSortIcon('status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <motion.tbody 
                  key={`tbody-${sistemaKey}`}
                  className="bg-white divide-y divide-neutral-200"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.5 }}
                >
                  {usuariosFiltrados.map((usuario) => {
                    const statusDisplay = getStatusDisplay(usuario);
                    return (
                      <motion.tr 
                        key={`${sistemaKey}-${usuario.id}`}
                        className="hover:bg-neutral-50"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ 
                          duration: 0.3, 
                          delay: 0.6 + (parseInt(usuario.id) * 0.05),
                          ease: "easeOut"
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                          {usuario.id}
                        </td>
                        {sistemaAtual?.id === 'vanguard' ? (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                              {usuario.agencia}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                              {usuario.login}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                              {usuario.nome}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                              {usuario.grupo}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                              {formatarData(usuario.dataRenovacao || '')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                              {formatarData(usuario.dataVencimento || '')}
                            </td>
                          </>
                        ) : null}

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusDisplay.color}`}>
                            {statusDisplay.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {sistemaAtual?.id === 'vanguard' ? (
                            user?.hierarquia === 3 ? (
                              <span className="text-neutral-400 text-xs italic">
                                Acesso restrito
                              </span>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <Button
                                  onClick={() => handleRenovar(usuario.id)}
                                  variant="primary"
                                  icon={<RotateCcw size={14} />}
                                  className="text-xs px-2 py-1"
                                >
                                  Renovar
                                </Button>
                                <Button
                                  onClick={() => handleInativar(usuario.id)}
                                  variant="secondary"
                                  icon={<UserMinus size={14} />}
                                  className="text-xs px-2 py-1 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                                >
                                  Inativar
                                </Button>
                              </div>
                            )
                          ) : (
                            <span className="text-neutral-400 text-xs italic">
                              Sem ações disponíveis
                            </span>
                          )}
                        </td>

                      </motion.tr>
                    );
                  })}
                </motion.tbody>
              </table>
            </motion.div>

            {usuariosFiltrados.length === 0 && usuarios.length > 0 && (
              <motion.div 
                key={`no-results-${sistemaKey}`}
                className="text-center py-12"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <Filter size={48} className="mx-auto text-neutral-400 mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 mb-2">Nenhum resultado encontrado</h3>
                <p className="text-neutral-500">Tente ajustar os filtros para encontrar usuários.</p>
              </motion.div>
            )}
            
            {usuarios.length === 0 && (
              <motion.div 
                key={`empty-${sistemaKey}`}
                className="text-center py-12"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <Users size={48} className="mx-auto text-neutral-400 mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 mb-2">Nenhum usuário encontrado</h3>
                <p className="text-neutral-500">Os usuários cadastrados aparecerão aqui.</p>
              </motion.div>
            )}

          </motion.div>
        </div>
      </div>

      {/* Modal for Adding New User */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-neutral-900">Adicionar Novo Usuário</h2>
                <button
                  onClick={handleFecharModal}
                  className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-neutral-500" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Agency Select */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Agência *
                  </label>
                  <select
                    value={novoUsuario.agencia}
                    onChange={(e) => handleAgenciaChange(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  >
                    <option value="">Selecione uma agência</option>
                    {[...new Set(agenciasDisponiveis.map(a => a.codigo))].map(codigo => {
                      const agencia = agenciasDisponiveis.find(a => a.codigo === codigo);
                      return (
                        <option key={codigo} value={codigo}>
                          {codigo} - {agencia?.empresa}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Company and Group Labels */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Empresa
                    </label>
                    <div className="px-3 py-2 bg-neutral-100 border border-neutral-300 rounded-lg text-neutral-600">
                      {novoUsuario.empresa || 'Selecione uma agência'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Grupo
                    </label>
                    <div className="px-3 py-2 bg-neutral-100 border border-neutral-300 rounded-lg text-neutral-600">
                      {novoUsuario.grupo || 'Selecione uma agência'}
                    </div>
                  </div>
                </div>

                {/* Login and Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Login *
                    </label>
                    <input
                      type="text"
                      value={novoUsuario.login}
                      onChange={(e) => setNovoUsuario(prev => ({ ...prev, login: e.target.value }))}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Digite o login"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Nome *
                    </label>
                    <input
                      type="text"
                      value={novoUsuario.nome}
                      onChange={(e) => setNovoUsuario(prev => ({ ...prev, nome: e.target.value }))}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Digite o nome"
                      required
                    />
                  </div>
                </div>

                {/* Position Select */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Cargo *
                  </label>
                  <select
                    value={novoUsuario.cargo}
                    onChange={(e) => setNovoUsuario(prev => ({ ...prev, cargo: e.target.value }))}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  >
                    <option value="">Selecione um cargo</option>
                    {cargosDisponiveis.map(cargo => (
                      <option key={cargo} value={cargo}>
                        {cargo}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Registration Date */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Data Cadastro *
                  </label>
                  <input
                    type="date"
                    value={novoUsuario.dataCadastro}
                    onChange={(e) => handleDataCadastroChange(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Renewal Date, Status, and Expiration */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Data Renovação
                    </label>
                    <div className="px-3 py-2 bg-neutral-100 border border-neutral-300 rounded-lg text-neutral-600">
                      {novoUsuario.dataRenovacao ? novoUsuario.dataRenovacao.split('-').reverse().join('/') : '--'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Status
                    </label>
                    <div className="px-3 py-2 bg-green-100 border border-green-300 rounded-lg text-green-800 font-medium">
                      {novoUsuario.status}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Data Vencimento
                    </label>
                    <div className="px-3 py-2 bg-neutral-100 border border-neutral-300 rounded-lg text-neutral-600">
                      {novoUsuario.vencimento ? novoUsuario.vencimento.split('-').reverse().join('/') : '--'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-neutral-200">
                <Button
                  onClick={handleFecharModal}
                  variant="secondary"
                  className="px-4 py-2"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmitNovoUsuario}
                  variant="primary"
                  className="px-4 py-2"
                  disabled={!novoUsuario.agencia || !novoUsuario.login || !novoUsuario.nome || !novoUsuario.cargo || submittingUser}
                >
                  {submittingUser ? 'Adicionando...' : 'Adicionar Usuário'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ControlPlane;