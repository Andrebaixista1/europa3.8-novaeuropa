import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  FileText,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";
import DashboardHeader from "../components/DashboardHeader";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";

interface Chamado {
  id: string;
  titulo: string;
  descricao: string;
  status: 'aberto' | 'em_andamento' | 'aguardando' | 'concluido' | 'cancelado';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  categoria: 'suporte' | 'duvida' | 'pagamento' | 'recurso' | 'outro';
  solicitante: string;
  solicitanteId?: string; // adicionada para controle de permissão
  responsavel?: string;
  dataAbertura: string;
  dataAtualizacao: string;
  comentarios: Comentario[];
}

interface Comentario {
  id: string;
  autor: string;
  texto: string;
  data: string;
}

// Interface para dados da API
interface ChamadoAPI {
  id?: number;
  titulo?: string;
  descricao?: string;
  status?: string;
  prioridade?: string;
  categoria?: string;
  solicitante?: string;
  responsavel?: string;
  data_abertura?: string;
  data_atualizacao?: string;
  comentarios?: Comentario[];
  solicitante_id?: number; // adicionada para controle de permissão
}

const ChamadosPlane: React.FC = () => {
  const { user } = useAuth();
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [chamadosFiltrados, setChamadosFiltrados] = useState<Chamado[]>([]);
  const [showNovoChamado, setShowNovoChamado] = useState(false);
  const [chamadoSelecionado, setChamadoSelecionado] = useState<Chamado | null>(null);
  const [editChamadoId, setEditChamadoId] = useState<string | null>(null);
  const [filtros, setFiltros] = useState({
    status: '',
    prioridade: '',
    categoria: '',
    busca: ''
  });

  // Estados para o formulário de novo chamado
  const [formData, setFormData] = useState({
    titulo: '',
    solicitante: '',
    responsavel: '',
    descricao: '',
    categoria: '',
    tipoSolicitacao: '',
    cargo: '',
    empresa: '',
    ferramentas: [] as string[],
    nomeUsuario: '',
    cpf: '',
    supervisor: '',
    arquivo: null as File | null,
    empresaEstrategia: '',
    empresaOutros: '',
    idadeMin: '',
    idadeMax: '',
    perfilCliente: [] as string[],
    canal: [] as string[],
    numeroSMS: '',
    preferenciaDDB: '',
    dataInicialDDB: '',
    dataFinalDDB: '',
    rendaMin: '',
    rendaMax: '',
    produto: [] as string[],
    banco: [] as string[],
    bancoMargemCartao: [] as string[],
    margemMin: '',
    margemMax: '',
    quantidade: '',
    faixaTaxa: '',
    prazoMin: '',
    prazoMax: '',
    parcelaMin: '',
    parcelaMax: '',
    especieInput: '',
    especies: [] as string[],
    estados: [] as string[],
  });

  // Verificar se o usuário tem permissão para editar/excluir (hierarquia === 1)
  const canEditDelete = user?.hierarquia === 1;

  // Dados mockados para demonstração
  useEffect(() => {
    const mockChamados: Chamado[] = [
      {
        id: '1',
        titulo: 'Sistema fora do ar - não consigo acessar',
        descricao: 'Estou tentando acessar o sistema mas aparece erro 500. Preciso urgentemente para finalizar um relatório.',
        status: 'aberto',
        prioridade: 'urgente',
        categoria: 'suporte',
        solicitante: 'João Silva',
        dataAbertura: '2025-01-20T10:30:00',
        dataAtualizacao: '2025-01-20T10:30:00',
        comentarios: []
      },
      {
        id: '2',
        titulo: 'Dúvida sobre funcionalidade de relatórios',
        descricao: 'Como faço para exportar os relatórios em PDF? Não encontrei essa opção no menu.',
        status: 'em_andamento',
        prioridade: 'media',
        categoria: 'duvida',
        solicitante: 'Maria Santos',
        responsavel: 'Ana Costa',
        dataAbertura: '2025-01-19T14:15:00',
        dataAtualizacao: '2025-01-20T09:45:00',
        comentarios: [
          {
            id: '1',
            autor: 'Ana Costa',
            texto: 'Vou verificar e te retorno em breve.',
            data: '2025-01-19T15:00:00'
          }
        ]
      },
      {
        id: '3',
        titulo: 'Problema com login - senha não aceita',
        descricao: 'Minha senha não está sendo aceita. Já tentei resetar mas não recebi o email.',
        status: 'aguardando',
        prioridade: 'alta',
        categoria: 'suporte',
        solicitante: 'Pedro Oliveira',
        responsavel: 'Carlos Lima',
        dataAbertura: '2025-01-18T16:20:00',
        dataAtualizacao: '2025-01-19T11:30:00',
        comentarios: [
          {
            id: '2',
            autor: 'Carlos Lima',
            texto: 'Verifiquei o problema. Enviei um novo email de reset.',
            data: '2025-01-19T11:30:00'
          }
        ]
      },
      {
        id: '4',
        titulo: 'Solicitação de nova funcionalidade',
        descricao: 'Gostaria de sugerir a implementação de um sistema de notificações push para alertas importantes.',
        status: 'concluido',
        prioridade: 'baixa',
        categoria: 'recurso',
        solicitante: 'Lucia Ferreira',
        responsavel: 'Ana Costa',
        dataAbertura: '2025-01-15T09:00:00',
        dataAtualizacao: '2025-01-18T17:00:00',
        comentarios: [
          {
            id: '3',
            autor: 'Ana Costa',
            texto: 'Funcionalidade implementada com sucesso!',
            data: '2025-01-18T17:00:00'
          }
        ]
      }
    ];
    setChamados(mockChamados);
    setChamadosFiltrados(mockChamados);
  }, []);

  // Função para buscar chamados da API
  const buscarChamadosDaAPI = async () => {
    try {
      const response = await fetch('https://n8n.sistemavieira.com.br/webhook/api/chamados', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data: ChamadoAPI[] = await response.json();
        
        // Mapear os dados da API para o formato local
        const chamadosAPI = data.map((item: ChamadoAPI) => ({
          id: item.id?.toString() || Math.random().toString(),
          titulo: item.titulo || 'Sem título',
          descricao: item.descricao || 'Sem descrição',
          status: (item.status as 'aberto' | 'em_andamento' | 'aguardando' | 'concluido' | 'cancelado') || 'aberto',
          prioridade: (item.prioridade as 'baixa' | 'media' | 'alta' | 'urgente') || 'media',
          categoria: (item.categoria as 'suporte' | 'duvida' | 'pagamento' | 'recurso' | 'outro') || 'suporte',
          solicitante: item.solicitante || 'Solicitante não informado',
          solicitanteId: (item as any).solicitante_id ? String((item as any).solicitante_id) : undefined,
          responsavel: item.responsavel || undefined,
          dataAbertura: item.data_abertura || new Date().toISOString(),
          dataAtualizacao: item.data_atualizacao || new Date().toISOString(),
          comentarios: item.comentarios || []
        }));

        setChamados(chamadosAPI);
        setChamadosFiltrados(chamadosAPI);
      } else {
        console.error('Erro ao buscar chamados da API:', response.status);
        // Em caso de erro, mantém os dados mockados
      }
    } catch (error) {
      console.error('Erro ao conectar com a API:', error);
      // Em caso de erro, mantém os dados mockados
    }
  };

  // Carregar chamados da API quando a página carregar
  useEffect(() => {
    buscarChamadosDaAPI();
  }, []);

  // Atualizar tempo em aberto em tempo real (a cada segundo)
  useEffect(() => {
    const interval = setInterval(() => {
      // Força re-render para atualizar o tempo em aberto
      setChamadosFiltrados([...chamadosFiltrados]);
    }, 1000);

    return () => clearInterval(interval);
  }, [chamadosFiltrados]);

  // Aplicar filtros
  useEffect(() => {
    let filtrados = chamados;
    
    if (filtros.status) {
      filtrados = filtrados.filter(c => c.status === filtros.status);
    }
    if (filtros.prioridade) {
      filtrados = filtrados.filter(c => c.prioridade === filtros.prioridade);
    }
    if (filtros.categoria) {
      filtrados = filtrados.filter(c => c.categoria === filtros.categoria);
    }
    if (filtros.busca) {
      filtrados = filtrados.filter(c => 
        c.titulo.toLowerCase().includes(filtros.busca.toLowerCase()) ||
        c.descricao.toLowerCase().includes(filtros.busca.toLowerCase()) ||
        c.solicitante.toLowerCase().includes(filtros.busca.toLowerCase())
      );
    }
    
    // Ordena por dataAbertura do mais recente para o mais antigo
    const ordenados = [...filtrados].sort((a, b) => (
      new Date(b.dataAbertura).getTime() - new Date(a.dataAbertura).getTime()
    ));
    
    setChamadosFiltrados(ordenados);
  }, [chamados, filtros]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberto': return 'bg-blue-100 text-blue-800';
             case 'em_andamento': return 'bg-yellow-100 text-yellow-800';
      case 'aguardando': return 'bg-orange-100 text-orange-800';
      case 'concluido': return 'bg-green-100 text-green-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'baixa': return 'bg-green-100 text-green-800';
      case 'media': return 'bg-yellow-100 text-yellow-800';
      case 'alta': return 'bg-orange-100 text-orange-800';
      case 'urgente': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aberto': return <AlertCircle size={16} />;
             case 'em_andamento': return <Clock size={16} />;
      case 'aguardando': return <MessageSquare size={16} />;
      case 'concluido': return <CheckCircle size={16} />;
      case 'cancelado': return <XCircle size={16} />;
      default: return <FileText size={16} />;
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Função para calcular tempo em aberto
  const calcularTempoEmAberto = (
    dataAbertura: string,
    status: 'aberto' | 'em_andamento' | 'aguardando' | 'concluido' | 'cancelado',
    dataFim?: string
  ) => {
    const abertura = new Date(dataAbertura);
    const fim = status === 'concluido' && dataFim ? new Date(dataFim) : new Date();
    const diffMs = fim.getTime() - abertura.getTime();
    
    const diffSegundos = Math.floor(diffMs / 1000);
    const diffMinutos = Math.floor(diffSegundos / 60);
    const diffHoras = Math.floor(diffMinutos / 60);
    const diffDias = Math.floor(diffHoras / 24);
    
    if (diffDias > 0) {
      return `${diffDias}d ${diffHoras % 24}h`;
    } else if (diffHoras > 0) {
      return `${diffHoras}h ${diffMinutos % 60}m`;
    } else if (diffMinutos > 0) {
      return `${diffMinutos}m`;
    } else {
      return `${diffSegundos}s`;
    }
  };

  // Funções de formatação para máscaras
  const formatarMoeda = (valor: string) => {
    if (!valor) return '';
    // Remove tudo que não é número
    const numeros = valor.replace(/\D/g, '');
    if (numeros === '') return '';
    // Converte para centavos
    const centavos = parseInt(numeros);
    // Formata para R$ 0,00
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(centavos / 100);
  };

  const formatarTaxa = (valor: string) => {
    if (!valor) return '';
    // Remove tudo que não é número ou vírgula
    const numeros = valor.replace(/[^\d,]/g, '');
    if (numeros === '') return '';
    
    // Evita números muito grandes que causam notação científica
    if (numeros.length > 10) return valor;
    
    // Substitui vírgula por ponto para cálculos
    const numero = numeros.replace(',', '.');
    const valorFloat = parseFloat(numero);
    
    // Verifica se é um número válido e não muito grande
    if (isNaN(valorFloat) || valorFloat > 999999) return valor;
    
    // Formata para x,xx%
    const valorFormatado = valorFloat.toFixed(2).replace('.', ',');
    return `${valorFormatado}%`;
  };

  const formatarCPF = (valor: string) => {
    if (!valor) return '';
    // Remove tudo que não é número
    const numeros = valor.replace(/\D/g, '');
    // Aplica máscara xxx.xxx.xxx-xx
    if (numeros.length <= 3) return numeros;
    if (numeros.length <= 6) return `${numeros.slice(0, 3)}.${numeros.slice(3)}`;
    if (numeros.length <= 9) return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6)}`;
    return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9, 11)}`;
  };

  const parseMoedaParaNumero = (valor: string) => {
    // Remove R$ e espaços, substitui vírgula por ponto
    const limpo = valor.replace(/[R$\s]/g, '').replace('.', '').replace(',', '.');
    return limpo || '';
  };

  const parseTaxaParaNumero = (valor: string) => {
    // Remove % e substitui vírgula por ponto
    const limpo = valor.replace('%', '').replace(',', '.');
    return limpo || '';
  };

  const parseCPFParaNumero = (valor: string) => {
    // Remove pontos e hífen
    return valor.replace(/[.-]/g, '');
  };

  const getEstatisticas = () => {
    const total = chamados.length;
    const emAndamento = chamados.filter(c => c.status === 'em_andamento').length;
    const concluidos = chamados.filter(c => c.status === 'concluido').length;
    const urgentes = chamados.filter(c => c.prioridade === 'urgente').length;

    return { total, emAndamento, concluidos, urgentes };
  };

  const estatisticas = getEstatisticas();

  // Utilitário de permissão por linha
  const canUserViewChamado = (chamado: Chamado, currentUser: any): boolean => {
    if (currentUser?.hierarquia === 1) return true;
    const solicitanteId = (chamado.solicitanteId ?? (chamado as any).solicitante_id);
    const a = String(solicitanteId ?? '').trim();
    const b = String(currentUser?.id ?? '').trim();
    if (!a || !b) return false;
    if (a === b) return true;
    const an = parseInt(a, 10);
    const bn = parseInt(b, 10);
    if (!Number.isNaN(an) && !Number.isNaN(bn)) return an === bn;
    return false;
  };

  // Abre modal de Visualizar (respeitando permissão)
  const handleViewChamado = (chamado: Chamado) => {
    if (!canUserViewChamado(chamado, user)) return;
    setChamadoSelecionado(chamado);
  };

  // Enviar novo chamado para o backend
  const handleCriarChamado = async (e: React.FormEvent) => {
    e.preventDefault();

    const basePayload: any = {
      titulo: formData.titulo?.trim(),
      solicitante: formData.solicitante?.trim() || user?.nome || user?.name || '',
      responsavel: formData.responsavel || null,
      descricao: formData.descricao?.trim() || '',
      categoria: formData.categoria,
      status: 'aberto',
      solicitante_id: user?.id,
    };

    // Campos por categoria
    if (formData.categoria === 'logins-ferramentas') {
      Object.assign(basePayload, {
        tipo_solicitacao: formData.tipoSolicitacao || null,
        cargo: formData.cargo || null,
        empresa_login: formData.empresa || null,
        ferramentas: formData.ferramentas?.length ? formData.ferramentas : null,
        nome_usuario: formData.nomeUsuario || null,
        cpf: formData.cpf ? formatarCPF(formData.cpf) : null,
        supervisor: formData.supervisor || null,
      });
    } else if (formData.categoria === 'estrategias') {
      Object.assign(basePayload, {
        empresa_estrategia: formData.empresaEstrategia || null,
        empresa_outros: formData.empresaOutros || null,
        idade_min: formData.idadeMin ? Number(formData.idadeMin) : null,
        idade_max: formData.idadeMax ? Number(formData.idadeMax) : null,
        perfil_cliente: formData.perfilCliente?.length ? formData.perfilCliente : null,
        canal: formData.canal?.length ? formData.canal : null,
        numero_sms: formData.numeroSMS || null,
        preferencia_ddb: formData.preferenciaDDB || null,
        data_inicial_ddb: formData.dataInicialDDB || null,
        data_final_ddb: formData.dataFinalDDB || null,
        renda_min: formData.rendaMin ? parseMoedaParaNumero(formatarMoeda(formData.rendaMin)) : null,
        renda_max: formData.rendaMax ? parseMoedaParaNumero(formatarMoeda(formData.rendaMax)) : null,
        produto: formData.produto?.length ? formData.produto : null,
        banco: formData.banco?.length ? formData.banco : null,
        banco_margem_cartao: formData.bancoMargemCartao?.length ? formData.bancoMargemCartao : null,
        margem_min: formData.margemMin ? parseMoedaParaNumero(formatarMoeda(formData.margemMin)) : null,
        margem_max: formData.margemMax ? parseMoedaParaNumero(formatarMoeda(formData.margemMax)) : null,
        quantidade: formData.quantidade ? Number(formData.quantidade) : null,
        faixa_taxa: formData.faixaTaxa ? formData.faixaTaxa.replace('%','').replace(',','.') : null,
        prazo_min: formData.prazoMin ? Number(formData.prazoMin) : null,
        prazo_max: formData.prazoMax ? Number(formData.prazoMax) : null,
        parcela_min: formData.parcelaMin ? parseMoedaParaNumero(formatarMoeda(formData.parcelaMin)) : null,
        parcela_max: formData.parcelaMax ? parseMoedaParaNumero(formatarMoeda(formData.parcelaMax)) : null,
        especies: formData.especies?.length ? formData.especies : null,
        estados: formData.estados?.length ? formData.estados : null,
      });
    }

    try {
      const resp = await fetch('https://n8n.sistemavieira.com.br/webhook/api/cria-chamado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(basePayload),
      });

      if (!resp.ok) {
        console.error('Falha ao criar chamado', await resp.text());
        return;
      }

      // Sucesso: fechar modal, limpar e recarregar lista
      setShowNovoChamado(false);
      setFormData({
        titulo: '', solicitante: '', descricao: '', categoria: '', tipoSolicitacao: '', cargo: '', empresa: '', ferramentas: [], nomeUsuario: '', cpf: '', supervisor: '', arquivo: null,
        empresaEstrategia: '', empresaOutros: '', idadeMin: '', idadeMax: '', perfilCliente: [], canal: [], numeroSMS: '', preferenciaDDB: '', dataInicialDDB: '', dataFinalDDB: '', rendaMin: '', rendaMax: '', produto: [], banco: [], bancoMargemCartao: [], margemMin: '', margemMax: '', quantidade: '', faixaTaxa: '', prazoMin: '', prazoMax: '', parcelaMin: '', parcelaMax: '', especieInput: '', especies: [], estados: []
      });
      await buscarChamadosDaAPI();
    } catch (err) {
      console.error('Erro ao enviar chamado:', err);
    }
  };

  const openCreateModal = () => {
    setEditChamadoId(null);
    setShowNovoChamado(true);
  };

  const handleOpenEdit = (chamado: Chamado) => {
    setEditChamadoId(chamado.id);
    // Prefill formData a partir do chamado
    setFormData({
      titulo: chamado.titulo || '',
      solicitante: chamado.solicitante || '',
      responsavel: chamado.responsavel || '',
      descricao: chamado.descricao || '',
      categoria: chamado.categoria || '',
      // Logins e Ferramentas
      tipoSolicitacao: (chamado as any).tipoSolicitacao || (chamado as any).tipo_solicitacao || '',
      cargo: (chamado as any).cargo || '',
      empresa: (chamado as any).empresa || (chamado as any).empresa_login || '',
      ferramentas: (chamado as any).ferramentas || [],
      nomeUsuario: (chamado as any).nomeUsuario || (chamado as any).nome_usuario || '',
      cpf: (chamado as any).cpf ? parseCPFParaNumero((chamado as any).cpf) : '',
      supervisor: (chamado as any).supervisor || '',
      arquivo: null,
      // Estratégias
      empresaEstrategia: (chamado as any).empresaEstrategia || (chamado as any).empresa_estrategia || '',
      empresaOutros: (chamado as any).empresaOutros || (chamado as any).empresa_outros || '',
      idadeMin: (chamado as any).idadeMin?.toString() || (chamado as any).idade_min?.toString() || '',
      idadeMax: (chamado as any).idadeMax?.toString() || (chamado as any).idade_max?.toString() || '',
      perfilCliente: (chamado as any).perfilCliente || (chamado as any).perfil_cliente || [],
      canal: (chamado as any).canal || [],
      numeroSMS: (chamado as any).numeroSMS || (chamado as any).numero_sms || '',
      preferenciaDDB: (chamado as any).preferenciaDDB || (chamado as any).preferencia_ddb || '',
      dataInicialDDB: (chamado as any).dataInicialDDB || (chamado as any).data_inicial_ddb || '',
      dataFinalDDB: (chamado as any).dataFinalDDB || (chamado as any).data_final_ddb || '',
      rendaMin: (chamado as any).rendaMin || (chamado as any).renda_min || '',
      rendaMax: (chamado as any).rendaMax || (chamado as any).renda_max || '',
      produto: (chamado as any).produto || [],
      banco: (chamado as any).banco || [],
      bancoMargemCartao: (chamado as any).bancoMargemCartao || (chamado as any).banco_margem_cartao || [],
      margemMin: (chamado as any).margemMin || (chamado as any).margem_min || '',
      margemMax: (chamado as any).margemMax || (chamado as any).margem_max || '',
      quantidade: (chamado as any).quantidade?.toString() || '',
      faixaTaxa: (chamado as any).faixaTaxa || (chamado as any).faixa_taxa || '',
      prazoMin: (chamado as any).prazoMin?.toString() || '',
      prazoMax: (chamado as any).prazoMax?.toString() || '',
      parcelaMin: (chamado as any).parcelaMin || (chamado as any).parcela_min || '',
      parcelaMax: (chamado as any).parcelaMax || (chamado as any).parcela_max || '',
      especieInput: '',
      especies: (chamado as any).especies || [],
      estados: (chamado as any).estados || [],
    });
    setShowNovoChamado(true);
  };

  // Alterar chamado existente
  const handleAlterarChamado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editChamadoId) return;

    const payload: any = {
      id: editChamadoId,
      titulo: formData.titulo?.trim(),
      solicitante: formData.solicitante?.trim() || user?.nome || user?.name || '',
      responsavel: formData.responsavel || null,
      descricao: formData.descricao?.trim() || '',
      categoria: formData.categoria,
      solicitante_id: user?.id,
    };

    if (formData.categoria === 'logins-ferramentas') {
      Object.assign(payload, {
        tipo_solicitacao: formData.tipoSolicitacao || null,
        cargo: formData.cargo || null,
        empresa_login: formData.empresa || null,
        ferramentas: formData.ferramentas?.length ? formData.ferramentas : null,
        nome_usuario: formData.nomeUsuario || null,
        cpf: formData.cpf ? formatarCPF(formData.cpf) : null,
        supervisor: formData.supervisor || null,
      });
    } else if (formData.categoria === 'estrategias') {
      Object.assign(payload, {
        empresa_estrategia: formData.empresaEstrategia || null,
        empresa_outros: formData.empresaOutros || null,
        idade_min: formData.idadeMin ? Number(formData.idadeMin) : null,
        idade_max: formData.idadeMax ? Number(formData.idadeMax) : null,
        perfil_cliente: formData.perfilCliente?.length ? formData.perfilCliente : null,
        canal: formData.canal?.length ? formData.canal : null,
        numero_sms: formData.numeroSMS || null,
        preferencia_ddb: formData.preferenciaDDB || null,
        data_inicial_ddb: formData.dataInicialDDB || null,
        data_final_ddb: formData.dataFinalDDB || null,
        renda_min: formData.rendaMin ? parseMoedaParaNumero(formatarMoeda(formData.rendaMin)) : null,
        renda_max: formData.rendaMax ? parseMoedaParaNumero(formatarMoeda(formData.rendaMax)) : null,
        produto: formData.produto?.length ? formData.produto : null,
        banco: formData.banco?.length ? formData.banco : null,
        banco_margem_cartao: formData.bancoMargemCartao?.length ? formData.bancoMargemCartao : null,
        margem_min: formData.margemMin ? parseMoedaParaNumero(formatarMoeda(formData.margemMin)) : null,
        margem_max: formData.margemMax ? parseMoedaParaNumero(formatarMoeda(formData.margemMax)) : null,
        quantidade: formData.quantidade ? Number(formData.quantidade) : null,
        faixa_taxa: formData.faixaTaxa ? formData.faixaTaxa.replace('%','').replace(',','.') : null,
        prazo_min: formData.prazoMin ? Number(formData.prazoMin) : null,
        prazo_max: formData.prazoMax ? Number(formData.prazoMax) : null,
        parcela_min: formData.parcelaMin ? parseMoedaParaNumero(formatarMoeda(formData.parcelaMin)) : null,
        parcela_max: formData.parcelaMax ? parseMoedaParaNumero(formatarMoeda(formData.parcelaMax)) : null,
        especies: formData.especies?.length ? formData.especies : null,
        estados: formData.estados?.length ? formData.estados : null,
      });
    }

    try {
      const resp = await fetch('https://n8n.sistemavieira.com.br/webhook-test/api/alterar-chamado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        console.error('Falha ao alterar chamado', await resp.text());
        return;
      }

      setShowNovoChamado(false);
      setEditChamadoId(null);
      await buscarChamadosDaAPI();
    } catch (err) {
      console.error('Erro ao alterar chamado:', err);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <DashboardHeader title="Chamados Planejamento" />
      
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header com botão novo chamado */}
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-neutral-900">Sistema de Chamados</h1>
            <Button 
              onClick={openCreateModal}
              icon={<Plus size={18} />}
              variant="primary"
            >
              Novo Chamado
            </Button>
          </div>

          {/* Cards de Estatísticas */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ staggerChildren: 0.1 }}
          >
            {[
              { titulo: 'Total de Chamados', valor: estatisticas.total, cor: 'bg-blue-500', icon: <FileText size={20} className="text-white" /> },
              { titulo: 'Em Andamento', valor: estatisticas.emAndamento, cor: 'bg-yellow-500', icon: <Clock size={20} className="text-white" /> },
              { titulo: 'Concluídos', valor: estatisticas.concluidos, cor: 'bg-green-500', icon: <CheckCircle size={20} className="text-white" /> },
              { titulo: 'Urgentes', valor: estatisticas.urgentes, cor: 'bg-red-500', icon: <AlertCircle size={20} className="text-white" /> }
            ].map((card, index) => (
              <motion.div
                key={index}
                className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-600">{card.titulo}</p>
                    <p className="text-3xl font-bold text-neutral-900">{card.valor}</p>
                </div>
                  <div className={`p-3 rounded-lg ${card.cor}`}>
                    {card.icon}
              </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Filtros e Busca */}
          <motion.div 
            className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Busca */}
              <div className="flex-1">
                <div className="relative">
                  <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Buscar chamados..."
                    value={filtros.busca}
                    onChange={(e) => setFiltros({...filtros, busca: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
          </div>

              {/* Filtros */}
              <div className="flex gap-3">
                <select
                  value={filtros.status}
                  onChange={(e) => setFiltros({...filtros, status: e.target.value})}
                  className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Todos os Status</option>
                  <option value="aberto">Aberto</option>
                                     <option value="em_andamento">Em Andamento</option>
                  <option value="aguardando">Aguardando</option>
                  <option value="concluido">Concluído</option>
                  <option value="cancelado">Cancelado</option>
                </select>

                

                <select
                  value={filtros.categoria}
                  onChange={(e) => setFiltros({...filtros, categoria: e.target.value})}
                  className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Todas as Categorias</option>
                  <option value="suporte">Suporte Técnico</option>
                  <option value="duvida">Dúvidas</option>
                  <option value="pagamento">Pagamento</option>
                  <option value="recurso">Recursos</option>
                  <option value="outro">Outros</option>
                </select>
              </div>
            </div>
          </motion.div>

          {/* Lista de Chamados */}
          <motion.div 
            className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="px-6 py-4 border-b border-neutral-200">
              <h2 className="text-lg font-semibold text-neutral-900">Chamados ({chamadosFiltrados.length})</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Chamado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                    
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Solicitante</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Tempo em Aberto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {chamadosFiltrados.map((chamado) => (
                    <tr key={chamado.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className={`${canUserViewChamado(chamado, user) ? 'text-neutral-900' : 'text-neutral-900 filter blur-sm select-none'} font-medium`}>
                            {chamado.titulo}
                          </span>
                          <span className={`${canUserViewChamado(chamado, user) ? 'text-neutral-500' : 'text-neutral-500 filter blur-sm select-none'} text-sm truncate`}>
                            {chamado.descricao}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(chamado.status)}`}>
                          {getStatusIcon(chamado.status)}
                          <span className="ml-1 capitalize">
                            {chamado.status === 'em_andamento' ? 'Em Andamento' : 
                             chamado.status === 'aguardando' ? 'Aguardando' : 
                             chamado.status}
                          </span>
                        </span>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                              <User size={16} className="text-primary-600" />
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-neutral-900">{chamado.solicitante}</div>
                            {chamado.responsavel && (
                              <div className="text-sm text-neutral-500">Responsável: {chamado.responsavel}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-500">
                        {formatarData(chamado.dataAbertura)}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-500">
                        {calcularTempoEmAberto(chamado.dataAbertura, chamado.status, chamado.dataAtualizacao)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            className={`p-1 rounded transition-colors ${canUserViewChamado(chamado, user) ? 'text-primary-600 hover:text-primary-700 cursor-pointer' : 'text-neutral-300 cursor-not-allowed'}`}
                            title={canUserViewChamado(chamado, user) ? 'Visualizar' : 'Sem permissão para visualizar'}
                            disabled={!canUserViewChamado(chamado, user)}
                            onClick={() => handleViewChamado(chamado)}
                          >
                            <Eye size={16} />
                          </button>
                                                     <button
                             className={`p-1 rounded transition-colors ${
                               canEditDelete 
                                 ? 'text-neutral-600 hover:text-neutral-900 cursor-pointer' 
                                 : 'text-neutral-300 cursor-not-allowed'
                             }`}
                             title={canEditDelete ? "Editar" : "Sem permissão para editar"}
                             disabled={!canEditDelete}
                           >
                             <Edit size={16} />
                           </button>
                           <button
                             className={`p-1 rounded transition-colors ${
                               canEditDelete 
                                 ? 'text-red-600 hover:text-red-900 cursor-pointer' 
                                 : 'text-red-300 cursor-not-allowed'
                             }`}
                             title={canEditDelete ? "Excluir" : "Sem permissão para excluir"}
                             disabled={!canEditDelete}
                           >
                             <Trash2 size={16} />
                           </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {chamadosFiltrados.length === 0 && (
              <div className="text-center py-12">
                <FileText size={48} className="mx-auto text-neutral-400 mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 mb-2">Nenhum chamado encontrado</h3>
                <p className="text-neutral-500">Tente ajustar os filtros ou criar um novo chamado.</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>

             {/* Modal Novo Chamado */}
       {showNovoChamado && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
           <motion.div 
             className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             exit={{ opacity: 0, scale: 0.9 }}
           >
             <div className="px-6 py-4 border-b border-neutral-200">
               <div className="flex justify-between items-center">
              {/* <h2 className="text-xl font-semibold text-neutral-900">Novo Chamado</h2> */}
               <h2 className="text-xl font-semibold text-neutral-900">{editChamadoId ? 'Editar Chamado' : 'Novo Chamado'}</h2>
                 <button
                   onClick={() => setShowNovoChamado(false)}
                   className="text-neutral-400 hover:text-neutral-600"
                 >
                   <XCircle size={24} />
                 </button>
               </div>
             </div>
             
             <div className="p-6">
              
              {/* <form className="space-y-6" onSubmit={handleCriarChamado}> */}
              <form className="space-y-6" onSubmit={editChamadoId ? handleAlterarChamado : handleCriarChamado}>
               {/* Título */}
              <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Título <span className="text-red-500">*</span>
                </label>
                    <input
                      type="text"
                      value={formData.titulo}
                      onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Digite o título do chamado"
                    />
              </div>


                  {/* Solicitante */}
              <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Solicitante <span className="text-red-500">*</span>
                </label>
                    <input
                      type="text"
                      value={formData.solicitante}
                      onChange={(e) => setFormData({...formData, solicitante: e.target.value})}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Digite o nome do solicitante"
                    />
              </div>

                  {/* Responsável */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Responsável
                    </label>
                    <select
                      value={formData.responsavel}
                      onChange={(e) => setFormData({...formData, responsavel: e.target.value})}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Selecione o responsável</option>
                      <option value="Lauany Santos">Lauany Santos</option>
                      <option value="André Felipe">André Felipe</option>
                      <option value="Rodrigo Rodrigues">Rodrigo Rodrigues</option>
                      <option value="Gustavo Pereira">Gustavo Pereira</option>
                      <option value="William Sanchez">William Sanchez</option>
                      <option value="Luana Barros">Luana Barros</option>
                    </select>
              </div>

                                   {/* Descrição */}
              <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Descrição
                </label>
                   <textarea
                     value={formData.descricao}
                     onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                     className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                     rows={4}
                     placeholder="Descreva o problema ou a solicitação"
                   />
              </div>

                 {/* Categoria */}
                 <div>
                   <label className="block text-sm font-medium text-neutral-700 mb-1">
                     Categoria <span className="text-red-500">*</span>
                   </label>
                   <select 
                     value={formData.categoria}
                     onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                     className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                   >
                     <option value="">Selecione uma categoria</option>
                     <option value="logins-ferramentas">Logins e Ferramentas</option>
                     <option value="estrategias">Estratégias</option>
                   </select>
              </div>

                 {/* Campos específicos para Logins e Ferramentas */}
                 {formData.categoria === 'logins-ferramentas' && (
                   <motion.div 
                     className="space-y-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200"
                     initial={{ opacity: 0, height: 0 }}
                     animate={{ opacity: 1, height: 'auto' }}
                     transition={{ duration: 0.3 }}
                   >
                     <h3 className="text-lg font-medium text-neutral-900 mb-4">Configurações de Login</h3>
                     
                     {/* Tipo de Solicitação */}
                     <div>
                       <label className="block text-sm font-medium text-neutral-700 mb-1">
                         Qual o tipo de solicitação? <span className="text-red-500">*</span>
                       </label>
                       <select 
                         value={formData.tipoSolicitacao}
                         onChange={(e) => setFormData({...formData, tipoSolicitacao: e.target.value})}
                         className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                       >
                         <option value="">Selecione o tipo</option>
                         <option value="novo-login">Novo Login</option>
                         <option value="alteracao-login">Alteração Login</option>
                         <option value="inativacao-login">Inativação Login</option>
                         <option value="alteracao-visao">Alteração Visão</option>
                         <option value="resetar-senha">Resetar Senha</option>
                         <option value="alteracao-equipe">Alteração Equipe</option>
                         <option value="renovacao-login">Renovação Login</option>
                         <option value="alteracao-nome">Alteração Nome</option>
                       </select>
                     </div>

                     {/* Cargo do Login */}
                     <div>
                       <label className="block text-sm font-medium text-neutral-700 mb-1">
                         Qual o cargo do login? <span className="text-red-500">*</span>
                       </label>
                       <select 
                         value={formData.cargo}
                         onChange={(e) => setFormData({...formData, cargo: e.target.value})}
                         className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                       >
                         <option value="">Selecione o cargo</option>
                         <option value="operador">Operador</option>
                         <option value="supervisor">Supervisor</option>
                         <option value="backoffice">Backoffice</option>
                         <option value="aceite">Aceite</option>
                         <option value="qualidade">Qualidade</option>
                         <option value="gestor">Gestor</option>
                         <option value="consulta">Consulta</option>
                       </select>
                     </div>

                     {/* Empresa/Parceiro */}
                     <div>
                       <label className="block text-sm font-medium text-neutral-700 mb-1">
                         Empresa/Parceiro <span className="text-red-500">*</span>
                       </label>
                       <select 
                         value={formData.empresa}
                         onChange={(e) => setFormData({...formData, empresa: e.target.value})}
                         className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                       >
                         <option value="">Selecione a empresa</option>
                         <option value="vieiracred">VIEIRACRED</option>
                         <option value="2a-consig">2A CONSIG</option>
                         <option value="3p-financeira">3P FINANCEIRA</option>
                         <option value="adapta">ADAPTA</option>
                         <option value="gbr">GBR</option>
                         <option value="m2-consig">M2 CONSIG</option>
                         <option value="prado">PRADO</option>
                         <option value="ramos">RAMOS</option>
                         <option value="grupo-corona">GRUPO CORONA</option>
                         <option value="unity">UNITY</option>
                         <option value="up-solucoes">UP SOLUÇÕES</option>
                         <option value="vmc">VMC</option>
                         <option value="expande">EXPANDE</option>
                       </select>
                     </div>

                     {/* Ferramentas */}
                     <div>
                       <label className="block text-sm font-medium text-neutral-700 mb-1">
                         Selecione as ferramentas que serão utilizadas: <span className="text-red-500">*</span>
                       </label>
                       <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                         {[
                           { value: 'argus', label: 'Argus' },
                           { value: 'newcorban', label: 'NewCorban' },
                           { value: 'rvx', label: 'RVX' },
                           { value: 'vanguard', label: 'Vanguard' },
                           { value: 'nova-europa', label: 'Nova Europa' }
                         ].map((ferramenta) => (
                           <label key={ferramenta.value} className="flex items-center space-x-2">
                             <input
                               type="checkbox"
                               checked={formData.ferramentas.includes(ferramenta.value)}
                               onChange={(e) => {
                                 if (e.target.checked) {
                                   setFormData({
                                     ...formData, 
                                     ferramentas: [...formData.ferramentas, ferramenta.value]
                                   });
                                 } else {
                                   setFormData({
                                     ...formData, 
                                     ferramentas: formData.ferramentas.filter(f => f !== ferramenta.value)
                                   });
                                 }
                               }}
                               className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                             />
                             <span className="text-sm text-neutral-700">{ferramenta.label}</span>
                           </label>
                         ))}
                       </div>
                     </div>

                     {/* Nome completo do usuário */}
                     <div>
                       <label className="block text-sm font-medium text-neutral-700 mb-1">
                         Nome completo do usuário <span className="text-red-500">*</span>
                       </label>
                       <input
                         type="text"
                         value={formData.nomeUsuario}
                         onChange={(e) => setFormData({...formData, nomeUsuario: e.target.value})}
                         className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                         placeholder="Digite o nome completo"
                       />
                     </div>

                     {/* CPF */}
                     <div>
                       <label className="block text-sm font-medium text-neutral-700 mb-1">
                         CPF <span className="text-red-500">*</span>
                       </label>
                                               <input
                          type="text"
                          value={formatarCPF(formData.cpf)}
                          onChange={(e) => {
                            const valorLimpo = parseCPFParaNumero(e.target.value);
                            setFormData({...formData, cpf: valorLimpo});
                          }}
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="xxx.xxx.xxx-xx"
                          maxLength={14}
                        />
                     </div>

                     {/* Supervisor */}
                     <div>
                       <label className="block text-sm font-medium text-neutral-700 mb-1">
                         Supervisor <span className="text-red-500">*</span>
                       </label>
                       <input
                         type="text"
                         value={formData.supervisor}
                         onChange={(e) => setFormData({...formData, supervisor: e.target.value})}
                         className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                         placeholder="Digite o nome do supervisor"
                       />
                     </div>

                     {/* Upload de arquivo para EXPANDE */}
                     {formData.empresa === 'expande' && (
                       <motion.div 
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: 0.2 }}
                       >
                         <label className="block text-sm font-medium text-neutral-700 mb-1">
                           Anexar arquivo <span className="text-red-500">*</span>
                         </label>
                         <input
                           type="file"
                           accept=".pdf,.jpg,.jpeg,.png"
                           onChange={(e) => setFormData({...formData, arquivo: e.target.files?.[0] || null})}
                           className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                         />
                         <p className="text-xs text-neutral-500 mt-1">Formatos aceitos: PDF, JPG, JPEG, PNG</p>
          </motion.div>
                     )}
                   </motion.div>
                 )}

                 {/* Campos específicos para Estratégias */}
                 {formData.categoria === 'estrategias' && (
                   <motion.div 
                     className="space-y-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200"
                     initial={{ opacity: 0, height: 0 }}
                     animate={{ opacity: 1, height: 'auto' }}
                     transition={{ duration: 0.3 }}
                   >
                     <h3 className="text-lg font-medium text-neutral-900 mb-4">Configurações de Estratégia</h3>
                     
                     {/* Empresa */}
                     <div>
                       <label className="block text-sm font-medium text-neutral-700 mb-1">
                         Empresa <span className="text-red-500">*</span>
                       </label>
                       <select 
                         value={formData.empresaEstrategia}
                         onChange={(e) => setFormData({...formData, empresaEstrategia: e.target.value})}
                         className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                       >
                         <option value="">Selecione a empresa</option>
                         <option value="vieiracred">VIEIRACRED</option>
                         <option value="2a-consig">2A CONSIG</option>
                         <option value="3p-financeira">3P FINANCEIRA</option>
                         <option value="adapta">ADAPTA</option>
                         <option value="expande">EXPANDE</option>
                         <option value="gbr">GBR</option>
                         <option value="up-solucoes">UP SOLUÇÕES</option>
                         <option value="vmc">VMC</option>
                         <option value="start">START</option>
                         <option value="m2-consig">M2 CONSIG</option>
                         <option value="prado">PRADO</option>
                         <option value="gx">GX</option>
                         <option value="outros">OUTROS</option>
                       </select>
                  </div>

                     {/* Empresa Outros - Input condicional */}
                     {formData.empresaEstrategia === 'outros' && (
                       <motion.div 
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: 0.1 }}
                       >
                         <label className="block text-sm font-medium text-neutral-700 mb-1">
                           Qual empresa? <span className="text-red-500">*</span>
                         </label>
                         <input
                           type="text"
                           value={formData.empresaOutros}
                           onChange={(e) => setFormData({...formData, empresaOutros: e.target.value})}
                           className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                           placeholder="Digite o nome da empresa"
                         />
                       </motion.div>
                     )}

                     {/* Filtro de Idade */}
                     <div className="grid grid-cols-2 gap-4">
                       <div>
                         <label className="block text-sm font-medium text-neutral-700 mb-1">
                           Idade mínima <span className="text-red-500">*</span>
                         </label>
                         <input
                           type="number"
                           min="0"
                           max="99"
                           value={formData.idadeMin}
                           onChange={(e) => setFormData({...formData, idadeMin: e.target.value})}
                           className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                           placeholder="00"
                           maxLength={2}
                         />
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-neutral-700 mb-1">
                           Idade máxima
                         </label>
                         <input
                           type="number"
                           min="0"
                           max="99"
                           value={formData.idadeMax}
                           onChange={(e) => setFormData({...formData, idadeMax: e.target.value})}
                           className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                           placeholder="00"
                           maxLength={2}
                         />
                  </div>
                </div>

                     {/* Perfil do Cliente */}
                     <div>
                       <label className="block text-sm font-medium text-neutral-700 mb-1">
                         Perfil do cliente
                       </label>
                       <div className="grid grid-cols-3 gap-3">
                         {[
                           { value: 'tomador', label: 'Tomador' },
                           { value: 'entrante', label: 'Entrante' },
                           { value: 'sem-preferencia', label: 'Sem preferência' }
                         ].map((perfil) => (
                           <label key={perfil.value} className="flex items-center space-x-2">
                             <input
                               type="checkbox"
                               checked={formData.perfilCliente.includes(perfil.value)}
                               onChange={(e) => {
                                 if (e.target.checked) {
                                   setFormData({
                                     ...formData, 
                                     perfilCliente: [...formData.perfilCliente, perfil.value]
                                   });
                                 } else {
                                   setFormData({
                                     ...formData, 
                                     perfilCliente: formData.perfilCliente.filter(p => p !== perfil.value)
                                   });
                                 }
                               }}
                               className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                             />
                             <span className="text-sm text-neutral-700">{perfil.label}</span>
                           </label>
                         ))}
                  </div>
                     </div>

                     {/* Canal */}
                     <div>
                       <label className="block text-sm font-medium text-neutral-700 mb-1">
                         Escolha canal
                       </label>
                  <div className="space-y-2">
                         {[
                           { value: 'mailing', label: 'Mailing (Base)' },
                           { value: 'whatsapp', label: 'Disparo Whatsapp' },
                           { value: 'sms', label: 'Disparo SMS' }
                         ].map((canal) => (
                           <label key={canal.value} className="flex items-center space-x-2">
                             <input
                               type="checkbox"
                               checked={formData.canal.includes(canal.value)}
                               onChange={(e) => {
                                 if (e.target.checked) {
                                   setFormData({
                                     ...formData, 
                                     canal: [...formData.canal, canal.value]
                                   });
                                 } else {
                                   setFormData({
                                     ...formData, 
                                     canal: formData.canal.filter(c => c !== canal.value)
                                   });
                                 }
                               }}
                               className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                             />
                             <span className="text-sm text-neutral-700">{canal.label}</span>
                           </label>
                         ))}
                  </div>
                </div>

                     {/* Número SMS - Input condicional */}
                     {formData.canal.includes('sms') && (
                       <motion.div 
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: 0.1 }}
                       >
                         <label className="block text-sm font-medium text-neutral-700 mb-1">
                           Número para SMS <span className="text-red-500">*</span>
                         </label>
                         <input
                           type="text"
                           value={formData.numeroSMS}
                           onChange={(e) => setFormData({...formData, numeroSMS: e.target.value})}
                           className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                           placeholder="(xx) xxxxx-xxxx"
                         />
                       </motion.div>
                     )}

                     {/* Preferência por DDB */}
                     <div>
                       <label className="block text-sm font-medium text-neutral-700 mb-1">
                         Tem preferência por DDB?
                       </label>
                       <select 
                         value={formData.preferenciaDDB}
                         onChange={(e) => setFormData({...formData, preferenciaDDB: e.target.value})}
                         className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                       >
                         <option value="">Selecione</option>
                         <option value="sim">Sim</option>
                         <option value="nao">Não</option>
                       </select>
              </div>

                     {/* Datas DDB - Inputs condicionais */}
                     {formData.preferenciaDDB === 'sim' && (
                       <motion.div 
                         className="grid grid-cols-2 gap-4"
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: 0.1 }}
                       >
                         <div>
                           <label className="block text-sm font-medium text-neutral-700 mb-1">
                             Data inicial DDB <span className="text-red-500">*</span>
                           </label>
                           <input
                             type="date"
                             value={formData.dataInicialDDB}
                             onChange={(e) => setFormData({...formData, dataInicialDDB: e.target.value})}
                             className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                           />
                </div>
                         <div>
                           <label className="block text-sm font-medium text-neutral-700 mb-1">
                             Data final DDB <span className="text-red-500">*</span>
                           </label>
                           <input
                             type="date"
                             value={formData.dataFinalDDB}
                             onChange={(e) => setFormData({...formData, dataFinalDDB: e.target.value})}
                             className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                           />
                         </div>
                       </motion.div>
                     )}

                     {/* Faixa de Renda */}
                     <div className="grid grid-cols-2 gap-4">
                       <div>
                         <label className="block text-sm font-medium text-neutral-700 mb-1">
                           Valor mínimo
                         </label>
                         <input
                           type="text"
                           value={formatarMoeda(formData.rendaMin)}
                           onChange={(e) => setFormData({...formData, rendaMin: parseMoedaParaNumero(e.target.value)})}
                           className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                           placeholder="R$ 0,00"
                         />
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-neutral-700 mb-1">
                           Valor máximo
                         </label>
                         <input
                           type="text"
                           value={formatarMoeda(formData.rendaMax)}
                           onChange={(e) => setFormData({...formData, rendaMax: parseMoedaParaNumero(e.target.value)})}
                           className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                           placeholder="R$ 0,00"
                         />
                       </div>
                     </div>

                     {/* Produto */}
                     <div>
                       <label className="block text-sm font-medium text-neutral-700 mb-1">
                         Escolha produto
                       </label>
                       <div className="grid grid-cols-2 gap-3">
                         {[
                           { value: 'portabilidade', label: 'Portabilidade' },
                           { value: 'margem-livre', label: 'Margem Livre' },
                           { value: 'port-com-refin', label: 'Port com Refin' },
                           { value: 'cartao-com-saque', label: 'Cartão com Saque' },
                           { value: 'cartao-sem-saque', label: 'Cartão sem Saque' }
                         ].map((produto) => (
                           <label key={produto.value} className="flex items-center space-x-2">
                             <input
                               type="checkbox"
                               checked={formData.produto.includes(produto.value)}
                               onChange={(e) => {
                                 if (e.target.checked) {
                                   setFormData({
                                     ...formData, 
                                     produto: [...formData.produto, produto.value]
                                   });
                                 } else {
                                   setFormData({
                                     ...formData, 
                                     produto: formData.produto.filter(p => p !== produto.value)
                                   });
                                 }
                               }}
                               className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                             />
                             <span className="text-sm text-neutral-700">{produto.label}</span>
                           </label>
                         ))}
                </div>
              </div>

                     {/* Banco */}
                     <div>
                       <label className="block text-sm font-medium text-neutral-700 mb-1">
                         Escolha uma ou mais opções de Banco
                       </label>
                       <div className="max-h-40 overflow-y-auto border border-neutral-200 rounded-lg p-3">
                         <div className="grid grid-cols-1 gap-2">
                           {[
                             '121-AGIBANK S.A', '70-BANCO BRB', '954-BANCO CBSS / DIGIO',
                             '756-BANCO COOPERATIVO DO BRASIL S.A. (BANCOOB/SICOOB)', '1-BANCO DO BRASIL',
                             '341-BANCO ITAU', '623-BANCO PAN', '47-BANESE - BNANCO ESTADO DO SERGIPE S.A',
                             '21-BANESTES S.A. Banco do Estado do Espírito Santo', '41-BANRISUL', '318-BMG',
                             '237-BRADESCO', '394-BRADESCO FINANCIAMENTOS', '925-BRB FINANCEIRA', '626-C6 FICSA',
                             '104-CEF', '748-COOPERATIVO SICREDI S.A', '69-CREFISA', '329-Icred (QI SOCIEDADE DO CRÉDITO)',
                             '29-ITAU CONSIGNADO', '389-MERCANTIL', '386-NU FINANCEIRA S.A. – SOCIEDADE DE CRÉDITO, FINANCI',
                             '260-NUBANK', '422-SAFRA', '33-SANTANDER', '81-SEGURO', '77-BANCO INTER',
                             '326-Banco Parati', 'TODOS'
                           ].map((banco) => (
                             <label key={banco} className="flex items-center space-x-2">
                               <input
                                 type="checkbox"
                                 checked={formData.banco.includes(banco)}
                                 onChange={(e) => {
                                   if (e.target.checked) {
                                     setFormData({
                                       ...formData, 
                                       banco: [...formData.banco, banco]
                                     });
                                   } else {
                                     setFormData({
                                       ...formData, 
                                       banco: formData.banco.filter(b => b !== banco)
                                     });
                                   }
                                 }}
                                 className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                               />
                               <span className="text-sm text-neutral-700">{banco}</span>
                             </label>
                           ))}
                </div>
                  </div>
                  </div>

                     {/* Banco (Margem e Cartão) */}
                     <div>
                       <label className="block text-sm font-medium text-neutral-700 mb-1">
                         Escolha uma ou mais opções de Banco (Margem e Cartão)
                       </label>
                       <div className="max-h-40 overflow-y-auto border border-neutral-200 rounded-lg p-3">
                         <div className="grid grid-cols-1 gap-2">
                           {[
                             '707-DAYCOVAL', '935-FACTA', '79-PICPAY', '12-INBURSA', '121-AGIBANK S.A',
                             '70-BANCO BRB', '954-BANCO CBSS / DIGIO', '756-BANCO COOPERATIVO DO BRASIL S.A. (BANCOOB/SICOOB)',
                             '1-BANCO DO BRASIL', '341-BANCO ITAU', '623-BANCO PAN', '47-BANESE - BNANCO ESTADO DO SERGIPE S.A',
                             '21-BANESTES S.A. Banco do Estado do Espírito Santo', '41-BANRISUL', '318-BMG',
                             '237-BRADESCO', '394-BRADESCO FINANCIAMENTOS', '925-BRB FINANCEIRA', '626-C6 FICSA',
                             '104-CEF', '748-COOPERATIVO SICREDI S.A', '69-CREFISA', '329-Icred (QI SOCIEDADE DO CRÉDITO)',
                             '29-ITAU CONSIGNADO', '389-MERCANTIL', '386-NU FINANCEIRA S.A. – SOCIEDADE DE CRÉDITO, FINANCI',
                             '260-NUBANK', '422-SAFRA', '33-SANTANDER', '81-SEGURO', '77-BANCO INTER',
                             '326-Banco Parati', 'TODOS'
                           ].map((banco) => (
                             <label key={banco} className="flex items-center space-x-2">
                               <input
                                 type="checkbox"
                                 checked={formData.bancoMargemCartao.includes(banco)}
                                 onChange={(e) => {
                                   if (e.target.checked) {
                                     setFormData({
                                       ...formData, 
                                       bancoMargemCartao: [...formData.bancoMargemCartao, banco]
                                     });
                                   } else {
                                     setFormData({
                                       ...formData, 
                                       bancoMargemCartao: formData.bancoMargemCartao.filter(b => b !== banco)
                                     });
                                   }
                                 }}
                                 className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                               />
                               <span className="text-sm text-neutral-700">{banco}</span>
                             </label>
                           ))}
                         </div>
                       </div>
                     </div>

                     {/* Valor Margem */}
                     <div className="grid grid-cols-2 gap-4">
                       <div>
                         <label className="block text-sm font-medium text-neutral-700 mb-1">
                           Valor margem mínimo
                         </label>
                         <input
                           type="text"
                           value={formatarMoeda(formData.margemMin)}
                           onChange={(e) => setFormData({...formData, margemMin: parseMoedaParaNumero(e.target.value)})}
                           className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                           placeholder="R$ 0,00"
                         />
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-neutral-700 mb-1">
                           Valor margem máximo
                         </label>
                         <input
                           type="text"
                           value={formatarMoeda(formData.margemMax)}
                           onChange={(e) => setFormData({...formData, margemMax: parseMoedaParaNumero(e.target.value)})}
                           className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                           placeholder="R$ 0,00"
                         />
                       </div>
                     </div>

                     {/* Quantidade */}
                     <div>
                       <label className="block text-sm font-medium text-neutral-700 mb-1">
                         Quantidade
                       </label>
                       <input
                         type="number"
                         min="0"
                         value={formData.quantidade}
                         onChange={(e) => setFormData({...formData, quantidade: e.target.value})}
                         className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                         placeholder="0"
                       />
                     </div>

                     {/* Faixa de Taxa */}
                     <div>
                       <label className="block text-sm font-medium text-neutral-700 mb-1">
                         Faixa de Taxa (formato x.xx%)
                       </label>
                                               <input
                          type="text"
                          value={formData.faixaTaxa}
                          onChange={(e) => {
                            const valor = e.target.value;
                            // Remove % se o usuário digitar
                            const valorLimpo = valor.replace('%', '');
                            setFormData({...formData, faixaTaxa: valorLimpo});
                          }}
                          onBlur={(e) => {
                            // Aplica formatação simples quando sair do campo
                            const valor = e.target.value;
                            if (valor && !valor.includes(',')) {
                              // Se não tem vírgula, adiciona ,00%
                              setFormData({...formData, faixaTaxa: `${valor},00%`});
                            } else if (valor && !valor.includes('%')) {
                              // Se tem vírgula mas não tem %, adiciona %
                              setFormData({...formData, faixaTaxa: `${valor}%`});
                            }
                          }}
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="0,00%"
                        />
                     </div>

                     {/* Faixa de Prazo */}
                     <div className="grid grid-cols-2 gap-4">
                       <div>
                         <label className="block text-sm font-medium text-neutral-700 mb-1">
                           Prazo mínimo
                         </label>
                         <input
                           type="number"
                           min="0"
                           value={formData.prazoMin}
                           onChange={(e) => setFormData({...formData, prazoMin: e.target.value})}
                           className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                           placeholder="0"
                         />
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-neutral-700 mb-1">
                           Prazo máximo
                         </label>
                         <input
                           type="number"
                           min="0"
                           value={formData.prazoMax}
                           onChange={(e) => setFormData({...formData, prazoMax: e.target.value})}
                           className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                           placeholder="0"
                         />
                       </div>
                     </div>

                     {/* Valor da Parcela */}
                     <div className="grid grid-cols-2 gap-4">
                       <div>
                         <label className="block text-sm font-medium text-neutral-700 mb-1">
                           Valor da parcela mínimo
                         </label>
                         <input
                           type="text"
                           value={formatarMoeda(formData.parcelaMin)}
                           onChange={(e) => setFormData({...formData, parcelaMin: parseMoedaParaNumero(e.target.value)})}
                           className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                           placeholder="R$ 0,00"
                         />
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-neutral-700 mb-1">
                           Valor da parcela máximo
                         </label>
                         <input
                           type="text"
                           value={formatarMoeda(formData.parcelaMax)}
                           onChange={(e) => setFormData({...formData, parcelaMax: parseMoedaParaNumero(e.target.value)})}
                           className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                           placeholder="R$ 0,00"
                         />
                       </div>
                     </div>

                     {/* Espécies */}
                     <div>
                       <label className="block text-sm font-medium text-neutral-700 mb-1">
                         Espécies (até 2 dígitos)
                       </label>
                       <div className="space-y-3">
                         <div className="flex items-center space-x-2">
                           <input
                             type="text"
                             maxLength={2}
                             value={formData.especieInput}
                             onChange={(e) => setFormData({...formData, especieInput: e.target.value})}
                             onKeyDown={(e) => {
                               if (e.key === 'Enter' || e.key === 'Tab') {
                                 e.preventDefault();
                                 if (formData.especieInput && formData.especieInput.length === 2) {
                                   if (!formData.especies.includes(formData.especieInput)) {
                                     setFormData({
                                       ...formData,
                                       especies: [...formData.especies, formData.especieInput],
                                       especieInput: ''
                                     });
                                   }
                                 }
                               }
                             }}
                             className="w-20 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-center"
                             placeholder="00"
                           />
                           <span className="text-sm text-neutral-500">Digite 2 dígitos e pressione Tab/Enter para adicionar</span>
                         </div>
                         
                         {/* Chips das espécies */}
                         {formData.especies.length > 0 && (
                           <div className="flex flex-wrap gap-2">
                             {formData.especies.map((especie, index) => (
                               <div key={index} className="flex items-center bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full text-sm">
                                 <span>{especie}</span>
                                 <button
                                   type="button"
                                   onClick={() => setFormData({
                                     ...formData,
                                     especies: formData.especies.filter((_, i) => i !== index)
                                   })}
                                   className="ml-2 text-neutral-500 hover:text-neutral-700"
                                 >
                                   ×
                                 </button>
                               </div>
                             ))}
                           </div>
                         )}
                       </div>
                     </div>

                     {/* Estado */}
                     <div>
                       <label className="block text-sm font-medium text-neutral-700 mb-1">
                         Escolha uma ou mais opção de Estado
                       </label>
                       <div className="max-h-40 overflow-y-auto border border-neutral-200 rounded-lg p-3">
                         <div className="grid grid-cols-2 gap-2">
                           {[
                             'SP', 'CE', 'PR', 'MG', 'PB', 'RJ', 'SC', 'SE', 'BA', 'RS', 'GO', 'DF',
                             'AL', 'ES', 'RO', 'PE', 'MS', 'PI', 'MA', 'PA', 'MT', 'AM', 'RN', 'TO',
                             'AP', 'AC', 'RR', 'TODOS'
                           ].map((estado) => (
                             <label key={estado} className="flex items-center space-x-2">
                               <input
                                 type="checkbox"
                                 checked={formData.estados.includes(estado)}
                                 onChange={(e) => {
                                   if (e.target.checked) {
                                     setFormData({
                                       ...formData, 
                                       estados: [...formData.estados, estado]
                                     });
                                   } else {
                                     setFormData({
                                       ...formData, 
                                       estados: formData.estados.filter(e => e !== estado)
                                     });
                                   }
                                 }}
                                 className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                               />
                               <span className="text-sm text-neutral-700">{estado}</span>
                             </label>
                           ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

                 {/* Botões */}
                 <div className="flex justify-end space-x-3 pt-6 border-t border-neutral-200">
                   <Button
                     onClick={() => setShowNovoChamado(false)}
                     variant="secondary"
                   >
                     Cancelar
                   </Button>
                   <Button
                     variant="primary"
                     icon={<Plus size={18} />}
                     type="submit"
                   >
                     {editChamadoId ? 'Alterar' : 'Criar Chamado'}
                   </Button>
        </div>
      </form>
      </div>
           </motion.div>
         </div>
       )  
       }

      {/* Modal Visualizar Chamado */}
      {chamadoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <motion.div 
            className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="px-6 py-4 border-b border-neutral-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-neutral-900">Detalhes do Chamado</h2>
                <button
                  onClick={() => setChamadoSelecionado(null)}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-4">{chamadoSelecionado.titulo}</h3>
                  <p className="text-neutral-600 mb-6">{chamadoSelecionado.descricao}</p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-neutral-700">Status:</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(chamadoSelecionado.status)}`}>
                        {getStatusIcon(chamadoSelecionado.status)}
                        <span className="ml-1 capitalize">
                          {chamadoSelecionado.status === 'em_andamento' ? 'Em Andamento' : 
                           chamadoSelecionado.status === 'aguardando' ? 'Aguardando' : 
                           chamadoSelecionado.status}
                        </span>
                      </span>
                    </div>
                    
                    
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-neutral-700">Categoria:</span>
                      <span className="text-sm text-neutral-600 capitalize">{chamadoSelecionado.categoria}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="bg-neutral-50 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-neutral-900 mb-3">Informações do Chamado</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Solicitante:</span>
                        <span className="text-neutral-900">{chamadoSelecionado.solicitante}</span>
                      </div>
                      {chamadoSelecionado.responsavel && (
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Responsável:</span>
                          <span className="text-neutral-900">{chamadoSelecionado.responsavel}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Data de Abertura:</span>
                        <span className="text-neutral-900">{formatarData(chamadoSelecionado.dataAbertura)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Última Atualização:</span>
                        <span className="text-neutral-900">{formatarData(chamadoSelecionado.dataAtualizacao)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {chamadoSelecionado.comentarios.length > 0 && (
                    <div>
                      <h4 className="font-medium text-neutral-900 mb-3">Comentários</h4>
                      <div className="space-y-3">
                        {chamadoSelecionado.comentarios.map((comentario) => (
                          <div key={comentario.id} className="bg-white border border-neutral-200 rounded-lg p-3">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-sm font-medium text-neutral-900">{comentario.autor}</span>
                              <span className="text-xs text-neutral-500">{formatarData(comentario.data)}</span>
                            </div>
                            <p className="text-sm text-neutral-600">{comentario.texto}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-neutral-200">
                <div className="flex justify-end space-x-3">
                  <Button
                    onClick={() => setChamadoSelecionado(null)}
                    variant="secondary"
                  >
                    Fechar
                  </Button>
                                     <Button
                     variant={canEditDelete ? "primary" : "secondary"}
                     icon={<Edit size={18} />}
                     disabled={!canEditDelete}
                     className={!canEditDelete ? "opacity-50 cursor-not-allowed" : ""}
                   >
                     {canEditDelete ? "Editar Chamado" : "Sem Permissão"}
                   </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ChamadosPlane;
