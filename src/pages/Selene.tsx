import React, { useState } from "react";
import DashboardHeader from "../components/DashboardHeader";

interface Proposta {
  produto_nome?: string;
  cliente_nome?: string;
  valor_referencia?: string | number;
  valor_parcela?: string | number;
  status_nome?: string;
  id_proposta_banco?: string | number;
}

type ResultadosPorProduto = { [tipo: string]: Proposta[] };
type IndicesAtuais = { [tipo: string]: number };

const Selene: React.FC = () => {
  const [cpf, setCpf] = useState("");
  const [resultados, setResultados] = useState<ResultadosPorProduto>({});
  const [indices, setIndices] = useState<IndicesAtuais>({});
  const [showCaixa, setShowCaixa] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Função utilitária para definir a cor do status
  function corStatus(status?: string) {
    if (!status) return "text-neutral-500";
    const s = status.toLowerCase();
    if (s.includes("aprovada") || s.includes("pago")) return "text-green-500";
    if (s.includes("assinado") || s.includes("pago")) return "text-green-500";
    if (s.includes("pendente")) return "text-yellow-500";
    if (s.includes("aguardando")) return "text-yellow-500";
    if (s.includes("andamento")) return "text-yellow-500";
    if (s.includes("reprovada")) return "text-red-500";
    if (s.includes("devolvida")) return "text-red-500";
    if (s.includes("bloqueado") || s.includes("reprovado") || s.includes("negado")) return "text-red-500";
    if (s.includes("averbado")) return "text-blue-500";
    return "text-neutral-500";
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    setShowCaixa(false);
    const cpfLimpo = cpf.replace(/\D/g, "");
    try {
      const res = await fetch(
        "https://n8n.sistemavieira.com.br/webhook/75430a70-94d0-4bc2-99c2-96e8353c6b52",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cpf: cpfLimpo }),
        }
      );
      if (!res.ok) throw new Error("Cliente não encontrado.");

      let respostaN8n: any;
      try {
        respostaN8n = await res.json();
      } catch {
        respostaN8n = null;
      }

      let dados: Proposta[] = [];
      if (Array.isArray(respostaN8n)) {
        dados = respostaN8n;
      } else if (respostaN8n && "data" in respostaN8n && Array.isArray(respostaN8n.data)) {
        dados = respostaN8n.data;
      } else if (respostaN8n && "result" in respostaN8n && Array.isArray(respostaN8n.result)) {
        dados = respostaN8n.result;
      } else if (respostaN8n) {
        dados = [respostaN8n];
      }

      if (!dados || !dados.length) throw new Error("Nenhuma proposta encontrada para esse CPF.");

      const agrupados: ResultadosPorProduto = {};
      const novosIndices: IndicesAtuais = {};
      dados.forEach((item) => {
        const tipo = item.produto_nome || "Outro";
        if (!agrupados[tipo]) agrupados[tipo] = [];
        agrupados[tipo].push(item);
      });
      Object.keys(agrupados).forEach((tipo) => {
        novosIndices[tipo] = 0;
      });
      setResultados(agrupados);
      setIndices(novosIndices);
      setShowCaixa(true);
    } catch (err) {
      setResultados({});
      setShowCaixa(false);
      setErro((err as Error)?.message || "Erro ao consultar propostas.");
    } finally {
      setLoading(false);
    }
  };

  const mudarIndice = (tipo: string, direcao: number) => {
    setIndices((prev) => {
      const total = resultados[tipo].length;
      const novo = (prev[tipo] + direcao + total) % total;
      return { ...prev, [tipo]: novo };
    });
  };

  const CardProposta = ({
    tipo,
    proposta,
    total,
    idx,
    onPrev,
    onNext,
  }: {
    tipo: string;
    proposta: Proposta;
    total: number;
    idx: number;
    onPrev: () => void;
    onNext: () => void;
  }) => (
    <div
      className="bg-white border border-[#E5EAF2] rounded-2xl shadow-lg min-w-[340px] max-w-md w-full flex flex-col items-center px-10 py-10 mb-5 transition-all duration-200 min-h-[370px]"
      tabIndex={0}
      aria-label={`Card de proposta ${tipo}`}
    >
      <span className="block text-xs text-[#00A8FF] uppercase font-bold mb-4 tracking-widest text-center w-full truncate">
        {tipo}
      </span>
      <div className="w-full flex flex-col gap-2 mb-2">
        <div className="flex flex-col items-start w-full">
          <span className="text-neutral-400 text-sm">Nome:</span>
          <span className="text-neutral-700 font-medium break-words w-full text-left whitespace-pre-line">
            {proposta.cliente_nome || "-"}
          </span>
        </div>
        <div className="flex justify-between w-full">
          <span className="text-neutral-400 text-sm">Valor:</span>
          <span className="text-[#00A8FF] font-bold text-right truncate max-w-[140px] text-lg">
            {formatarMoeda(proposta.valor_referencia)}
          </span>
        </div>
        <div className="flex justify-between w-full">
          <span className="text-neutral-400 text-sm">Parcela:</span>
          <span className="text-neutral-700 text-right truncate max-w-[140px] text-base">
            {formatarMoeda(proposta.valor_parcela)}
          </span>
        </div>
        <div className="flex justify-between w-full">
          <span className="text-neutral-400 text-sm">Status:</span>
          <span
            className={`font-bold text-right break-words max-w-[140px] text-base line-clamp-2 ${corStatus(proposta.status_nome)}`}
          >
            {proposta.status_nome || "-"}
          </span>
        </div>
        <div className="flex flex-col items-start w-full">
          <span className="text-neutral-400 text-sm">ID Proposta:</span>
          <span className="text-neutral-700 break-words w-full truncate max-w-[140px]">
            {proposta.id_proposta_banco || "-"}
          </span>
        </div>
      </div>
      {total > 1 && (
        <div className="flex gap-2 items-center mt-5">
          <button
            onClick={onPrev}
            className="bg-[#EDF5FC] hover:bg-[#00A8FF] text-[#00A8FF] hover:text-white px-4 py-2 rounded-full font-bold transition"
            aria-label="Anterior"
            type="button"
          >
            ←
          </button>
          <span className="text-xs text-neutral-400">
            {idx + 1} de {total}
          </span>
          <button
            onClick={onNext}
            className="bg-[#EDF5FC] hover:bg-[#00A8FF] text-[#00A8FF] hover:text-white px-4 py-2 rounded-full font-bold transition"
            aria-label="Próximo"
            type="button"
          >
            →
          </button>
        </div>
      )}
    </div>
  );

  function formatarMoeda(valor: string | number | undefined) {
    if (!valor) return "-";
    const numero = Number(valor);
    if (isNaN(numero)) return String(valor);
    return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  return (
    <div className="min-h-screen w-full bg-[#F5F7FB] flex flex-col">
      <DashboardHeader title="Selene - Consulta de Propostas" />
      <div className="flex-1 flex flex-col justify-center items-center pt-10 pb-8">
        <div className="w-full max-w-6xl bg-white border border-[#E5EAF2] rounded-3xl shadow-xl px-8 py-10">
          <form
            className="flex flex-col sm:flex-row gap-4 mb-8"
            onSubmit={handleSubmit}
          >
            <input
              type="text"
              placeholder="Digite o CPF"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              className="flex-1 px-5 py-3 rounded-xl bg-[#F5F7FB] border border-[#E5EAF2] text-neutral-800 text-lg placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-[#00A8FF] transition"
              required
              maxLength={14}
              inputMode="numeric"
              aria-label="CPF"
            />
            <button
              type="submit"
              className="px-8 py-3 rounded-xl bg-[#00A8FF] hover:bg-[#0894da] text-white text-base font-bold transition"
              disabled={loading}
            >
              {loading ? "Consultando..." : "Consultar"}
            </button>
          </form>
          {erro && (
            <div className="text-red-500 text-center mb-4">{erro}</div>
          )}
          {/* Container horizontal scroll de cards */}
          <div
            className={
              showCaixa
                ? "flex flex-row flex-nowrap gap-8 overflow-x-auto pb-4"
                : "hidden"
            }
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {Object.entries(resultados).map(([tipo, lista]) => {
              const idx = indices[tipo] || 0;
              const dados = lista[idx];
              return (
                <CardProposta
                  key={tipo}
                  tipo={tipo}
                  proposta={dados}
                  total={lista.length}
                  idx={idx}
                  onPrev={() => mudarIndice(tipo, -1)}
                  onNext={() => mudarIndice(tipo, 1)}
                />
              );
            })}
          </div>
          {!loading && !showCaixa && !erro && (
            <div className="text-neutral-400 text-center mt-8">
              Preencha o CPF e clique em consultar para ver as propostas do cliente.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Selene;
