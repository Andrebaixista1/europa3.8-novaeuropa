import fetchOrN8nStore from "../utils/fetchOrN8nStore";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  CreditCard,
  DollarSign,
  Activity,
  User as UserIcon,
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
  MoveVertical,
  Clipboard,
  Check,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import InputMask from "react-input-mask";
import DashboardHeader from "../components/DashboardHeader";
import Button from "../components/Button";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";

export const API_BASE = 'https://n8n.sistemavieira.com.br/webhook';
const SALDO_API_BASE = 'https://n8n.sistemavieira.com.br/webhook';

interface FormErrors {
  nome?: string;
  cpf?: string;
}

interface AccountLimits {
  id: number;
  login: string;
  total_loaded: number;
  available_limit: number;
  queries_performed: number;
}

interface Parcela {
  numeroParcela: number;
  dataVencimento: string;
  valorParcela: number;
}

interface FGTSResponse {
  nomeCliente: string;
  cpfCliente: string;
  statusGeral: string;
  dataProposta: string;
  valorTotalSimulado: number;
  valorLiquidoDisponivel: number;
  custoTotalContrato: number;
  parcelas: Parcela[];
}

const ConsultaFGTS: React.FC = () => {
  const { user } = useAuth();
  const [cpf, setCpf] = useState("");
  const [nb, setNb] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSearching, setIsSearching] = useState(false);
  
  const [accountLimits, setAccountLimits] = useState<AccountLimits | null>(null);
  const [isLoadingLimits, setIsLoadingLimits] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  // Carrosseis para contratos, endereços, bancos
  // Remover estados e lógica de paginação e filtro de datas
  // Estado para nomes dos bancos
  const [nomeBancoPagamento, setNomeBancoPagamento] = useState<string>("");
  const [nomesBancoPagamento, setNomesBancoPagamento] = useState<{[codigo: string]: string}>({});
  const [nomesBancoEmprestimo, setNomesBancoEmprestimo] = useState<{[codigo: string]: string}>({});

  // Estado para evitar toast duplicado
  const [erroClienteMostrado, setErroClienteMostrado] = useState(false);

  // Mensagem de erro temporária
  const [showRedAlert, setShowRedAlert] = useState(false);
  const [redAlertMsg, setRedAlertMsg] = useState("");

  // Estado para modal IN100
  const [showIN100Modal, setShowIN100Modal] = useState(false);

  // Estados para animação do botão de copiar
  const [copiandoCPF, setCopiandoCPF] = useState<'idle' | 'loading' | 'done'>("idle");
  const [copiandoNB, setCopiandoNB] = useState<'idle' | 'loading' | 'done'>("idle");

  // Calcular datas mínima e máxima dos contratos
  useEffect(() => {
    if (Array.isArray(resultData) && resultData.length > 0) {
      const datas = resultData.map((c: any) => c["data_update"]).filter(Boolean).map((d: string) => new Date(d));
      if (datas.length) {
        const min = new Date(Math.min(...datas.map(d => d.getTime())));
        const max = new Date(Math.max(...datas.map(d => d.getTime())));
        const toInput = (d: Date) => d.toISOString().slice(0,10);
        // Remover filtro de mais recente/mais antigo
      }
    }
  }, [resultData]);

  const fetchUserBalance = async () => {
    if (!user) return;
    setIsLoadingLimits(true);
    try {
      const res = await fetch(`${SALDO_API_BASE}/api/saldo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAccountLimits({
        id: data.id,
        login: data.login,
        total_loaded: data.total_carregado,
        available_limit: data.limite_disponivel,
        queries_performed: data.consultas_realizada,
      });
    } catch {
      toast.error("Erro ao atualizar saldo", { autoClose: 3000 });
    } finally {
      setIsLoadingLimits(false);
    }
  };

  useEffect(() => {
    fetchUserBalance();
  }, [user]);

  // Buscar nome do banco ao trocar de linha
  useEffect(() => {
    if (Array.isArray(resultData) && resultData.length > 0) {
      const row = resultData[0]; // Pegar o primeiro registro para buscar bancos
      // Banco Pagamento
      const codBancoPagto = row["id-banco-pagto"];
      if (codBancoPagto) {
        fetch(`https://brasilapi.com.br/api/banks/v1/${codBancoPagto}`)
          .then(r => r.ok ? r.json() : null)
          .then(d => setNomeBancoPagamento(d?.name || ""))
          .catch(() => setNomeBancoPagamento(""));
      } else {
        setNomeBancoPagamento("");
      }
      // Banco Empréstimo (buscar sempre que mudar de contrato)
      let codBancoEmp = row["id-banco-empres"];
      if (typeof codBancoEmp === 'string') codBancoEmp = codBancoEmp.trim().replace(/^0+/, '');
      if (codBancoEmp) {
        fetch(`https://brasilapi.com.br/api/banks/v1/${codBancoEmp}`)
          .then(r => r.ok ? r.json() : null)
          .then(d => {
            console.log('codBancoEmp:', codBancoEmp, 'resposta:', d);
            setNomesBancoEmprestimo(prev => ({ ...prev, [codBancoEmp]: d?.name || "" }));
          })
          .catch(() => setNomesBancoEmprestimo(prev => ({ ...prev, [codBancoEmp]: "" })));
      } else {
        setNomesBancoEmprestimo(prev => ({ ...prev, [codBancoEmp]: "" }));
      }
    }
  }, [resultData]);

  const validateCPF = (v: string) => v.replace(/\D/g, "").length === 11;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  // Função para formatar datas para dd/mm/aaaa
  function formatDateBR(dateStr?: string) {
    if (!dateStr) return "-";
    // Corrigir bug de fuso: se vier no formato YYYY-MM-DD, monta manualmente
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split("-");
      return `${d}/${m}/${y}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("pt-BR");
  }
  function formatCurrencyBR(value: any) {
    const n = Number(value);
    if (isNaN(n)) return "-";
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  // Função para formatar taxa decimal para percentual brasileiro
  function formatPercentBR(value: any) {
    const n = Number(value);
    if (isNaN(n)) return "-";
    return (n * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
  }

  // 2. Estado buscou para controlar exibição da mensagem
  const [buscou, setBuscou] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBuscou(true);
    const newErr: FormErrors = {};
    if (!cpf.replace(/\D/g, "") && !nb.replace(/\D/g, "")) {
      newErr.cpf = "Preencha CPF ou Número do Benefício";
    } else if (cpf.replace(/\D/g, "")) {
      if (!validateCPF(cpf)) newErr.cpf = "CPF inválido";
    }
    setErrors(newErr);
    if (Object.keys(newErr).length) return;
    setIsSearching(true);
    setResultData(null);

    const payload = {
      id: user?.id || 0,
      cpf: cpf.replace(/\D/g, ""),
      nb: nb.replace(/\D/g, ""),
    };
    const endpoint = '/api/macica-online';

    try {
      const res = await fetchOrN8nStore(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      // Verificar se o resultado é válido antes de mostrar o toast de sucesso ou erro
      let dadosValidos = true;
      if (Array.isArray(json)) {
        if (json.length === 0 || json.every(obj => Object.keys(obj).length === 0)) dadosValidos = false;
        else {
          // Verifica se todos os campos principais estão zerados no primeiro item
          const row = json[0];
          const camposPrincipais = [row["nome segurado"], row["nb_tratado"], row["nu_cpf_tratado"], row["esp"], row["dt_nascimento_tratado"], row["idade"]];
          if (camposPrincipais.every(v => !v || v === 0 || v === "0")) dadosValidos = false;
        }
      } else if (json && typeof json === 'object') {
        if (Object.keys(json).length === 0) dadosValidos = false;
        else {
          const camposPrincipais = [json["nome segurado"], json["nb_tratado"], json["nu_cpf_tratado"], json["esp"], json["dt_nascimento_tratado"], json["idade"]];
          if (camposPrincipais.every(v => !v || v === 0 || v === "0")) dadosValidos = false;
        }
      }
      setResultData(json); // <--- usar o objeto inteiro
      if (dadosValidos) {
        toast.success("Consulta realizada com sucesso!", { autoClose: 3000 });
        await fetchUserBalance();
      } else {
        setRedAlertMsg('Cliente não existe/não foi encontrado.');
        setShowRedAlert(true);
        setErroClienteMostrado(true);
        setResultData(null);
        setTimeout(() => setShowRedAlert(false), 5000);
      }
    } catch {
      toast.error("Erro ao processar a solicitação", { autoClose: 3000 });
    } finally {
      setIsSearching(false);
    }
  };

  // Mapeamento para nomes amigáveis das colunas
  const columnLabels: Record<string, string> = {
    "nome segurado": "Nome do Segurado",
    "esp": "Espécie",
    "dib": "DIB",
    "id-banco-pagto": "Banco Pagamento",
    "id-agencia-banco": "Agência Pagamento",
    "id-orgao-pagador": "Órgão Pagador",
    "nu-conta-corrente": "Conta Corrente",
    "cs-meio-pagto": "Meio de Pagamento",
    "id-banco-empres": "Banco Empresa",
    "id-contrato-empres": "Contrato Empresa",
    "endereco": "Endereço",
    "bairro": "Bairro",
    "municipio": "Município",
    "uf": "UF",
    "cep": "CEP",
    "idade": "Idade",
    "restantes": "Parcelas Restantes",
    "pagas": "Parcelas Pagas",
    "nb_tratado": "NB Tratado",
    "dt_nascimento_tratado": "Nascimento",
    "nu_cpf_tratado": "CPF Tratado",
    "vl_beneficio_tratado": "Valor Benefício",
    "vl_parcela_tratado": "Valor Parcela",
    "vl_empres_tratado": "Valor Empresa",
    "comp_ini_desconto_tratado": "Início Desconto",
    "comp_fim_desconto_tratado": "Fim Desconto",
    "quant_parcelas_tratado": "Qtd Parcelas",
    "data_update": "Data Atualização"
  };

  // Mensagem amarela temporária
  const [showYellowAlert, setShowYellowAlert] = useState(true);
  useEffect(() => {
    setShowYellowAlert(true);
    const timer = setTimeout(() => setShowYellowAlert(false), 15000);
    return () => clearTimeout(timer);
  }, []);

  // Resetar erroClienteMostrado ao pesquisar
  useEffect(() => {
    setErroClienteMostrado(false);
  }, [isSearching]);

  // Função para abrir nova aba com os dados preenchidos
  function handleIN100Consultar() {
    const row = resultData && resultData[0]; // Pegar o primeiro registro
    const cpf = row ? row["nu_cpf_tratado"] : "";
    const nb = row ? row["nb_tratado"] : "";
    const url = `/dashboard/individual?cpf=${encodeURIComponent(cpf)}&nb=${encodeURIComponent(nb)}`;
    window.open(url, '_blank');
  }

  // Função para normalizar cliente (incluindo espécie)
  function normalizeCliente(row: any): string {
    return [
      (row["nome segurado"] || "").toString().trim().toUpperCase(),
      (row["nu_cpf_tratado"] || "").toString().replace(/\D/g, ""),
      (row["nb_tratado"] || "").toString().replace(/\D/g, ""),
      (row["esp"] || "").toString().trim()
    ].join('|');
  }

  function groupByCliente(rows: any[]): any[][] {
    const map = new Map();
    for (const row of rows) {
      const key = normalizeCliente(row);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    }
    return Array.from(map.values());
  }

  function getUniqueRows(rows: any[], keys: string[]): any[] {
    const map = new Map();
    for (const row of rows) {
      const id = keys.map((k: string) => (row[k] || '').toString().trim()).join('|');
      if (!map.has(id) || Object.values(row).filter(Boolean).length > Object.values(map.get(id)).filter(Boolean).length) {
        map.set(id, row);
      }
    }
    return Array.from(map.values());
  }

  const gruposClientes = Array.isArray(resultData) ? groupByCliente(resultData) : [];
  const [paginaCliente, setPaginaCliente] = useState(0);
  useEffect(() => { setPaginaCliente(0); }, [resultData]);
  const clienteAtual = gruposClientes[paginaCliente] || [];

  // Em Informações Bancárias, filtrar linhas únicas do cliente atual
  const linhasBancarias = getUniqueRows(clienteAtual, ["id-banco-pagto", "id-agencia-banco", "nu-conta-corrente", "id-orgao-pagador", "cs-meio-pagto"]);
  // Em Informações do Empréstimo, filtrar linhas únicas por banco/contrato e ordenar por data_update desc
  const linhasEmprestimo = getUniqueRows(clienteAtual, ["id-banco-empres", "id-contrato-empres"]).sort((a: any, b: any) => {
    const dA = new Date(a["data_update"]);
    const dB = new Date(b["data_update"]);
    const timeA = isNaN(dA.getTime()) ? 0 : dA.getTime();
    const timeB = isNaN(dB.getTime()) ? 0 : dB.getTime();
    return timeB - timeA;
  });

  // Em Endereço, filtrar linhas únicas do cliente atual
  const linhasEnderecos = getUniqueRows(clienteAtual, ["endereco", "bairro", "municipio", "uf", "cep"]);

  // Buscar nomes de bancos únicos do cliente atual
  useEffect(() => {
    if (Array.isArray(clienteAtual)) {
      // Bancos Pagamento
      const codigosPagto = Array.from(new Set(clienteAtual.map(r => (r["id-banco-pagto"] || '').toString().trim()).filter(Boolean)));
      codigosPagto.forEach(cod => {
        // Se já buscou e deu erro, não busca de novo
        if (nomesBancoPagamento[cod] === "-" || nomesBancoPagamento[cod] === "") return;
        if (!nomesBancoPagamento[cod]) {
          fetch(`https://brasilapi.com.br/api/banks/v1/${cod}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => {
              if (!d || d.type === "BANK_CODE_NOT_FOUND") {
                setNomesBancoPagamento(prev => ({ ...prev, [cod]: "-" }));
              } else {
                setNomesBancoPagamento(prev => ({ ...prev, [cod]: d?.name || "-" }));
              }
            })
            .catch(() => setNomesBancoPagamento(prev => ({ ...prev, [cod]: "-" })));
        }
      });
      // Bancos Empréstimo
      const codigosEmp = Array.from(new Set(clienteAtual.map(r => (r["id-banco-empres"] || '').toString().trim()).filter(Boolean)));
      codigosEmp.forEach(cod => {
        // Se já buscou e deu erro, não busca de novo
        if (nomesBancoEmprestimo[cod] === "-" || nomesBancoEmprestimo[cod] === "") return;
        if (!nomesBancoEmprestimo[cod]) {
          fetch(`https://brasilapi.com.br/api/banks/v1/${cod}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => {
              if (!d || d.type === "BANK_CODE_NOT_FOUND") {
                setNomesBancoEmprestimo(prev => ({ ...prev, [cod]: "-" }));
              } else {
                setNomesBancoEmprestimo(prev => ({ ...prev, [cod]: d?.name || "-" }));
              }
            })
            .catch(() => setNomesBancoEmprestimo(prev => ({ ...prev, [cod]: "-" })));
        }
      });
    }
  }, [clienteAtual]);

  // --- ESTADO PARA SANFONA DE ANOS ---
  const [anosAbertos, setAnosAbertos] = useState<{ [ano: string]: boolean }>({});
  // Agrupar linhasEmprestimo por ano de data_update
  function agruparPorAnoEmprestimo(linhas: any[]) {
    const grupos: { [ano: string]: any[] } = {};
    linhas.forEach(row => {
      const d = new Date(row["data_update"]);
      const ano = isNaN(d.getTime()) ? "-" : d.getFullYear().toString();
      if (!grupos[ano]) grupos[ano] = [];
      grupos[ano].push(row);
    });
    return grupos;
  }
  const gruposEmprestimoPorAno = agruparPorAnoEmprestimo(linhasEmprestimo);
  const anosOrdenados = Object.keys(gruposEmprestimoPorAno).sort((a, b) => b.localeCompare(a));

  // Só inicializa anos abertos quando mudar o conjunto de anos
  const anosString = anosOrdenados.join(',');
  const [anosSnapshot, setAnosSnapshot] = useState(anosString);
  useEffect(() => {
    if (anosString !== anosSnapshot) {
      // Novo conjunto de anos, abre só o mais recente
      const maisRecente = anosOrdenados[0];
      setAnosAbertos({ [maisRecente]: true });
      setAnosSnapshot(anosString);
    }
  }, [anosString, anosSnapshot, anosOrdenados]);

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <DashboardHeader title="Consulta Individual (Maciça)" />
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-4xl mx-auto grid gap-6">
          <motion.div className="flex gap-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {[
              {
                icon: <DollarSign size={20} className="text-primary-600" />,
                title: "Total Carregado",
                value: accountLimits?.total_loaded ?? (isLoadingLimits ? "..." : 0),
                subtitle: "Créditos carregados",
              },
              {
                icon: <CreditCard size={20} className="text-primary-600" />,
                title: "Disponível",
                value: accountLimits?.available_limit ?? (isLoadingLimits ? "..." : 0),
                subtitle: "Créditos disponíveis",
              },
              {
                icon: <Activity size={20} className="text-primary-600" />,
                title: "Consultas",
                value: accountLimits?.queries_performed ?? (isLoadingLimits ? "..." : 0),
                subtitle: "Total consultas",
              },
              {
                icon: <UserIcon size={20} className="text-primary-600" />,
                title: "Login",
                value: user?.username || accountLimits?.login || "",
                subtitle: "Usuário logado",
              },
            ].map((c, i) => (
              <div key={i} className="flex-1 bg-white border border-neutral-200 rounded-xl shadow p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-primary-100 rounded-lg">{c.icon}</div>
                  <h3 className="font-semibold">{c.title}</h3>
                </div>
                <p className="text-2xl font-bold">{c.value}</p>
                <p className="text-sm text-neutral-500">{c.subtitle}</p>
              </div>
            ))}
          </motion.div>

          <motion.div className="bg-white border border-neutral-200 rounded-xl shadow p-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Alerta vermelho */}
            {showRedAlert && (
              <div className="mb-4 p-3 rounded bg-red-100 border border-red-300 text-red-700 text-center font-medium transition-opacity duration-500">
                {redAlertMsg}
              </div>
            )}
            {/* Alerta amarelo */}
            {showYellowAlert && (
              <div className="mb-4 p-3 rounded bg-yellow-100 border border-yellow-300 text-yellow-800 text-center font-medium transition-opacity duration-500">
                Nenhuma consulta será descontada aqui. <br></br>
                Você pode consultar CPF ou Número do Benefício individualmente. Somente <i><b>um</b></i> é necessário.
              </div>
            )}
            <h2 className="text-2xl font-semibold text-center mb-8">Consulta Individual (Maciça)</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="cpf" className="block text-sm font-medium text-neutral-700 mb-1">
                  CPF
                </label>
                <InputMask id="cpf" mask="999.999.999-99" value={cpf} onChange={e => setCpf(e.target.value)} className={`europa-input ${errors.cpf ? "border-error-500" : ""}`} placeholder="000.000.000-00" />
                {errors.cpf && <p className="mt-1 text-sm text-error-500">{errors.cpf}</p>}
              </div>
              {/* Ícone E/OU entre os campos */}
              <div className="flex justify-center" style={{ paddingTop: '22px', marginTop: '-5px', marginBottom: '-30px' }}>
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400">
                  <MoveVertical size={28} className="text-white" />
                </span>
              </div>
              <div className="mt-0">
                <label htmlFor="nb" className="block text-sm font-medium text-neutral-700 mb-1">
                  Número do Benefício
                </label>
                <InputMask id="nb" mask="999.999.999-9" value={nb} onChange={e => setNb(e.target.value)} className="europa-input" placeholder="000.000.000-0" />
              </div>
              <Button type="submit" variant="primary" fullWidth disabled={isSearching} icon={isSearching ? <LoadingSpinner size="sm" /> : <Search size={18} />}>
                {isSearching ? "Pesquisando..." : "Pesquisar"}
              </Button>
            </form>
          </motion.div>

          {/* Renderização dos resultados */}
          {!showRedAlert && (() => {
            if (gruposClientes.length === 0) {
              if (!buscou) return null;
              return <div className="text-center text-neutral-500 py-12">Nenhum resultado encontrado para o período selecionado.</div>;
            }
            // Renderizar apenas UM cliente por vez (clienteAtual)
            const cliente = clienteAtual;
            if (!cliente || cliente.length === 0) return null;
            // Dados básicos do cliente (primeira linha)
            const row = cliente[0];
            return (
              <>
                {/* Botões IN100, FGTS + Paginação de clientes */}
                <div className="flex flex-wrap justify-center items-center gap-4 mb-4">
                  {/* Paginação de clientes */}
                  {gruposClientes.length > 1 && (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setPaginaCliente(paginaCliente === 0 ? gruposClientes.length - 1 : paginaCliente - 1)} className="p-2 rounded-full border border-neutral-300 hover:bg-neutral-100" aria-label="Anterior">
                        <ChevronLeft size={20} />
                      </button>
                      <span className="text-sm text-neutral-700 font-medium min-w-[48px] text-center">{paginaCliente + 1} de {gruposClientes.length} — {clienteAtual[0]?.["nome segurado"]}</span>
                      <button type="button" onClick={() => setPaginaCliente(paginaCliente === gruposClientes.length - 1 ? 0 : paginaCliente + 1)} className="p-2 rounded-full border border-neutral-300 hover:bg-neutral-100" aria-label="Próximo">
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  )}
                  {/* Botão IN100 */}
                  <button type="button" className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white border border-blue-500 text-blue-600 font-semibold shadow-sm hover:bg-blue-50 transition-colors" onClick={handleIN100Consultar}>
                    <FileText size={16} className="mr-1" /> IN100
                  </button>
                  {/* Botão FGTS */}
                  <button type="button" className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white border border-green-500 text-green-600 font-semibold shadow-sm hover:bg-green-50 transition-colors" onClick={() => {
                    const nome = clienteAtual[0] ? clienteAtual[0]["nome segurado"] : "";
                    const cpf = clienteAtual[0] ? clienteAtual[0]["nu_cpf_tratado"] : "";
                    const url = `/dashboard/consulta-fgts?nome=${encodeURIComponent(nome)}&cpf=${encodeURIComponent(cpf)}`;
                    window.open(url, '_blank');
                  }}>
                    <DollarSign size={16} className="mr-1" /> FGTS
                  </button>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={paginaCliente}
                    className="space-y-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {/* Informações Básicas */}
                        <div className="bg-white border border-neutral-200 rounded-xl shadow p-6 relative">
                          <h4 className="font-semibold mb-4">Informações Básicas</h4>
                          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                            <div>
                              <dt className="text-sm text-neutral-500">Nome:</dt>
                              <dd className="font-medium">{row["nome segurado"] || "-"}</dd>
                            </div>
                            {row["nb_tratado"] > 0 && (
                              <div className="flex items-center gap-2">
                                <dt className="text-sm text-neutral-500">NB:</dt>
                                <div className="flex flex-row items-center">
                                  <dd className="font-medium mb-0">{row["nb_tratado"].toString().replace(/(\d{3})(\d{3})(\d{3})(\d{1})/, "$1.$2.$3-$4")}</dd>
                                  <button type="button" className="ml-2 p-1 rounded hover:bg-neutral-100 flex items-center" style={{lineHeight:0}} onClick={async () => {
                                    if (copiandoNB !== 'idle') return;
                                    setCopiandoNB('loading');
                                    navigator.clipboard.writeText(row["nb_tratado"].toString());
                                    await new Promise(r => setTimeout(r, 100));
                                    setCopiandoNB('done');
                                    await new Promise(r => setTimeout(r, 200));
                                    setCopiandoNB('idle');
                                    toast.success("NB copiado!");
                                  }}>
                                    {copiandoNB === 'idle' && <Clipboard size={16} className="text-neutral-400 hover:text-neutral-600" />}
                                    {copiandoNB === 'loading' && <span className="inline-block w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />}
                                    {copiandoNB === 'done' && <Check size={16} className="text-green-600" />}
                                  </button>
                                </div>
                              </div>
                            )}
                            {row["nu_cpf_tratado"] > 0 && (
                              <div className="flex items-center gap-2">
                                <dt className="text-sm text-neutral-500">CPF:</dt>
                                <div className="flex flex-row items-center">
                                  <dd className="font-medium mb-0">{row["nu_cpf_tratado"].toString().replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}</dd>
                                  <button type="button" className="ml-2 p-1 rounded hover:bg-neutral-100 flex items-center" style={{lineHeight:0}} onClick={async () => {
                                    if (copiandoCPF !== 'idle') return;
                                    setCopiandoCPF('loading');
                                    navigator.clipboard.writeText(row["nu_cpf_tratado"].toString());
                                    await new Promise(r => setTimeout(r, 100));
                                    setCopiandoCPF('done');
                                    await new Promise(r => setTimeout(r, 200));
                                    setCopiandoCPF('idle');
                                    toast.success("CPF copiado!");
                                  }}>
                                    {copiandoCPF === 'idle' && <Clipboard size={16} className="text-neutral-400 hover:text-neutral-600" />}
                                    {copiandoCPF === 'loading' && <span className="inline-block w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />}
                                    {copiandoCPF === 'done' && <Check size={16} className="text-green-600" />}
                                  </button>
                                </div>
                              </div>
                            )}
                            <div>
                              <dt className="text-sm text-neutral-500">Espécie:</dt>
                              <dd className="font-medium">{row["esp"] || "-"}</dd>
                            </div>
                            <div>
                              <dt className="text-sm text-neutral-500">Data de Nascimento:</dt>
                              <dd className="font-medium">{formatDateBR(row["dt_nascimento_tratado"])}</dd>
                            </div>
                            <div>
                              <dt className="text-sm text-neutral-500">Idade:</dt>
                              <dd className="font-medium">{row["idade"] || "-"}</dd>
                            </div>
                          </dl>
                        </div>
                        {/* Endereço */}
                        <div className="bg-white border border-neutral-200 rounded-xl shadow p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold">Endereço</h4>
                          </div>
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr>
                                <th className="px-2 py-1 text-left">Endereço</th>
                                <th className="px-2 py-1 text-left">Bairro</th>
                                <th className="px-2 py-1 text-left">Município</th>
                                <th className="px-2 py-1 text-left">UF</th>
                                <th className="px-2 py-1 text-left">CEP</th>
                              </tr>
                            </thead>
                            <tbody>
                              {linhasEnderecos.map((row: any, idx: number) => (
                                <tr key={idx} className="border-t">
                                  <td className="px-2 py-1">{row["endereco"] || "-"}</td>
                                  <td className="px-2 py-1">{row["bairro"] || "-"}</td>
                                  <td className="px-2 py-1">{row["municipio"] || "-"}</td>
                                  <td className="px-2 py-1">{row["uf"] || "-"}</td>
                                  <td className="px-2 py-1">{row["cep"] || "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {/* Informações Bancárias */}
                        <div className="bg-white border border-neutral-200 rounded-xl shadow p-6 max-w-4xl mx-auto w-full">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold">Informações Bancárias</h4>
                          </div>
                          <div className="overflow-x-auto w-full">
                            <table className="min-w-[1200px] text-sm">
                              <thead>
                                <tr>
                                  <th className="px-2 py-1 text-left">Banco Pagamento</th>
                                  <th className="px-2 py-1 text-left">Nome do Banco</th>
                                  <th className="px-2 py-1 text-left">Agência Pagamento</th>
                                  <th className="px-2 py-1 text-left">Conta Corrente</th>
                                  <th className="px-2 py-1 text-left">Órgão Pagador</th>
                                  <th className="px-2 py-1 text-left">Meio de Pagamento</th>
                                </tr>
                              </thead>
                              <tbody>
                                {linhasBancarias.map((row, idx) => (
                                  <tr key={idx} className="border-t">
                                    <td className="px-2 py-1">{row["id-banco-pagto"] || "-"}</td>
                                    <td className="px-2 py-1">{nomesBancoPagamento[row["id-banco-pagto"]?.toString().trim()] || '-'}</td>
                                    <td className="px-2 py-1">{row["id-agencia-banco"] || "-"}</td>
                                    <td className="px-2 py-1">{row["nu-conta-corrente"] || "-"}</td>
                                    <td className="px-2 py-1">{row["id-orgao-pagador"] || "-"}</td>
                                    <td className="px-2 py-1">{row["cs-meio-pagto"] || "-"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        {/* Informações do Empréstimo */}
                        <div className="bg-white border border-neutral-200 rounded-xl shadow p-6 max-w-4xl mx-auto w-full">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold">Informações do Empréstimo</h4>
                          </div>
                          {/* SANFONA POR ANO */}
                          {anosOrdenados.map(ano => (
                            <div key={ano} className="mb-2 border rounded-lg overflow-hidden">
                              <button
                                type="button"
                                className="w-full flex items-center justify-between px-4 py-2 bg-neutral-100 hover:bg-neutral-200 font-semibold text-left text-lg transition-colors"
                                onClick={() => setAnosAbertos(prev => ({ ...prev, [ano]: !prev[ano] }))}
                              >
                                <span>{anosOrdenados.length > 1 ? ano : `Ano: ${ano}`}</span>
                                <span>{anosAbertos[ano] ? (
                                  <svg width="18" height="18" viewBox="0 0 20 20"><path d="M6 8l4 4 4-4" stroke="#222" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
                                ) : (
                                  <svg width="18" height="18" viewBox="0 0 20 20"><path d="M8 6l4 4-4 4" stroke="#222" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
                                )}</span>
                              </button>
                              <AnimatePresence initial={false}>
                                {anosAbertos[ano] && (
                                  <motion.div
                                    key={"conteudo-" + ano}
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                                    style={{ overflow: 'hidden', width: '100%' }}
                                  >
                                    <div className="overflow-x-auto w-full">
                                      <table className="min-w-[1200px] text-sm">
                                        <thead>
                                          <tr>
                                            <th className="px-2 py-1 text-left">Banco Empréstimo</th>
                                            <th className="px-2 py-1 text-left">Nome do Banco</th>
                                            <th className="px-2 py-1 text-left">Contrato Empréstimo</th>
                                            <th className="px-2 py-1 text-left">Parcelas Pagas</th>
                                            <th className="px-2 py-1 text-left">Parcelas Restantes</th>
                                            <th className="px-2 py-1 text-left">Qtd Parcelas</th>
                                            <th className="px-2 py-1 text-left">Valor Benefício</th>
                                            <th className="px-2 py-1 text-left">Valor Parcela</th>
                                            <th className="px-2 py-1 text-left">Valor Empréstimo</th>
                                            <th className="px-2 py-1 text-left">Taxa</th>
                                            <th className="px-2 py-1 text-left">Início Desconto</th>
                                            <th className="px-2 py-1 text-left">Fim Desconto</th>
                                            <th className="px-2 py-1 text-left">Data Atualização</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {gruposEmprestimoPorAno[ano].map((row: any, idx: number) => (
                                            <tr key={idx} className="border-t">
                                              <td className="px-2 py-1">{row["id-banco-empres"] || "-"}</td>
                                              <td className="px-2 py-1">{nomesBancoEmprestimo[row["id-banco-empres"]?.toString().trim()] || '-'}</td>
                                              <td className="px-2 py-1">{row["id-contrato-empres"] || "-"}</td>
                                              <td className="px-2 py-1">{row["pagas"] || "-"}</td>
                                              <td className="px-2 py-1">{row["restantes"] || "-"}</td>
                                              <td className="px-2 py-1">{row["quant_parcelas_tratado"] || "-"}</td>
                                              <td className="px-2 py-1">{formatCurrencyBR(row["vl_beneficio_tratado"])} </td>
                                              <td className="px-2 py-1">{formatCurrencyBR(row["vl_parcela_tratado"])} </td>
                                              <td className="px-2 py-1">{formatCurrencyBR(row["vl_empres_tratado"])} </td>
                                              <td className="px-2 py-1">{formatPercentBR(row["taxa"])} </td>
                                              <td className="px-2 py-1">{formatDateBR(row["comp_ini_desconto_tratado"])} </td>
                                              <td className="px-2 py-1">{formatDateBR(row["comp_fim_desconto_tratado"])} </td>
                                              <td className="px-2 py-1">{formatDateBR(row["data_update"])} </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}
                        </div>
                  </motion.div>
                </AnimatePresence>
                {/* Remover a paginação do final */}
                {/* {gruposClientes.length > 1 && (
                  <div className="flex justify-center items-center mb-6 gap-2">
                    ...
                  </div>
                )} */}
              </>
            );
          })()}
        </div>
      </div>
      {/* Modal IN100 */}
      {false && (
        <AnimatePresence>
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Modal removido, não será exibido */}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default ConsultaFGTS;

