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
  const [contratoIdx, setContratoIdx] = useState(0);
  const [endIdx, setEndIdx] = useState(0);
  const [bankIdx, setBankIdx] = useState(0);

  // Estado para nomes dos bancos
  const [nomeBancoPagamento, setNomeBancoPagamento] = useState<string>("");
  const [nomeBancoEmprestimo, setNomeBancoEmprestimo] = useState<string>("");

  // Estado para evitar toast duplicado
  const [erroClienteMostrado, setErroClienteMostrado] = useState(false);

  // Mensagem de erro temporária
  const [showRedAlert, setShowRedAlert] = useState(false);
  const [redAlertMsg, setRedAlertMsg] = useState("");

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
      const row = resultData[contratoIdx];
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
      // Banco Empréstimo
      const codBancoEmp = row["id-banco-empres"];
      if (codBancoEmp) {
        fetch(`https://brasilapi.com.br/api/banks/v1/${codBancoEmp}`)
          .then(r => r.ok ? r.json() : null)
          .then(d => setNomeBancoEmprestimo(d?.name || ""))
          .catch(() => setNomeBancoEmprestimo(""));
      } else {
        setNomeBancoEmprestimo("");
      }
    }
  }, [contratoIdx, resultData]);

  const validateCPF = (v: string) => v.replace(/\D/g, "").length === 11;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  // Função para formatar datas para dd/mm/aaaa
  function formatDateBR(dateStr?: string) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("pt-BR");
  }
  function formatCurrencyBR(value: any) {
    const n = Number(value);
    if (isNaN(n)) return "-";
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const res = await fetch(`${API_BASE}${endpoint}`, {
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
        setRedAlertMsg('Cliente não existe ou não foi encontrado.');
        setShowRedAlert(true);
        setErroClienteMostrado(true);
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
          {(() => {
            if (Array.isArray(resultData)) {
              // Se vier array vazio ou só com objetos vazios
              if ((resultData.length === 0 || resultData.every(obj => Object.keys(obj).length === 0))) {
                return null;
              }
              if (resultData.length > 0) {
              // Simulação: se no futuro vier arrays para endereço/banco, adapte aqui
              // Por enquanto, cada contrato tem 1 endereço/banco, mas já preparado para múltiplos
              const contratos = resultData;
              const row: Record<string, any> = contratos[contratoIdx];
              // Mock para múltiplos endereços/bancos (substitua por row.enderecos, row.bancos se vier assim do back)
              const enderecos = [row];
              const bancos = [row];
              // Se vier arrays reais, use: const enderecos = row.enderecos || [row];
              // const bancos = row.bancos || [row];
              const endereco = enderecos[endIdx];
              const banco = bancos[bankIdx];
              return (
                <>
                  {/* Paginação geral no topo */}
                  {contratos.length > 1 && (
                    <div className="flex justify-end items-center mb-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setContratoIdx(contratoIdx === 0 ? contratos.length - 1 : contratoIdx - 1)}
                        className="p-2 rounded-full border border-neutral-300 hover:bg-neutral-100"
                        aria-label="Anterior"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <span className="text-sm text-neutral-700 font-medium min-w-[48px] text-center">{contratoIdx + 1} de {contratos.length}</span>
                      <button
                        type="button"
                        onClick={() => setContratoIdx(contratoIdx === contratos.length - 1 ? 0 : contratoIdx + 1)}
                        className="p-2 rounded-full border border-neutral-300 hover:bg-neutral-100"
                        aria-label="Próximo"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  )}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={contratoIdx}
                      className="space-y-6"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                  {/* Informações Básicas */}
                  <div className="bg-white border border-neutral-200 rounded-xl shadow p-6">
                    <h4 className="font-semibold mb-4">Informações Básicas</h4>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                      <div>
                        <dt className="text-sm text-neutral-500">Nome:</dt>
                        <dd className="font-medium">{row["nome segurado"] || "-"}</dd>
                      </div>
                      {row["nb_tratado"] > 0 && (
                        <div>
                          <dt className="text-sm text-neutral-500">NB:</dt>
                          <dd className="font-medium">{row["nb_tratado"]}</dd>
                        </div>
                      )}
                      {row["nu_cpf_tratado"] > 0 && (
                        <div>
                          <dt className="text-sm text-neutral-500">CPF:</dt>
                          <dd className="font-medium">{row["nu_cpf_tratado"]}</dd>
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
                      <div>
                        <dt className="text-sm text-neutral-500">Data Atualização:</dt>
                        <dd className="font-medium text-green-600">{formatDateBR(row["data_update"])}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  {/* Endereço */}
                  <div className="bg-white border border-neutral-200 rounded-xl shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold">Endereço</h4>
                    </div>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                      <div>
                        <dt className="text-sm text-neutral-500">Endereço:</dt>
                        <dd className="font-medium">{endereco["endereco"] || "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Bairro:</dt>
                        <dd className="font-medium">{endereco["bairro"] || "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Município:</dt>
                        <dd className="font-medium">{endereco["municipio"] || "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">UF:</dt>
                        <dd className="font-medium">{endereco["uf"] || "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">CEP:</dt>
                        <dd className="font-medium">{endereco["cep"] || "-"}</dd>
                      </div>
                    </dl>
                  </div>

                  {/* Informações Bancárias */}
                  <div className="bg-white border border-neutral-200 rounded-xl shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold">Informações Bancárias</h4>
                    </div>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                      <div>
                        <dt className="text-sm text-neutral-500">Banco Pagamento:</dt>
                        <dd className="font-medium">{banco["id-banco-pagto"] || "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Nome do Banco:</dt>
                        <dd className="font-medium">{nomeBancoPagamento || '-'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Agência Pagamento:</dt>
                        <dd className="font-medium">{banco["id-agencia-banco"] || "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Conta Corrente:</dt>
                        <dd className="font-medium">{banco["nu-conta-corrente"] || "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Órgão Pagador:</dt>
                        <dd className="font-medium">{banco["id-orgao-pagador"] || "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Meio de Pagamento:</dt>
                        <dd className="font-medium">{banco["cs-meio-pagto"] || "-"}</dd>
                      </div>
                    </dl>
                  </div>

                  {/* Informações do Empréstimo */}
                  <div className="bg-white border border-neutral-200 rounded-xl shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold">Informações do Empréstimo</h4>
                    </div>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                      <div>
                        <dt className="text-sm text-neutral-500">Banco Empréstimo:</dt>
                        <dd className="font-medium">{row["id-banco-empres"] || "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Nome do Banco:</dt>
                        <dd className="font-medium">{nomeBancoEmprestimo || '-'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Contrato Empréstimo:</dt>
                        <dd className="font-medium">{row["id-contrato-empres"] || "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Parcelas Pagas:</dt>
                        <dd className="font-medium">{row["pagas"] || "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Parcelas Restantes:</dt>
                        <dd className="font-medium">{row["restantes"] || "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Qtd Parcelas:</dt>
                        <dd className="font-medium">{row["quant_parcelas_tratado"] || "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Valor Benefício:</dt>
                        <dd className="font-medium">{formatCurrencyBR(row["vl_beneficio_tratado"])} </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Valor Parcela:</dt>
                        <dd className="font-medium">{formatCurrencyBR(row["vl_parcela_tratado"])} </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Valor Empréstimo:</dt>
                        <dd className="font-medium">{formatCurrencyBR(row["vl_empres_tratado"])} </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Início Desconto:</dt>
                        <dd className="font-medium">{formatDateBR(row["comp_ini_desconto_tratado"])}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Fim Desconto:</dt>
                        <dd className="font-medium">{formatDateBR(row["comp_fim_desconto_tratado"])}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </motion.div>
                </AnimatePresence>
                </>
              );
            }
            } else if (resultData && typeof resultData === 'object') {
              // Se vier objeto vazio
              if (Object.keys(resultData).length === 0) {
                return null;
              }
              const row: Record<string, any> = resultData;
              // Verificação de cliente não encontrado
              const camposPrincipais = [
                row["nome segurado"],
                row["nb_tratado"],
                row["nu_cpf_tratado"],
                row["esp"],
                row["dt_nascimento_tratado"],
                row["idade"]
              ];
              const todosZerados = camposPrincipais.every(v => !v || v === 0 || v === "0");
              if (todosZerados) {
                return null;
              }
              return (
                <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  {/* Informações Básicas */}
                  <div className="bg-white border border-neutral-200 rounded-xl shadow p-6">
                    <h4 className="font-semibold mb-4">Informações Básicas</h4>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                      <div>
                        <dt className="text-sm text-neutral-500">Nome:</dt>
                        <dd className="font-medium">{row["nome segurado"] || "-"}</dd>
                      </div>
                      {row["nb_tratado"] > 0 && (
                        <div>
                          <dt className="text-sm text-neutral-500">NB:</dt>
                          <dd className="font-medium">{row["nb_tratado"]}</dd>
                        </div>
                      )}
                      {row["nu_cpf_tratado"] > 0 && (
                        <div>
                          <dt className="text-sm text-neutral-500">CPF:</dt>
                          <dd className="font-medium">{row["nu_cpf_tratado"]}</dd>
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
                  {/* Endereço - carrossel (aqui só 1, mas preparado para vários) */}
                  <div className="bg-white border border-neutral-200 rounded-xl shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold">Endereço</h4>
                      {/* Setas do carrossel (desabilitadas se só 1) */}
                      {/* Se quiser adicionar lógica para múltiplos endereços, basta adaptar aqui */}
                    </div>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                      <div>
                        <dt className="text-sm text-neutral-500">Endereço:</dt>
                        <dd className="font-medium">{row["endereco"] || "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Bairro:</dt>
                        <dd className="font-medium">{row["bairro"] || "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Município:</dt>
                        <dd className="font-medium">{row["municipio"] || "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">UF:</dt>
                        <dd className="font-medium">{row["uf"] || "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">CEP:</dt>
                        <dd className="font-medium">{row["cep"] || "-"}</dd>
                      </div>
                    </dl>
                  </div>

                  {/* Informações Bancárias - carrossel (aqui só 1, mas preparado para vários) */}
                  <div className="bg-white border border-neutral-200 rounded-xl shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold">Informações Bancárias</h4>
                    </div>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                      <div>
                        <dt className="text-sm text-neutral-500">Banco Pagamento:</dt>
                        <dd className="font-medium">{row["id-banco-pagto"] || "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Agência Pagamento:</dt>
                        <dd className="font-medium">{row["id-agencia-banco"] || "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Conta Corrente:</dt>
                        <dd className="font-medium">{row["nu-conta-corrente"] || "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Órgão Pagador:</dt>
                        <dd className="font-medium">{row["id-orgao-pagador"] || "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Meio de Pagamento:</dt>
                        <dd className="font-medium">{row["cs-meio-pagto"] || "-"}</dd>
                      </div>
                    </dl>
                  </div>

                  {/* Informações do Contrato - carrossel (aqui só 1, mas preparado para vários) */}
                  <div className="bg-white border border-neutral-200 rounded-xl shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold">Informações do Empréstimo</h4>
                    </div>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                      <div>
                        <dt className="text-sm text-neutral-500">Banco Empréstimo:</dt>
                        <dd className="font-medium">{row["id-banco-empres"] || "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Contrato Empréstimo:</dt>
                        <dd className="font-medium">{row["id-contrato-empres"] || "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Parcelas Pagas:</dt>
                        <dd className="font-medium">{row["pagas"] || "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Parcelas Restantes:</dt>
                        <dd className="font-medium">{row["restantes"] || "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Qtd Parcelas:</dt>
                        <dd className="font-medium">{row["quant_parcelas_tratado"] || "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Data Atualização:</dt>
                        <dd className="font-medium">{formatDateBR(row["data_update"])}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Valor Benefício:</dt>
                        <dd className="font-medium">{row["vl_beneficio_tratado"] || "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Valor Parcela:</dt>
                        <dd className="font-medium">{row["vl_parcela_tratado"] || "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Valor Empréstimo:</dt>
                        <dd className="font-medium">{row["vl_empres_tratado"] || "-"}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Início Desconto:</dt>
                        <dd className="font-medium">{formatDateBR(row["comp_ini_desconto_tratado"])}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Fim Desconto:</dt>
                        <dd className="font-medium">{formatDateBR(row["comp_fim_desconto_tratado"])}</dd>
                      </div>
                    </dl>
                  </div>
                </motion.div>
              );
            } else if (resultData === null) {
              return null;
            } else {
              return <div className="text-center text-neutral-500 py-12">Nenhum dado encontrado ou resposta inesperada da API.</div>;
            }
          })()}
        </div>
      </div>
    </div>
  );
};

export default ConsultaFGTS;
