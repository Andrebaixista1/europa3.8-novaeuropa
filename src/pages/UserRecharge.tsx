// src/pages/UserRecharge.tsx
import React, { useEffect, useState, useMemo } from "react";
import { DollarSign, FilterX, ArrowUpDown, Users, Activity, CalendarDays, FileDown, PlusCircle } from "lucide-react";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import DashboardHeader from "../components/DashboardHeader";
import LoadingSpinner from "../components/LoadingSpinner";
import Button from "../components/Button";
import AddRechargeModal from "../components/AddRechargeModal"; // Importar o modal

const API_BASE = import.meta.env.DEV
  ? "http://177.153.62.236:5678/"
  : "";

interface RechargeEntry {
  id: number;
  id_user: number;
  login: string;
  total_carregado: number;
  limite_disponivel: number;
  consultas_realizada: number;
  data_saldo_carregado: string;
}

interface User {
  id: number;
  // Adicione outros campos de usuário se necessário para contagem ou exibição
}

const formatDate = (dateString: string, forExcel: boolean = false) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (forExcel) {
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return dateString;
  }
};

const UserRecharge: React.FC = () => {
  const [rechargeData, setRechargeData] = useState<RechargeEntry[]>([]);
  const [totalApiUsers, setTotalApiUsers] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [sortConfig, setSortConfig] = useState<{ key: keyof RechargeEntry; direction: "asc" | "desc" } | null>(null);
  const [isAddRechargeModalOpen, setIsAddRechargeModalOpen] = useState(false); // Estado para controlar o modal

  // Função para buscar dados de recarga, será chamada no useEffect e após adicionar recarga
  const fetchRechargeData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/webhook/api/creditos`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: `Erro HTTP ${res.status}` }));
        throw new Error(errorData.message || `Erro ao buscar dados de recarga: ${res.status}`);
      }
      const data: RechargeEntry[] = await res.json();
      setRechargeData(data);
    } catch (err) {
      console.error("Erro ao buscar dados de recarga:", err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRechargeData(); // Chama a função ao montar o componente
  }, []);

  useEffect(() => {
    async function fetchTotalUsers() {
      setIsLoadingUsers(true);
      try {
        const res = await fetch(`${API_BASE}/webhook/api/usuarios`);
        if (!res.ok) {
          console.error(`Erro HTTP ${res.status} ao buscar total de usuários`);
          setTotalApiUsers(0);
          return;
        }
        const usersData: User[] = await res.json();
        setTotalApiUsers(usersData.length);
      } catch (err) {
        console.error("Erro ao buscar total de usuários:", err);
        setTotalApiUsers(0);
      } finally {
        setIsLoadingUsers(false);
      }
    }
    fetchTotalUsers();
  }, []);

  const filteredAndSortedData = useMemo(() => {
    let data = [...rechargeData];
    if (searchTerm) {
      data = data.filter(entry =>
        entry.login.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (startDate) {
      data = data.filter(entry => {
        try {
          const entryDate = new Date(entry.data_saldo_carregado.split(" ")[0]);
          const filterStartDate = new Date(startDate);
          return entryDate >= filterStartDate;
        } catch (e) { return true; }
      });
    }
    if (endDate) {
      data = data.filter(entry => {
        try {
          const entryDate = new Date(entry.data_saldo_carregado.split(" ")[0]);
          const filterEndDate = new Date(endDate);
          filterEndDate.setHours(23, 59, 59, 999);
          return entryDate <= filterEndDate;
        } catch (e) { return true; }
      });
    }
    if (sortConfig !== null) {
      data.sort((a, b) => {
        if (sortConfig.key === "data_saldo_carregado") {
          const dateA = new Date(a.data_saldo_carregado).getTime();
          const dateB = new Date(b.data_saldo_carregado).getTime();
          if (dateA < dateB) return sortConfig.direction === "asc" ? -1 : 1;
          if (dateA > dateB) return sortConfig.direction === "asc" ? 1 : -1;
          return 0;
        }
        if (typeof a[sortConfig.key] === 'number' && typeof b[sortConfig.key] === 'number') {
          if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "asc" ? -1 : 1;
          if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "asc" ? 1 : -1;
          return 0;
        }
        const valA = String(a[sortConfig.key]).toLowerCase();
        const valB = String(b[sortConfig.key]).toLowerCase();
        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [rechargeData, searchTerm, startDate, endDate, sortConfig]);

  const summaryData = useMemo(() => {
    const totalCarregado = filteredAndSortedData.reduce((sum, item) => sum + Number(item.total_carregado), 0);
    const limiteDisponivel = filteredAndSortedData.reduce((sum, item) => sum + Number(item.limite_disponivel), 0);
    const consultasRealizadas = filteredAndSortedData.reduce((sum, item) => sum + Number(item.consultas_realizada), 0);
    return {
      totalCarregado,
      limiteDisponivel,
      consultasRealizadas,
    };
  }, [filteredAndSortedData]);

  const requestSort = (key: keyof RechargeEntry) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: keyof RechargeEntry) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown size={14} className="ml-1 opacity-30" />;
    }
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  const columns: { key: keyof RechargeEntry; label: string; sortable: boolean, className?: string }[] = [
    { key: "id", label: "ID Recarga", sortable: true, className: "w-20" },
    { key: "id_user", label: "ID Usuário", sortable: true, className: "w-24" },
    { key: "login", label: "Login", sortable: true },
    { key: "total_carregado", label: "Total Carregado", sortable: true, className: "text-right" },
    { key: "limite_disponivel", label: "Limite Disponível", sortable: true, className: "text-right" },
    { key: "consultas_realizada", label: "Consultas Realizadas", sortable: true, className: "text-center w-40" },
    { key: "data_saldo_carregado", label: "Data da Recarga", sortable: true, className: "w-48" },
  ];

  const summaryCards = [
    { title: "Total Carregado", value: summaryData.totalCarregado.toLocaleString("pt-BR"), icon: <DollarSign size={24} className="text-blue-500" />, color: "blue" },
    { title: "Limite Disponível", value: summaryData.limiteDisponivel.toLocaleString("pt-BR"), icon: <DollarSign size={24} className="text-green-500" />, color: "green" },
    { title: "Consultas Realizadas", value: summaryData.consultasRealizadas.toLocaleString("pt-BR"), icon: <Activity size={24} className="text-yellow-500" />, color: "yellow" },
    { title: "Total de Usuários (API)", value: isLoadingUsers ? "-" : totalApiUsers.toLocaleString("pt-BR"), icon: <Users size={24} className="text-purple-500" />, color: "purple" },
  ];

  const handleExportExcel = () => {
    if (filteredAndSortedData.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }
    const dataToExport = filteredAndSortedData.map(entry => {
      const row: { [key: string]: any } = {};
      columns.forEach(col => {
        if (col.key === "data_saldo_carregado") {
          row[col.label] = formatDate(entry[col.key], true);
        } else {
          row[col.label] = entry[col.key];
        }
      });
      return row;
    });
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Recargas");
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], {type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8"});
    saveAs(dataBlob, "recargas_exportadas.xlsx");
  };

  const handleAddRecharge = () => {
    setIsAddRechargeModalOpen(true); // Abre o modal
  };

  const handleRechargeAdded = () => {
    fetchRechargeData(); // Atualiza os dados da tabela após adicionar recarga
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <DashboardHeader title="Gestão de Recargas" />
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {summaryCards.map((card, index) => (
            <div key={index} className={`bg-white p-6 rounded-xl shadow-lg border-l-4 border-${card.color}-500 flex flex-col justify-between`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wider">{card.title}</h3>
                  {card.icon}
                </div>
                <p className="text-3xl font-bold text-neutral-800">{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-6 p-4 bg-white rounded-xl shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 items-end">
            <div>
              <label htmlFor="searchLogin" className="block text-sm font-medium text-neutral-700 mb-1">
                Buscar por Login
              </label>
              <input
                id="searchLogin"
                type="text"
                placeholder="Digite o login..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="europa-input w-full"
              />
            </div>
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-neutral-700 mb-1">
                Data Início (Recarga)
              </label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="europa-input w-full"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-neutral-700 mb-1">
                Data Fim (Recarga)
              </label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="europa-input w-full"
              />
            </div>
            <div className="flex justify-end items-center space-x-2 pt-5 md:pt-0 lg:pt-5">
              <Button
                variant="icon"
                onClick={() => { setSearchTerm(""); setStartDate(""); setEndDate(""); }}
                title="Limpar Todos os Filtros"
                className="p-2 text-neutral-600 hover:text-red-600"
              >
                <FilterX size={20} />
              </Button>
            </div>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row justify-start space-y-2 sm:space-y-0 sm:space-x-3">
              <Button variant="outline" onClick={handleExportExcel} icon={<FileDown size={16} className="mr-2" />}>
                Exportar Excel
              </Button>
              <Button variant="primary" onClick={handleAddRecharge} icon={<PlusCircle size={16} className="mr-2" />}>
                Adicionar Recarga
              </Button>
            </div>
        </div>

        <AddRechargeModal 
          isOpen={isAddRechargeModalOpen} 
          onClose={() => setIsAddRechargeModalOpen(false)} 
          onRechargeAdded={handleRechargeAdded} // Passa a função para atualizar a lista
        />

        {isLoading && (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        )}
        {error && (
          <div className="bg-error-100 border border-error-400 text-error-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Erro: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {!isLoading && !error && (
          <div className="overflow-auto bg-white rounded-xl shadow">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-100">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      className={`px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider ${col.className || ""} ${col.sortable ? "cursor-pointer hover:bg-neutral-200" : ""}`}
                      onClick={() => col.sortable && requestSort(col.key)}
                    >
                      <div className="flex items-center">
                        {col.label}
                        {col.sortable && getSortIndicator(col.key)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {filteredAndSortedData.length > 0 ? (
                  filteredAndSortedData.map((entry) => (
                    <tr key={entry.id} className="hover:bg-neutral-50">
                      {columns.map(col => (
                        <td key={col.key} className={`px-6 py-4 whitespace-nowrap text-sm ${col.className?.includes("text-") ? col.className.split(" ").find(c => c.startsWith("text-")) : "text-neutral-700"} ${col.className?.includes("w-") ? col.className.split(" ").find(c => c.startsWith("w-")) : ""}`}>
                          {col.key === "data_saldo_carregado" 
                            ? formatDate(entry[col.key]) 
                            : (col.key === "total_carregado" || col.key === "limite_disponivel" || col.key === "consultas_realizada")
                            ? Number(entry[col.key]).toLocaleString("pt-BR")
                            : entry[col.key]}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-12 text-center text-neutral-500">
                      Nenhum dado de recarga encontrado para os filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserRecharge;

