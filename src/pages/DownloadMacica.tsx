import React, { useState, useEffect } from "react";
import DashboardHeader from "../components/DashboardHeader";
import { useAuth } from "../context/AuthContext";
import { Eye, Download as DownloadIcon, X, Loader2 } from "lucide-react";

// Variável não mais necessária - removida

// Tipos auxiliares para normalizar a resposta da API de bancos
type BancoApiItem = {
  codigo?: string | number;
  nome?: string;
  code?: string | number;
  name?: string;
};

type BancosResponse = BancoApiItem[] | { data: BancoApiItem[] };

type Banco = { codigo: string; nome: string };

// Tipagem do payload enviado ao backend quando filtra
type FilterPayload = {
  id: number;
  idadeMin: number;
  idadeMax: number;
  prazoMin: number;
  prazoMax: number;
  restantesMin: number;
  restantesMax: number;
  pagasMin: number;
  pagasMax: number;
  bancoPagamento: string[];
  bancoEmprestimo: string[];
  inicioDesconto: string;
  fimDesconto: string;
  valorEmprestimoMin: number | null;
  valorEmprestimoMax: number | null;
  valorParcelaMin: number | null;
  valorParcelaMax: number | null;
  nascimentoInicio: string;
  nascimentoFim: string;
  atualizacaoInicio: string;
  atualizacaoFim: string;
  especies: string[];
  dibInicio: string;
  dibFim: string;
  nome?: string;

};

type HistoricoItem = {
  id: string;
  createdAt: string; // ISO
  name: string;
  rowsCount: number;
  mailingId?: string | number | null;
  payload: unknown;
  isLoading?: boolean;
  isFromServer?: boolean;
};

type FiltrarResponse = {
  count?: number;
  rowsCount?: number;
  total?: number;
  rows?: unknown[];
  data?: unknown[];
  [key: string]: unknown;
};

type SavedFilterItem = {
  id?: string | number;
  filterId?: string | number;
  mailing_id?: string | number;
  nome?: string;
  name?: string;
  linhas?: number;
  count?: number;
  rowsCount?: number;
  rows_count?: number;
  created_at?: string;
  createdAt?: string;
  payload?: unknown | string;
};

type SavedPayload = {
  idadeMin?: number;
  idadeMax?: number;
  prazoMin?: number;
  prazoMax?: number;
  restantesMin?: number;
  restantesMax?: number;
  pagasMin?: number;
  pagasMax?: number;
  valorEmprestimoMin?: number | null;
  valorEmprestimoMax?: number | null;
  valorParcelaMin?: number | null;
  valorParcelaMax?: number | null;
  inicioDesconto?: string;
  fimDesconto?: string;
  nascimentoInicio?: string;
  nascimentoFim?: string;
  atualizacaoInicio?: string;
  atualizacaoFim?: string;
  dibInicio?: string;
  dibFim?: string;
  bancoPagamento?: string[];
  bancoEmprestimo?: string[];
  especies?: string[];
  nome?: string;
};

function parseQueryPayload(input: unknown): SavedPayload {
  if (!input) return {};
  console.log("parseQueryPayload input:", input);
  const payload = typeof input === 'string' ? (() => { try { return JSON.parse(input as string); } catch { return {}; } })() : input;
  console.log("parseQueryPayload parsed:", payload);
  const query = (payload as { query?: string })?.query;
  if (!query || typeof query !== 'string') return (payload as SavedPayload) || {};

  const q = query.replace(/\s+/g, ' ');
  const out: SavedPayload = {};

  const range = (re: RegExp): { min: number; max: number } | null => {
    const m = q.match(re);
    if (m) {
      const min = Number(m[1]);
      const max = Number(m[2]);
      if (!Number.isNaN(min) && !Number.isNaN(max)) return { min, max };
    }
    return null;
  };

  const takeDate = (re: RegExp): string | undefined => {
    const m = q.match(re);
    return m ? m[1] : undefined;
  };

  const takeList = (re: RegExp): string[] | undefined => {
    const m = q.match(re);
    if (!m) return undefined;
    return m[1].split(',').map(s => s.trim()).filter(Boolean);
  };

  const rIdade = range(/idade BETWEEN (\d+) AND (\d+)/i);
  if (rIdade) { out.idadeMin = rIdade.min; out.idadeMax = rIdade.max; }

  const rPrazo = range(/quant_parcelas_tratado BETWEEN (\d+) AND (\d+)/i);
  if (rPrazo) { out.prazoMin = rPrazo.min; out.prazoMax = rPrazo.max; }

  const rRest = range(/restantes BETWEEN (\d+) AND (\d+)/i);
  if (rRest) { out.restantesMin = rRest.min; out.restantesMax = rRest.max; }

  const rPagas = range(/pagas BETWEEN (\d+) AND (\d+)/i);
  if (rPagas) { out.pagasMin = rPagas.min; out.pagasMax = rPagas.max; }

  const bancosPagto = takeList(/id_banco_pagto IN \(([^)]+)\)/i);
  if (bancosPagto) out.bancoPagamento = bancosPagto;

  const bancosEmp = takeList(/id_banco_empres IN \(([^)]+)\)/i);
  if (bancosEmp) out.bancoEmprestimo = bancosEmp;

  const compIniDesc = takeDate(/comp_ini_desconto_tratado >= '(\d{4}-\d{2}-\d{2})'/i);
  if (compIniDesc) out.inicioDesconto = compIniDesc;

  const vlEmpMin = q.match(/vl_empres_tratado >= (\d+)/i);
  if (vlEmpMin) out.valorEmprestimoMin = Number(vlEmpMin[1]);

  const vlParcMin = q.match(/vl_parcela_tratado >= (\d+)/i);
  if (vlParcMin) out.valorParcelaMin = Number(vlParcMin[1]);

  const nascIni = takeDate(/dt_nascimento_tratado >= '(\d{4}-\d{2}-\d{2})'/i);
  if (nascIni) out.nascimentoInicio = nascIni;

  const updIni = takeDate(/data_update >= '(\d{4}-\d{2}-\d{2})'/i);
  if (updIni) out.atualizacaoInicio = updIni;

  const espList = takeList(/esp IN \(([^)]+)\)/i);
  if (espList) out.especies = espList;

  const dibIni = takeDate(/dib >= '(\d{4}-\d{2}-\d{2})'/i);
  if (dibIni) out.dibInicio = dibIni;

  return out;
}
type SavedFilterList = SavedFilterItem[] | { data?: SavedFilterItem[] };

