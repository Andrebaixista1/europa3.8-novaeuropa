// src/pages/CreateLogins.tsx
import React, { useEffect, useState, useMemo } from "react";
import { Users } from "lucide-react";
import DashboardHeader from "../components/DashboardHeader";
import LoadingSpinner from "../components/LoadingSpinner";
import Button from "../components/Button";

const API_BASE = import.meta.env.DEV ? "http://177.153.62.236:5678/" : "";

interface Usuario {
  id: number;
  nome: string;
  login: string;
  senha: string;
  data_criacao: string;
  ultimo_log: string;
}

const CreateLogins: React.FC = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Usuario;
    direction: "asc" | "desc";
  } | null>(null);

  useEffect(() => {
    async function fetchUsuarios() {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/webhook/api/usuarios`);
        if (!res.ok) throw new Error(`Erro ${res.status}`);
        const data: Usuario[] = await res.json();
        setUsuarios(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchUsuarios();
  }, []);

  const displayedUsers = useMemo(() => {
    let data = usuarios;
    if (startDate) {
      data = data.filter((u) => u.data_criacao.slice(0, 10) >= startDate);
    }
    if (endDate) {
      data = data.filter((u) => u.data_criacao.slice(0, 10) <= endDate);
    }
    if (searchTerm) {
      data = data.filter((u) =>
        u.login.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (sortConfig) {
      const { key, direction } = sortConfig;
      data = [...data].sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        if (key === "id") {
          return direction === "asc"
            ? (aVal as number) - (bVal as number)
            : (bVal as number) - (aVal as number);
        }
        if (key === "data_criacao" || key === "ultimo_log") {
          const da = Date.parse((aVal as string).slice(0, 10));
          const db = Date.parse((bVal as string).slice(0, 10));
          return direction === "asc" ? da - db : db - da;
        }
        return direction === "asc"
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
    }
    return data;
  }, [usuarios, startDate, endDate, searchTerm, sortConfig]);

  const onSort = (key: keyof Usuario) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig?.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSearchTerm("");
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <DashboardHeader title="Criar Logins" />
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-apple p-6 flex flex-col items-center">
            <div className="p-3 bg-primary-100 rounded-full mb-3">
              <Users size={28} className="text-primary-600" />
            </div>
            <span className="text-sm text-neutral-500">Total de Usuários</span>
            <span className="text-3xl font-bold text-primary-600">
              {displayedUsers.length}
            </span>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Data Criação Início
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="europa-input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Data Criação Fim
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="europa-input w-full"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Buscar Login
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar login"
              className="europa-input w-full"
            />
          </div>
          <div className="flex items-end">
            <Button variant="secondary" fullWidth onClick={clearFilters}>
              Limpar Filtros
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        )}
        {error && <p className="text-error-500 text-center py-4">{error}</p>}

        {!isLoading && !error && (
          <div className="overflow-auto bg-white rounded-lg shadow">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-100">
                <tr>
                  <th
                    onClick={() => onSort("id")}
                    className="px-4 py-2 text-left text-sm font-medium cursor-pointer select-none"
                  >
                    ID{" "}
                    {sortConfig?.key === "id"
                      ? sortConfig.direction === "asc"
                        ? "↑"
                        : "↓"
                      : ""}
                  </th>
                  <th
                    onClick={() => onSort("nome")}
                    className="px-4 py-2 text-left text-sm font-medium cursor-pointer select-none"
                  >
                    Nome{" "}
                    {sortConfig?.key === "nome"
                      ? sortConfig.direction === "asc"
                        ? "↑"
                        : "↓"
                      : ""}
                  </th>
                  <th
                    onClick={() => onSort("login")}
                    className="px-4 py-2 text-left text-sm font-medium cursor-pointer select-none"
                  >
                    Login{" "}
                    {sortConfig?.key === "login"
                      ? sortConfig.direction === "asc"
                        ? "↑"
                        : "↓"
                      : ""}
                  </th>
                  <th
                    onClick={() => onSort("data_criacao")}
                    className="px-4 py-2 text-left text-sm font-medium cursor-pointer select-none"
                  >
                    Criado em{" "}
                    {sortConfig?.key === "data_criacao"
                      ? sortConfig.direction === "asc"
                        ? "↑"
                        : "↓"
                      : ""}
                  </th>
                  <th
                    onClick={() => onSort("ultimo_log")}
                    className="px-4 py-2 text-left text-sm font-medium cursor-pointer select-none"
                  >
                    Último Log{" "}
                    {sortConfig?.key === "ultimo_log"
                      ? sortConfig.direction === "asc"
                        ? "↑"
                        : "↓"
                      : ""}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {displayedUsers.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-2 text-sm">{u.id}</td>
                    <td className="px-4 py-2 text-sm">{u.nome}</td>
                    <td className="px-4 py-2 text-sm">{u.login}</td>
                    <td className="px-4 py-2 text-sm">
                      {new Date(u.data_criacao).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {new Date(u.ultimo_log).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateLogins;