type BankMultiSelectProps = {
  label: string;
  bancos: Banco[];
  selectedCodes: string[];
  onChange: (codes: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
};

function BankMultiSelect({ label, bancos, selectedCodes, onChange, disabled, placeholder = "Digite ao menos 3 caracteres..." }: BankMultiSelectProps) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function filterBanks(q: string): Banco[] {
    const term = q.trim().toLowerCase();
    const isNumeric = /^\d+$/.test(term);
    // Mínimo: 2 dígitos para código numérico; 3 caracteres para nome
    if ((isNumeric && term.length < 2) || (!isNumeric && term.length < 3)) return [];
    return bancos
      .filter(b => !selectedCodes.includes(b.codigo))
      .filter(b => {
        if (isNumeric) {
          return b.codigo.toLowerCase().includes(term);
        }
        return b.nome.toLowerCase().includes(term);
      })
      .slice(0, 20);
  }

  const suggestions = filterBanks(query);

  function addCode(code: string) {
    if (!selectedCodes.includes(code)) {
      onChange([...selectedCodes, code]);
    }
    setQuery("");
    setOpen(false);
  }

  function removeCode(code: string) {
    onChange(selectedCodes.filter(c => c !== code));
  }

  return (
    <div className="col-span-2" ref={containerRef}>
      <label className="text-xs font-medium">{label}</label>
      <div className={`europa-input w-full min-h-[42px] flex items-center gap-2 flex-wrap relative ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
        onClick={() => !disabled && setOpen(true)}>
        {/* Chips */}
        {selectedCodes.map(code => (
          <span key={code} className="px-2 py-1 text-xs rounded-full bg-neutral-200 text-neutral-800 flex items-center gap-1">
            {code}
            {!disabled && (
              <button type="button" aria-label="Remover" onClick={(e) => { e.stopPropagation(); removeCode(code); }} className="ml-1 text-neutral-600 hover:text-neutral-900">×</button>
            )}
          </span>
        ))}
        {/* Input */}
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); if (!disabled) setOpen(true); }}
          onFocus={() => !disabled && setOpen(true)}
          onKeyDown={e => {
            if (e.key === "Backspace" && query === "" && selectedCodes.length > 0) {
              removeCode(selectedCodes[selectedCodes.length - 1]);
            }
          }}
          placeholder={selectedCodes.length > 0 ? "" : placeholder}
          disabled={disabled}
          className="flex-1 min-w-[160px] outline-none border-0 focus:ring-0"
        />

        {/* Dropdown */}
        {open && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-white border border-neutral-200 rounded-lg shadow max-h-64 overflow-auto">
            {suggestions.map(b => (
              <button
                key={b.codigo}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-neutral-100"
                onClick={() => addCode(b.codigo)}
              >
                {b.codigo} - {b.nome}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-[10px] text-neutral-500 mt-1">Digite pelo menos 3 caracteres (código ou nome) e selecione. Vários códigos serão exibidos como chips.</p>
    </div>
  );
}

const DownloadMacica: React.FC = () => {
  const { user } = useAuth();
  // Estados dos filtros
  const [idadeMin, setIdadeMin] = useState(25);
  const [idadeMax, setIdadeMax] = useState(74);
  const [prazoMin, setPrazoMin] = useState(60);
  const [prazoMax, setPrazoMax] = useState(84);
  const [restantesMin, setRestantesMin] = useState(0);
  const [restantesMax, setRestantesMax] = useState(100);
  const [pagasMin, setPagasMin] = useState(0);
  const [pagasMax, setPagasMax] = useState(12);
  const [bancoPagamento, setBancoPagamento] = useState<string[]>([]);
  const [bancoEmprestimo, setBancoEmprestimo] = useState<string[]>([]);
  const [inicioDesconto, setInicioDesconto] = useState("");
  const [fimDesconto, setFimDesconto] = useState("");
  const [valorEmprestimoMin, setValorEmprestimoMin] = useState("");
  const [valorEmprestimoMax, setValorEmprestimoMax] = useState("");
  const [valorParcelaMin, setValorParcelaMin] = useState("");
  const [valorParcelaMax, setValorParcelaMax] = useState("");
  const [nascimentoInicio, setNascimentoInicio] = useState("");
  const [nascimentoFim, setNascimentoFim] = useState("");
  const [atualizacaoInicio, setAtualizacaoInicio] = useState("");
  const [atualizacaoFim, setAtualizacaoFim] = useState("");
  const [especies, setEspecies] = useState<string[]>([]);
  const [especieInput, setEspecieInput] = useState("");
  const [dibInicio, setDibInicio] = useState("");
  const [dibFim, setDibFim] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [bancos, setBancos] = useState<{ codigo: string; nome: string }[]>([]);
  const [isLoadingBancos, setIsLoadingBancos] = useState(false);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [modalItem, setModalItem] = useState<HistoricoItem | null>(null);
  const mailingSeqRef = React.useRef<number>(1);
  const [isLoadingHistorico, setIsLoadingHistorico] = useState<boolean>(false);

  // Carregar bancos ao abrir a página
  useEffect(() => {
    async function fetchBancos() {
      setIsLoadingBancos(true);
      try {
        const res = await fetch("https://n8n.sistemavieira.com.br/webhook/api/bancos");
        if (!res.ok) {
          throw new Error(`Falha ao carregar bancos: HTTP ${res.status}`);
        }
        const data: BancosResponse = await res.json();
        // Normaliza diferentes formatos da API para { codigo, nome }
        const raw: BancoApiItem[] = Array.isArray(data)
          ? data
          : (Array.isArray(data?.data) ? data.data : []);
        const normalized: Banco[] = raw
          .map((item) => ({
            codigo: String((item.codigo ?? item.code) ?? ""),
            nome: String((item.nome ?? item.name) ?? ""),
          }))
          .filter((b) => b.codigo && b.nome);
        setBancos(normalized);
      } catch (err) {
        console.error("Erro ao carregar bancos:", err);
        setBancos([]);
      } finally {
        setIsLoadingBancos(false);
      }
    }
    fetchBancos();
  }, []);

  // Função para formatar moeda
  function formatCurrencyInput(value: string) {
    const n = value.replace(/\D/g, "");
    const num = (parseInt(n, 10) / 100).toFixed(2);
    return isNaN(Number(num)) ? "" : Number(num).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  // Carregar histórico do servidor sempre que a página for acessada
  useEffect(() => {
    async function loadHistoricoFromServer() {
      // Rolar para o topo quando a página for aberta
      if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      
      setIsLoadingHistorico(true);
      try {
        const listRes = await fetch("https://n8n.sistemavieira.com.br/webhook/api/filtros-salvos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: user?.id ?? 0 })
        });
        if (!listRes.ok) throw new Error(`POST lista filtros: ${listRes.status}`);
        const listJson: SavedFilterList = await listRes.json();
        console.log("Resposta da API (filtros-salvos):", listJson);
        const items: SavedFilterItem[] = Array.isArray(listJson)
          ? listJson as SavedFilterItem[]
          : (listJson?.data ?? []);
        console.log("Items processados:", items);
        const cleaned: HistoricoItem[] = items
          .filter(detJson => Boolean(detJson?.id ?? detJson?.filterId ?? detJson?.mailing_id))
          .filter(detJson => typeof (detJson?.nome ?? detJson?.name) === 'string' && String(detJson?.nome ?? detJson?.name).trim().length > 0)
          .map((detJson) => {
            const serverId = String(detJson?.id ?? detJson?.filterId ?? detJson?.mailing_id);
            const name = String(detJson?.nome ?? detJson?.name);
            const rowsCount = Number(detJson?.rows_count ?? detJson?.linhas ?? detJson?.count ?? detJson?.rowsCount ?? 0) || 0;
            const createdAt = detJson?.created_at ?? detJson?.createdAt ?? new Date().toISOString();
            const payload = detJson?.payload;
            // Loading ativo se rows_count = 0 OU se payload = null (indicando processamento)
            // Mas NÃO se payload contém status "concluido" (parar de carregar)
            const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload || '');
            const isLoading = (rowsCount === 0 || payload === null) && !payloadStr.includes('"status":"concluido"');
            const item: HistoricoItem = {
              id: `srv-${serverId}`,
              createdAt,
              name,
              rowsCount,
              mailingId: serverId,
              payload: parseQueryPayload(payload),
              isFromServer: true,
              isLoading,
            };
            return item;
          });
        // Ordenar por data desc se possível
        cleaned.sort((a, b) => (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setHistorico(cleaned);
      } catch (e) {
        console.error("Erro ao carregar filtros salvos:", e);
      } finally {
        setIsLoadingHistorico(false);
      }
    }

    loadHistoricoFromServer();
  }, [user?.id]);

  // Recarrega histórico (uma única chamada) – usado no first load e após /filtrar
  async function refreshHistorico() {
    setIsLoadingHistorico(true);
    try {
      const listRes = await fetch("https://n8n.sistemavieira.com.br/webhook/api/filtros-salvos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user?.id ?? 0 })
      });
      if (!listRes.ok) return;
      const listJson: SavedFilterList = await listRes.json();
      console.log("Refresh histórico - Resposta da API:", listJson);
      const items: SavedFilterItem[] = Array.isArray(listJson)
        ? listJson as SavedFilterItem[]
        : (listJson?.data ?? []);
      console.log("Refresh histórico - Items processados:", items);
      const cleaned: HistoricoItem[] = items
        .filter(detJson => Boolean(detJson?.id ?? detJson?.filterId ?? detJson?.mailing_id))
        .filter(detJson => typeof (detJson?.nome ?? detJson?.name) === 'string' && String(detJson?.nome ?? detJson?.name).trim().length > 0)
        .map((detJson) => {
          const serverId = String(detJson?.id ?? detJson?.filterId ?? detJson?.mailing_id);
          const name = String(detJson?.nome ?? detJson?.name);
          const rowsCount = Number(detJson?.rows_count ?? detJson?.linhas ?? detJson?.count ?? detJson?.rowsCount ?? 0) || 0;
          const createdAt = detJson?.created_at ?? detJson?.createdAt ?? new Date().toISOString();
          const payload = detJson?.payload;
          // Loading ativo se rows_count = 0 OU se payload = null (indicando processamento)
          // Mas NÃO se payload contém status "concluido" (parar de carregar)
          const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload || '');
          const isLoading = (rowsCount === 0 || payload === null) && !payloadStr.includes('"status":"concluido"');
          return {
            id: `srv-${serverId}`,
            createdAt,
            name,
            rowsCount,
            mailingId: serverId,
            payload: parseQueryPayload(payload),
            isFromServer: true,
            isLoading,
          } as HistoricoItem;
        });
      cleaned.sort((a, b) => (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setHistorico(cleaned);
    } catch (err) {
      console.error('Erro ao atualizar histórico:', err);
    } finally {
      setIsLoadingHistorico(false);
    }
  }

  // Função para limpar todos os filtros
  function limparFiltros() {
    setIdadeMin(25);
    setIdadeMax(74);
    setPrazoMin(60);
    setPrazoMax(84);
    setRestantesMin(0);
    setRestantesMax(100);
    setPagasMin(0);
    setPagasMax(12);
    setBancoPagamento([]);
    setBancoEmprestimo([]);
    setInicioDesconto("");
    setFimDesconto("");
    setValorEmprestimoMin("");
    setValorEmprestimoMax("");
    setValorParcelaMin("");
    setValorParcelaMax("");
    setNascimentoInicio("");
    setNascimentoFim("");
    setAtualizacaoInicio("");
    setAtualizacaoFim("");
    setEspecies([]);
    setEspecieInput("");
    setDibInicio("");
    setDibFim("");
  }

  // Função para converter moeda para número
  function parseCurrencyToNumber(str: string) {
    if (!str) return null;
    return Number(str.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
  }

  function extractRowsCount(data: FiltrarResponse | unknown): number {
    const obj = (data ?? {}) as FiltrarResponse;
    if (Array.isArray(obj)) return (obj as unknown[]).length as number;
    if (Array.isArray(obj.rows)) return obj.rows.length;
    if (typeof obj.count === "number") return obj.count;
    if (typeof obj.rowsCount === "number") return obj.rowsCount;
    if (typeof obj.total === "number") return obj.total;
    if (Array.isArray(obj.data)) return obj.data.length;
    return 0;
  }

  function extractMailingId(data: FiltrarResponse | unknown): string | number | null {
    const obj = (data ?? {}) as Record<string, unknown>;
    const candidates = [
      obj["mailingId"],
      obj["mailing_id"],
      obj["mailingID"],
      obj["id"],
      obj["filterId"],
      obj["filter_id"],
    ];
    const found = candidates.find((v) => typeof v === "string" || typeof v === "number");
    return (found as string | number | undefined) ?? null;
  }

  function generateFilterName(p: FilterPayload): string {
    const parts: string[] = [];
    parts.push(`Idade ${p.idadeMin}-${p.idadeMax}`);
    parts.push(`Prazo ${p.prazoMin}-${p.prazoMax}`);
    parts.push(`Rest ${p.restantesMin}-${p.restantesMax}`);
    parts.push(`Pagas ${p.pagasMin}-${p.pagasMax}`);
    if (p.bancoPagamento.length > 0) parts.push(`Pag ${p.bancoPagamento.length} bancos`);
    if (p.bancoEmprestimo.length > 0) parts.push(`Emp ${p.bancoEmprestimo.length} bancos`);
    if (p.especies.length > 0) parts.push(`Espécies ${p.especies.join(',')}`);
    return parts.join(" | ");
  }

  function downloadItem(item: HistoricoItem) {
    const filename = `filtro-${new Date(item.createdAt).toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
    const blob = new Blob([JSON.stringify(item.payload ?? {}, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // (função não usada removida)

  // Função para filtrar
  async function filtrar() {
    if (!user) return;
    // Rolar para o topo ao iniciar a filtragem
    if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setIsLoading(true);
    const payload: FilterPayload = {
      id: user.id,
      idadeMin,
      idadeMax,
      prazoMin,
      prazoMax,
      restantesMin,
      restantesMax,
      pagasMin,
      pagasMax,
      bancoPagamento,
      bancoEmprestimo,
      inicioDesconto,
      fimDesconto,
      valorEmprestimoMin: parseCurrencyToNumber(valorEmprestimoMin),
      valorEmprestimoMax: parseCurrencyToNumber(valorEmprestimoMax),
      valorParcelaMin: parseCurrencyToNumber(valorParcelaMin),
      valorParcelaMax: parseCurrencyToNumber(valorParcelaMax),
      nascimentoInicio,
      nascimentoFim,
      atualizacaoInicio,
      atualizacaoFim,
      especies,
      dibInicio,
      dibFim,

    };
    // Cria a linha de loading imediatamente
    const name = generateFilterName(payload);
    const rowKey = (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
    const provisionalId = mailingSeqRef.current++;
    const pendingItem: HistoricoItem = {
      id: rowKey,
      createdAt: new Date().toISOString(),
      name,
      rowsCount: 0,
      mailingId: provisionalId,
      payload: { ...payload, nome: name },
      isLoading: true,
      isFromServer: false,
    };
    setHistorico(prev => [pendingItem, ...prev]);

    try {
      // Faz a requisição
      const res = await fetch("https://n8n.sistemavieira.com.br/webhook/api/filtrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, nome: name }),
      });
      const data: FiltrarResponse = await res.json();
      console.log("Resposta da API (filtrar):", data);
      const rowsCount = extractRowsCount(data);
      const maybeMailing = extractMailingId(data);
      // Persistir o filtro no backend (POST /api/filtros-salvos)
      try {
        await fetch("https://n8n.sistemavieira.com.br/webhook/api/filtros-salvos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: (maybeMailing ?? provisionalId),
            nome: name,
            linhas: rowsCount,
            payload: { ...payload, nome: name },
          }),
        });
      } catch (err) {
        console.error('Erro ao salvar filtro:', err);
      }

      // Atualiza a linha pendente com os dados retornados da própria /filtrar
      setHistorico(prev => prev.map(h => h.id === rowKey ? {
        ...h,
        rowsCount,
        mailingId: (maybeMailing ?? h.mailingId),
        isLoading: false,
      } : h));
      // Em seguida, recarrega do servidor (uma única chamada POST)
      await refreshHistorico();
      // Aqui depois você pode setar o resultado para exibir na tabela
    } catch (err) {
      console.error("Erro ao filtrar:", err);
      // Remove a linha pendente em caso de erro, mantendo a tabela limpa
      setHistorico(prev => prev.filter(h => h.id !== rowKey));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <DashboardHeader title="Extração (Maciça)" />
      <div className="flex flex-1 px-8 py-8 gap-6 max-w-[1800px] mx-auto w-full">
        {/* keyframes locais para a barra indeterminada */}
        <style>{`
          @keyframes progressLoop { 0% { transform: translateX(-100%);} 100% { transform: translateX(300%);} }
        `}</style>
        {/* Filtros */}
        <div className="bg-white border border-neutral-200 rounded-xl shadow p-6 w-[420px] min-w-[320px] max-w-[440px] flex flex-col gap-4">
          <h3 className="text-lg font-semibold mb-2">Filtros</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium">Idade Min</label>
              <input type="number" min={0} max={150} value={idadeMin} onChange={e => setIdadeMin(Number(e.target.value))} className="europa-input w-full" />
            </div>
            <div>
              <label className="text-xs font-medium">Idade Max</label>
              <input type="number" min={0} max={150} value={idadeMax} onChange={e => setIdadeMax(Number(e.target.value))} className="europa-input w-full" />
            </div>
            <div>
              <label className="text-xs font-medium">Prazo Min</label>
              <input type="number" min={0} max={200} value={prazoMin} onChange={e => setPrazoMin(Number(e.target.value))} className="europa-input w-full" />
            </div>
            <div>
              <label className="text-xs font-medium">Prazo Max</label>
              <input type="number" min={0} max={200} value={prazoMax} onChange={e => setPrazoMax(Number(e.target.value))} className="europa-input w-full" />
            </div>
            <div>
              <label className="text-xs font-medium">Restantes Min</label>
              <input type="number" min={0} max={200} value={restantesMin} onChange={e => setRestantesMin(Number(e.target.value))} className="europa-input w-full" />
            </div>
            <div>
              <label className="text-xs font-medium">Restantes Max</label>
              <input type="number" min={0} max={200} value={restantesMax} onChange={e => setRestantesMax(Number(e.target.value))} className="europa-input w-full" />
            </div>
            <div>
              <label className="text-xs font-medium">Pagas Min</label>
              <input type="number" min={0} max={200} value={pagasMin} onChange={e => setPagasMin(Number(e.target.value))} className="europa-input w-full" />
            </div>
            <div>
              <label className="text-xs font-medium">Pagas Max</label>
              <input type="number" min={0} max={200} value={pagasMax} onChange={e => setPagasMax(Number(e.target.value))} className="europa-input w-full" />
            </div>
            <BankMultiSelect
              label="Banco Pagamento"
              bancos={bancos}
              selectedCodes={bancoPagamento}
              onChange={setBancoPagamento}
              disabled={isLoadingBancos}
            />
            <BankMultiSelect
              label="Banco Empréstimo"
              bancos={bancos}
              selectedCodes={bancoEmprestimo}
              onChange={setBancoEmprestimo}
              disabled={isLoadingBancos}
            />
            <div>
              <label className="text-xs font-medium">Início Desconto</label>
              <input type="date" value={inicioDesconto} onChange={e => setInicioDesconto(e.target.value)} className="europa-input w-full" />
            </div>
            <div>
              <label className="text-xs font-medium">Fim Desconto</label>
              <input type="date" value={fimDesconto} onChange={e => setFimDesconto(e.target.value)} className="europa-input w-full" />
            </div>
            <div>
              <label className="text-xs font-medium">Valor Empréstimo Min</label>
              <input type="text" inputMode="numeric" value={valorEmprestimoMin} onChange={e => setValorEmprestimoMin(formatCurrencyInput(e.target.value))} className="europa-input w-full" placeholder="R$ 0,00" />
            </div>
            <div>
              <label className="text-xs font-medium">Valor Empréstimo Max</label>
              <input type="text" inputMode="numeric" value={valorEmprestimoMax} onChange={e => setValorEmprestimoMax(formatCurrencyInput(e.target.value))} className="europa-input w-full" placeholder="R$ 0,00" />
            </div>
            <div>
              <label className="text-xs font-medium">Valor Parcela Min</label>
              <input type="text" inputMode="numeric" value={valorParcelaMin} onChange={e => setValorParcelaMin(formatCurrencyInput(e.target.value))} className="europa-input w-full" placeholder="R$ 0,00" />
            </div>
            <div>
              <label className="text-xs font-medium">Valor Parcela Max</label>
              <input type="text" inputMode="numeric" value={valorParcelaMax} onChange={e => setValorParcelaMax(formatCurrencyInput(e.target.value))} className="europa-input w-full" placeholder="R$ 0,00" />
            </div>
            <div>
              <label className="text-xs font-medium">Nascimento Início</label>
              <input type="date" value={nascimentoInicio} onChange={e => setNascimentoInicio(e.target.value)} className="europa-input w-full" />
            </div>
            <div>
              <label className="text-xs font-medium">Nascimento Fim</label>
              <input type="date" value={nascimentoFim} onChange={e => setNascimentoFim(e.target.value)} className="europa-input w-full" />
            </div>
            <div>
              <label className="text-xs font-medium">Atualização Início</label>
              <input type="date" value={atualizacaoInicio} onChange={e => setAtualizacaoInicio(e.target.value)} className="europa-input w-full" />
            </div>
            <div>
              <label className="text-xs font-medium">Atualização Fim</label>
              <input type="date" value={atualizacaoFim} onChange={e => setAtualizacaoFim(e.target.value)} className="europa-input w-full" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium">Espécie (até 2 dígitos)</label>
              <div className="europa-input w-full min-h-[42px] flex items-center gap-2 flex-wrap relative">
                {especies.map(code => (
                  <span key={code} className="px-2 py-1 text-xs rounded-full bg-neutral-200 text-neutral-800 flex items-center gap-1">
                    {code}
                    <button type="button" aria-label="Remover" onClick={() => setEspecies(especies.filter(c => c !== code))} className="ml-1 text-neutral-600 hover:text-neutral-900">×</button>
                  </span>
                ))}
                <input
                  type="text"
                  value={especieInput}
                  onChange={e => setEspecieInput(e.target.value.replace(/\D/g, '').slice(0,2))}
                  onKeyDown={e => {
                    if ((e.key === 'Tab' || e.key === 'Enter' || e.key === ',') && especieInput.length === 2) {
                      e.preventDefault();
                      if (!especies.includes(especieInput)) setEspecies([...especies, especieInput]);
                      setEspecieInput('');
                    }
                    if (e.key === 'Backspace' && especieInput === '' && especies.length > 0) {
                      setEspecies(especies.slice(0, -1));
                    }
                  }}
                  placeholder={especies.length > 0 ? '' : 'Digite 2 dígitos e pressione Tab'}
                  className="flex-1 min-w-[160px] outline-none border-0 focus:ring-0"
                  maxLength={2}
                />
              </div>
              <p className="text-[10px] text-neutral-500 mt-1">Digite 2 dígitos e pressione Tab/Enter para adicionar. Vários códigos ficarão como chips.</p>
            </div>
            <div>
              <label className="text-xs font-medium">DIB Início</label>
              <input type="date" value={dibInicio} onChange={e => setDibInicio(e.target.value)} className="europa-input w-full" />
            </div>
            <div>
              <label className="text-xs font-medium">DIB Fim</label>
              <input type="date" value={dibFim} onChange={e => setDibFim(e.target.value)} className="europa-input w-full" />
            </div>
          </div>
          {/* Botões Limpar e Filtrar */}
          <div className="flex justify-between mt-4 gap-2">
            <button type="button" onClick={limparFiltros} className="px-4 py-2 rounded-lg border border-neutral-300 text-neutral-600 font-semibold hover:bg-neutral-100 transition">Limpar</button>
            <button type="button" onClick={filtrar} disabled={isLoading} className="px-4 py-2 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 transition disabled:opacity-60 disabled:cursor-not-allowed">
              {isLoading ? "Filtrando..." : "Filtrar"}
            </button>
          </div>
        </div>
        {/* Tabela por filtro (histórico em memória) */}
        <div className="flex-1 bg-white border border-neutral-200 rounded-xl shadow p-6 min-h-[400px] overflow-auto">
          <h3 className="text-lg font-semibold mb-4">Resultados por Filtro</h3>
          <div className="w-full overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">Data</th>
                  <th className="py-2 pr-3">Nome</th>
                  <th className="py-2 pr-3">ID</th>
                  <th className="py-2 pr-3">Linhas encontradas</th>
                  <th className="py-2 pr-3">Ação</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingHistorico && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-neutral-500">Carregando filtros salvos...</td>
                  </tr>
                )}
                {!isLoadingHistorico && historico.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-neutral-400">Ainda não existe nenhum filtro solicitado</td>
                  </tr>
                )}
                {historico.map(item => (
                  <tr key={item.id} className="border-b hover:bg-neutral-50">
                    <td className="py-2 pr-3 align-top">{new Date(item.createdAt).toLocaleString("pt-BR")}</td>
                    <td className="py-2 pr-3 align-top">
                      <div className="flex items-center gap-2">
                        {item.isLoading && <Loader2 size={14} className="animate-spin text-neutral-500" />}
                        <span>{item.name}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-3 align-top">{item.mailingId ?? '-'}</td>
                    <td className="py-2 pr-3 align-top">
                      {item.isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-28 h-2 bg-neutral-200 rounded overflow-hidden relative">
                            <div className="absolute left-0 top-0 h-2 w-1/3 bg-primary-600" style={{ animation: 'progressLoop 1.2s linear infinite' }} />
                          </div>
                          <span className="text-xs text-neutral-500">
                            {item.payload === null ? 'Processando...' : 'Aguardando...'}
                          </span>
                        </div>
                      ) : (() => {
                        const payloadStr = typeof item.payload === 'string' ? item.payload : JSON.stringify(item.payload || '');
                        return payloadStr.includes('"status":"concluido"') ? (
                          <span className="text-green-600 font-medium">0 (Concluído)</span>
                        ) : (
                          item.rowsCount
                        );
                      })()}
                    </td>
                    <td className="py-2 pr-3 align-top">
                      <div className="flex items-center gap-3">
                        <button type="button" aria-label="Download" title="Download" onClick={() => downloadItem(item)} className="text-primary-600 hover:text-primary-700" disabled={item.isLoading}>
                          <DownloadIcon size={18} />
                        </button>
                        <button type="button" aria-label="Visualizar" title="Visualizar" onClick={() => setModalItem(item)} className="text-neutral-700 hover:text-neutral-900" disabled={item.isLoading}>
                          <Eye size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de visualização dos filtros */}
        {modalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={() => setModalItem(null)} />
            <div className="relative bg-white w-full max-w-4xl rounded-xl shadow-lg border border-neutral-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-lg font-semibold">Filtros aplicados</h4>
                  <p className="text-xs text-neutral-500">Mailing ID: {modalItem.mailingId ?? '-'}</p>
                </div>
                <button type="button" onClick={() => setModalItem(null)} className="text-neutral-600 hover:text-neutral-900">
                  <X size={20} />
                </button>
              </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                {(() => {
                  const payloadStr = typeof modalItem.payload === 'string' ? modalItem.payload : JSON.stringify(modalItem.payload || '');
                  if (payloadStr.includes('"status":"concluido"')) {
                    return (
                      <div className="col-span-2 text-center py-8">
                        <div className="text-green-600 text-lg font-medium mb-2">Processamento Concluído</div>
                        <p className="text-neutral-600">Este filtro foi processado com sucesso e está disponível para download.</p>
                      </div>
                    );
                  }
                  
                  return (
                    <>
                      <div className="border rounded-lg">
                        <div className="px-3 py-2 font-medium bg-neutral-50 border-b">Faixas</div>
                        <div className="p-3 space-y-2">
                          <div className="flex justify-between"><span>Idade</span><span>{(modalItem.payload as SavedPayload)?.idadeMin} a {(modalItem.payload as SavedPayload)?.idadeMax}</span></div>
                          <div className="flex justify-between"><span>Prazo</span><span>{(modalItem.payload as SavedPayload)?.prazoMin} a {(modalItem.payload as SavedPayload)?.prazoMax}</span></div>
                          <div className="flex justify-between"><span>Restantes</span><span>{(modalItem.payload as SavedPayload)?.restantesMin} a {(modalItem.payload as SavedPayload)?.restantesMax}</span></div>
                          <div className="flex justify-between"><span>Pagas</span><span>{(modalItem.payload as SavedPayload)?.pagasMin} a {(modalItem.payload as SavedPayload)?.pagasMax}</span></div>
                          <div className="flex justify-between"><span>Valor Empréstimo</span><span>{(modalItem.payload as SavedPayload)?.valorEmprestimoMin ?? '-'} a {(modalItem.payload as SavedPayload)?.valorEmprestimoMax ?? '-'}</span></div>
                          <div className="flex justify-between"><span>Valor Parcela</span><span>{(modalItem.payload as SavedPayload)?.valorParcelaMin ?? '-'} a {(modalItem.payload as SavedPayload)?.valorParcelaMax ?? '-'}</span></div>
                        </div>
                      </div>
                      <div className="border rounded-lg">
                        <div className="px-3 py-2 font-medium bg-neutral-50 border-b">Datas</div>
                        <div className="p-3 space-y-2">
                          <div className="flex justify-between"><span>Início Desconto</span><span>{(modalItem.payload as SavedPayload)?.inicioDesconto || '-'}</span></div>
                          <div className="flex justify-between"><span>Fim Desconto</span><span>{(modalItem.payload as SavedPayload)?.fimDesconto || '-'}</span></div>
                          <div className="flex justify-between"><span>Nascimento</span><span>{(modalItem.payload as SavedPayload)?.nascimentoInicio || '-'} a {(modalItem.payload as SavedPayload)?.nascimentoFim || '-'}</span></div>
                          <div className="flex justify-between"><span>Atualização</span><span>{(modalItem.payload as SavedPayload)?.atualizacaoInicio || '-'} a {(modalItem.payload as SavedPayload)?.atualizacaoFim || '-'}</span></div>
                          <div className="flex justify-between"><span>DIB</span><span>{(modalItem.payload as SavedPayload)?.dibInicio || '-'} a {(modalItem.payload as SavedPayload)?.dibFim || '-'}</span></div>
                        </div>
                      </div>

                      <div className="border rounded-lg col-span-2">
                        <div className="px-3 py-2 font-medium bg-neutral-50 border-b">Bancos e Outros</div>
                        <div className="p-3 space-y-2">
                          <div><span className="font-medium">Bancos Pagadores: </span>{(((modalItem.payload as SavedPayload)?.bancoPagamento) || []).join(', ') || '-'}</div>
                          <div><span className="font-medium">Bancos Empréstimo: </span>{(((modalItem.payload as SavedPayload)?.bancoEmprestimo) || []).join(', ') || '-'}</div>
                          <div><span className="font-medium">Espécies: </span>{(((modalItem.payload as SavedPayload)?.especies) || []).join(', ') || '-'}</div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DownloadMacica;
