"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Ticket,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  PlayCircle,
  Calendar,
  Users,
  Briefcase,
  AlertTriangle,
  BarChart3,
  ShieldBan,
  TriangleAlert,
  RotateCcw,
  Brain,
  ChevronDown,
  ChevronUp,
  Layers,
  Target,
  Activity,
  Info,
} from "lucide-react"
import { listarChamados, getEstatisticas, type Chamado, type ChamadoFilters, type Estatisticas } from "@/lib/chamado-service"
import { formatarDataBrasil } from '@/utils/dateUtils'

// Componente de Status Badge
function StatusBadge({ status }: { status: string }) {
  const styles = {
    PROCESSAMENTO: 'bg-orange-100 text-orange-800 dark:bg-yellow-900/20 dark:text-orange-400',
    PENDENTE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    ANALISADO: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    ATRIBUIDO: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
    EMATENDIMENTO: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    CONCLUIDO: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    CANCELADO: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
    RECUSADO: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
  };

  const icons = {
    PROCESSAMENTO: <RotateCcw size={14} className="mr-1" />,
    PENDENTE: <Clock size={14} className="mr-1" />,
    ANALISADO: <Search size={14} className="mr-1" />,
    ATRIBUIDO: <Users size={14} className="mr-1" />,
    EMATENDIMENTO: <PlayCircle size={14} className="mr-1" />,
    CONCLUIDO: <CheckCircle size={14} className="mr-1" />,
    CANCELADO: <XCircle size={14} className="mr-1" />,
    RECUSADO: <ShieldBan size={14} className="mr-1" />,
    FALTAINFORMACAO: <AlertCircle size={14} className="mr-1" />
  };

  const labels = {
    PROCESSAMENTO: 'Em Processamento',
    PENDENTE: 'Pendente',
    ANALISADO: 'Analisado',
    ATRIBUIDO: 'Atribuído',
    EMATENDIMENTO: 'Em Atendimento',
    CONCLUIDO: 'Concluído',
    CANCELADO: 'Cancelado',
    RECUSADO: 'Recusado',
    FALTAINFORMACAO: 'Falta Informação'
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
      {icons[status as keyof typeof icons]}
      {labels[status as keyof typeof labels]}
    </span>
  );
}

// Formata número decimal com vírgula
function formatarDecimal(valor: number | null | undefined, casas: number = 2): string {
  if (valor === null || valor === undefined) return 'N/A';
  return valor.toFixed(casas).replace('.', ',');
}

// Componente de Tooltip simples
function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  return (
    <div className="relative group inline-flex items-center">
      {children}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 w-48 text-center pointer-events-none">
        {text}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
      </div>
    </div>
  );
}

// Converte número em letra(s) do alfabeto no estilo "coluna de planilha"
// 0 → A, 1 → B, ..., 25 → Z, 26 → AA, 27 → AB, ...
function numeroParaLetra(numero: number): string {
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const base = letras.length; // 26

  if (numero < 0) {
    return `?${numero}`; // Fallback para números negativos
  }

  let resultado = '';
  let n = numero;

  // Sistema "bijective base-26" (A=1, B=2, ..., Z=26, AA=27, ...)
  // Como aqui A=0, fazemos o ajuste somando 1 antes de cada divisão.
  n = n + 1;

  while (n > 0) {
    const resto = (n - 1) % base;
    resultado = letras[resto] + resultado;
    n = Math.floor((n - 1) / base);
  }

  return resultado;
}

// Componente de Urgência Badge
function UrgenciaBadge({ urgencia }: { urgencia?: string }) {
  if (!urgencia) return null;

  const styles = {
    BAIXA: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    MEDIA: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    ALTA: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    URGENTE: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[urgencia as keyof typeof styles]}`}>
      <AlertTriangle size={14} className="mr-1" />
      {urgencia}
    </span>
  );
}

export default function ChamadosPage() {
  const router = useRouter();
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mineracaoExpandida, setMineracaoExpandida] = useState(false);
  const [filters, setFilters] = useState<ChamadoFilters>({
    status: 'PENDENTE',
    urgencia: undefined,
    dataInicio: undefined,
    dataFim: undefined
  });

  const [showFilters, setShowFilters] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);

  const [clustersExpandidos, setClustersExpandidos] = useState<Set<string>>(new Set());

  useEffect(() => {
    carregarDados();
  }, [filters]);

  const carregarDados = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { pagina, limite, ...filtersSemPaginacao } = filters as any;

      const [chamadosResponse, stats] = await Promise.all([
        listarChamados(filters),
        getEstatisticas('30d')
      ]);

      // A API pode retornar os dados diretamente ou dentro de um objeto 'data'
      const dadosChamados = chamadosResponse.data || chamadosResponse;
      setChamados(dadosChamados);
      setEstatisticas(stats);

      // Resetar para primeira página ao carregar novos dados
      setPaginaAtual(1);
    } catch (err) {
      console.error('Erro ao carregar chamados:', err);
      setError('Não foi possível carregar os chamados');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: keyof ChamadoFilters, value: any) => {
    setFilters({ ...filters, [key]: value, pagina: 1 });
    setPaginaAtual(1); // Resetar página ao aplicar filtros
  };

  const handlePageChange = (novaPagina: number) => {
    setPaginaAtual(novaPagina);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPaginaAtual(1); // Resetar página ao buscar
  };

  // Alterna a expansão de um cluster específico
  const toggleCluster = (clusterId: string) => {
    setClustersExpandidos(prev => {
      const novo = new Set(prev);
      if (novo.has(clusterId)) {
        novo.delete(clusterId);
      } else {
        novo.add(clusterId);
      }
      return novo;
    });
  };

  // Verifica se um cluster está expandido
  const isClusterExpandido = (clusterId: string) => {
    return clustersExpandidos.has(clusterId);
  };

  // Expandir todos
  const expandirTodos = () => {
    if (!estatisticas?.ultimaMineracao) return;
    setClustersExpandidos(new Set(estatisticas.ultimaMineracao.clusters.map(c => c.ClusterId)));
  };

  // Colapsar todos
  const colapsarTodos = () => {
    setClustersExpandidos(new Set());
  };

  // Resetar página quando os filtros mudarem
  useEffect(() => {
    setPaginaAtual(1);
  }, [searchTerm, filters.status, filters.urgencia, filters.dataInicio, filters.dataFim]);

  // Filtrar os dados (local)
  const chamadosFiltrados = useMemo(() => {
    let filtered = [...chamados];

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(c =>
        (c.ChamadoTitulo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.Pessoa.PessoaNome.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por status
    if (filters.status) {
      filtered = filtered.filter(c => c.ChamadoStatus === filters.status);
    }

    // Filtro por urgência
    if (filters.urgencia) {
      filtered = filtered.filter(c => c.ChamadoUrgencia === filters.urgencia);
    }

    // Filtro por data de abertura
    if (filters.dataInicio) {
      const dataInicio = new Date(filters.dataInicio);
      filtered = filtered.filter(c => new Date(c.ChamadoDtAbertura) >= dataInicio);
    }

    if (filters.dataFim) {
      const dataFim = new Date(filters.dataFim);
      dataFim.setHours(23, 59, 59);
      filtered = filtered.filter(c => new Date(c.ChamadoDtAbertura) <= dataFim);
    }

    return filtered;
  }, [chamados, searchTerm, filters.status, filters.urgencia, filters.dataInicio, filters.dataFim]);

  // Calcular paginação client-side
  const totalRegistros = chamadosFiltrados.length;
  const totalPaginas = Math.ceil(totalRegistros / itensPorPagina);
  const inicio = (paginaAtual - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;
  const chamadosPaginados = chamadosFiltrados.slice(inicio, fim);

  const statusOptions = [
    { value: 'PROCESSAMENTO', label: 'Em Processamento', color: 'orange' },
    { value: 'PENDENTE', label: 'Pendente', color: 'yellow' },
    { value: 'ANALISADO', label: 'Analisado', color: 'blue' },
    { value: 'ATRIBUIDO', label: 'Atribuído', color: 'indigo' },
    { value: 'EMATENDIMENTO', label: 'Em Atendimento', color: 'purple' },
    { value: 'CONCLUIDO', label: 'Concluído', color: 'green' },
    { value: 'CANCELADO', label: 'Cancelado', color: 'gray' },
    { value: 'RECUSADO', label: 'Recusado', color: 'red' },
    { value: 'FALTAINFORMACAO', label: 'Falta Informação', color: 'yellow' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Chamados
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Gerencie os chamados da unidade
          </p>
        </div>
        <div className="flex gap-2">
        </div>
      </div>

      {/* Estatísticas Rápidas */}
      {estatisticas && (
        <div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Fases
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">

              {/* Total */}
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total</span>
                  <BarChart3 size={18} className="text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {estatisticas.total}
                </p>
              </div>

              {/* Processando */}
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Processamento</span>
                  <Clock size={18} className="text-yellow-800 dark:text-yellow-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {estatisticas.porStatus.PROCESSAMENTO || 0}
                </p>
              </div>

              {/* Pendentes */}
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Pendentes</span>
                  <Clock size={18} className="text-yellow-800 dark:text-yellow-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {estatisticas.porStatus.PENDENTE || 0}
                </p>
              </div>

              {/* Analisados */}
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Analisados</span>
                  <Search size={18} className="text-blue-800 dark:text-blue-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {estatisticas.porStatus.ANALISADO || 0}
                </p>
              </div>

              {/* Atribuídos */}
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Atribuídos</span>
                  <Users size={18} className="text-indigo-800 dark:text-indigo-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {estatisticas.porStatus.ATRIBUIDO || 0}
                </p>
              </div>

              {/* Em Atendimento */}
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Em Atendimento</span>
                  <PlayCircle size={18} className="text-purple-800 dark:text-purple-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {estatisticas.porStatus.EMATENDIMENTO || 0}
                </p>
              </div>

              {/* Concluídos */}
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Concluídos</span>
                  <CheckCircle size={18} className="text-green-800 dark:text-green-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {estatisticas.porStatus.CONCLUIDO || 0}
                </p>
              </div>

              {/* Recusados */}
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Recusados</span>
                  <ShieldBan size={18} className="text-red-800 dark:text-red-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {estatisticas.porStatus.RECUSADO || 0}
                </p>
              </div>

              {/* Cancelados */}
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Cancelados</span>
                  <XCircle size={18} className="text-red-800 dark:text-red-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {estatisticas.porStatus.CANCELADO || 0}
                </p>
              </div>

              {/* Falta Informação */}
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Falta Informação</span>
                  <AlertCircle size={18} className="text-yellow-800 dark:text-yellow-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {estatisticas.porStatus.FALTAINFORMACAO || 0}
                </p>
              </div>

            </div>
          </div>
          <br />
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Prioridades
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

              {/* URGENTE */}
              {(() => {
                const urgentesAbertos = (estatisticas.porUrgencia.URGENTE || 0) - (estatisticas.porUrgenciaFechados.URGENTE || 0);
                return (
                  <div className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${urgentesAbertos > 0
                    ? 'border border-red-600 dark:border-red-400'
                    : 'border border-gray-200 dark:border-gray-800'
                    }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Urgente</span>
                      <TriangleAlert
                        size={18}
                        className={urgentesAbertos > 0
                          ? 'text-red-800 dark:text-red-400'
                          : 'text-gray-400 dark:text-gray-500'
                        }
                      />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {urgentesAbertos}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Abertos: {estatisticas.porUrgencia.URGENTE || 0} • Fechados: {estatisticas.porUrgenciaFechados.URGENTE || 0}
                    </p>
                  </div>
                );
              })()}

              {/* ALTA */}
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Alta</span>
                  <TriangleAlert size={18} className="text-orange-800 dark:text-orange-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {(estatisticas.porUrgencia.ALTA || 0) - (estatisticas.porUrgenciaFechados.ALTA || 0)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Abertos: {estatisticas.porUrgencia.ALTA || 0} • Fechados: {estatisticas.porUrgenciaFechados.ALTA || 0}
                </p>
              </div>

              {/* MÉDIA */}
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Média</span>
                  <TriangleAlert size={18} className="text-yellow-800 dark:text-yellow-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {(estatisticas.porUrgencia.MEDIA || 0) - (estatisticas.porUrgenciaFechados.MEDIA || 0)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Abertos: {estatisticas.porUrgencia.MEDIA || 0} • Fechados: {estatisticas.porUrgenciaFechados.MEDIA || 0}
                </p>
              </div>

              {/* BAIXA */}
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Baixa</span>
                  <TriangleAlert size={18} className="text-green-600 dark:text-green-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {(estatisticas.porUrgencia.BAIXA || 0) - (estatisticas.porUrgenciaFechados.BAIXA || 0)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Abertos: {estatisticas.porUrgencia.BAIXA || 0} • Fechados: {estatisticas.porUrgenciaFechados.BAIXA || 0}
                </p>
              </div>

            </div>
          </div>
        </div>
      )}

      {estatisticas?.ultimaMineracao && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">

          {/* Cabeçalho clicável (minimizado por padrão) */}
          <button
            onClick={() => setMineracaoExpandida(!mineracaoExpandida)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Brain size={20} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-left">
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Análise de Chamados por Agrupamento
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {estatisticas.ultimaMineracao.ExecucaoQtdClusters} clusters •{' '}
                  {estatisticas.ultimaMineracao.ExecucaoQtdDados} chamados analisados •{' '}
                  Executada em{' '}
                  {formatarDataBrasil(estatisticas.ultimaMineracao.ExecucaoDtInicio)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Ícone de expandir/colapsar */}
              {mineracaoExpandida ? (
                <ChevronUp size={20} className="text-gray-400" />
              ) : (
                <ChevronDown size={20} className="text-gray-400" />
              )}
            </div>
          </button>

          {/* Conteúdo expandido */}
          {mineracaoExpandida && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-4">

              {/* Rodapé com informações */}
              <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <Info
                  size={16}
                  className="text-gray-400 mt-0.5 flex-shrink-0"
                />

                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  <strong className="text-gray-600 dark:text-gray-300">
                    Cálculo do Score:
                  </strong>{" "}
                  o resultado é uma média ponderada de quatro indicadores:
                  <strong> Silhouette (35%)</strong>, que avalia a separação dos
                  clusters; <strong>Davies-Bouldin (25%)</strong>, que avalia a
                  proximidade entre clusters; <strong>Estabilidade (25%)</strong>,
                  que verifica a consistência dos agrupamentos; e{" "}
                  <strong>Menor cluster (15%)</strong>, que evita grupos muito
                  pequenos.
                  <br />
                  <span className="mt-1 inline-block">
                    Cada indicador é convertido para uma escala de 0 a 1 antes da
                    combinação. Para Silhouette e Estabilidade, valores maiores
                    recebem maior pontuação; para Davies-Bouldin, valores menores
                    recebem maior pontuação. O menor cluster recebe pontuação máxima
                    quando representa pelo menos 2% dos chamados.
                  </span>
                  <br />
                  <span className="mt-1 inline-block font-medium text-gray-600 dark:text-gray-300">
                    Fórmula: Score = 0,35 × Silhouette + 0,25 × Davies-Bouldin +
                    0,25 × Estabilidade + 0,15 × Menor cluster
                  </span>
                </p>
              </div>

              {/* Cards de resumo da mineração */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                {/* Grupos (Clusters) - Roxo */}
                <Tooltip text="Número total de grupos (clusters) identificados na análise de agrupamento.">
                  <div className="w-full bg-purple-50 dark:bg-purple-900/10 rounded-lg p-3 border border-purple-200 dark:border-purple-900/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Layers size={14} className="text-purple-600 dark:text-purple-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Grupos</span>
                    </div>
                    <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                      {estatisticas.ultimaMineracao.ExecucaoQtdClusters}
                    </p>
                  </div>
                </Tooltip>

                {/* Chamados - Azul */}
                <Tooltip text="Quantidade total de chamados utilizados na análise de agrupamento.">
                  <div className="w-full bg-blue-50 dark:bg-blue-900/10 rounded-lg p-3 border border-blue-200 dark:border-blue-900/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Activity size={14} className="text-blue-600 dark:text-blue-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Chamados</span>
                    </div>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {estatisticas.ultimaMineracao.ExecucaoQtdDados}
                    </p>
                  </div>
                </Tooltip>

                {/* Qualidade (Silhouette) - Verde */}
                <Tooltip text="Qualidade do agrupamento (quanto mais próximo de 100%, melhor), não deve ser considerado isoladamente, mas em conjunto com os outros indicadores">
                  <div className="w-full bg-green-50 dark:bg-green-900/10 rounded-lg p-3 border border-green-200 dark:border-green-900/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Target size={14} className="text-green-600 dark:text-green-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Qualidade</span>
                    </div>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      {estatisticas.ultimaMineracao.ExecucaoSilhouetteScore != null
                        ? `${formatarDecimal(estatisticas.ultimaMineracao.ExecucaoSilhouetteScore * 100, 2)}%`
                        : 'N/A'}
                    </p>
                  </div>
                </Tooltip>

                {/* Davies Bouldin - Laranja */}
                <Tooltip text="Índice Davies-Bouldin: mede a separação entre grupos (quanto menor, melhor)">
                  <div className="w-full bg-orange-50 dark:bg-orange-900/10 rounded-lg p-3 border border-orange-200 dark:border-orange-900/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Target size={14} className="text-orange-600 dark:text-orange-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Davies Bouldin</span>
                    </div>
                    <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                        {estatisticas.ultimaMineracao.ExecucaoDaviesBouldinScore != null
                        ? `${formatarDecimal(estatisticas.ultimaMineracao.ExecucaoDaviesBouldinScore * 100, 2)}%`
                        : 'N/A'}
                    </p>
                  </div>
                </Tooltip>

                {/* Estabilidade - Ciano */}
                <Tooltip text="Estabilidade do agrupamento: mede a consistência da formação dos grupos em diferentes execuções">
                  <div className="w-full bg-cyan-50 dark:bg-cyan-900/10 rounded-lg p-3 border border-cyan-200 dark:border-cyan-900/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Target size={14} className="text-cyan-600 dark:text-cyan-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Estabilidade</span>
                    </div>
                    <p className="text-xl font-bold text-cyan-600 dark:text-cyan-400">
                      {estatisticas.ultimaMineracao.ExecucaoEstabilidadeScore != null
                        ? `${formatarDecimal(estatisticas.ultimaMineracao.ExecucaoEstabilidadeScore * 100, 2)}%`
                        : 'N/A'}
                    </p>
                  </div>
                </Tooltip>

                {/* Menor Cluster - Âmbar */}
                <Tooltip text="Percentual de chamados do menor grupo em relação ao total analisado">
                  <div className="w-full bg-amber-50 dark:bg-amber-900/10 rounded-lg p-3 border border-amber-200 dark:border-amber-900/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Target size={14} className="text-amber-600 dark:text-amber-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Menor Grupo</span>
                    </div>
                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                      {estatisticas.ultimaMineracao.ExecucaoPercentualMenorCluster != null
                        ? `${formatarDecimal(estatisticas.ultimaMineracao.ExecucaoPercentualMenorCluster * 100, 2)}%`
                        : 'N/A'}
                    </p>
                  </div>
                </Tooltip>

                {/* Score Final - Rosa */}
                <Tooltip text="Pontuação final combinada que resume a qualidade geral do agrupamento (escolhida a mais proxima de 100%)">
                  <div className="w-full bg-pink-50 dark:bg-pink-900/10 rounded-lg p-3 border border-pink-200 dark:border-pink-900/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Target size={14} className="text-pink-600 dark:text-pink-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Score Final</span>
                    </div>
                    <p className="text-xl font-bold text-pink-600 dark:text-pink-400">
                      {estatisticas.ultimaMineracao.ExecucaoScoreCombinado != null
                        ? `${formatarDecimal(estatisticas.ultimaMineracao.ExecucaoScoreCombinado * 100, 2)}%`
                        : 'N/A'}
                    </p>
                  </div>
                </Tooltip>

                <div className="w-full bg-gray-50 dark:bg-gray-900/10 rounded-lg p-3 border border-gray-200 dark:border-gray-900/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar size={14} className="text-gray-600 dark:text-gray-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Última Atualização</span>
                    </div>
                    <p className="text-xl font-bold text-gray-600 dark:text-gray-400">
                      {formatarDataBrasil(estatisticas.ultimaMineracao.ExecucaoDtInicio)}
                    </p>
                  </div>

              </div>

              {/* Botões de expandir/colapsar todos */}
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={expandirTodos}
                  className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Expandir Todos
                </button>
                <button
                  onClick={colapsarTodos}
                  className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Recolher Todos
                </button>
              </div>

              {/* Grid de Clusters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                {estatisticas.ultimaMineracao.clusters.map((cluster) => {
                  const expandido = isClusterExpandido(cluster.ClusterId);

                  return (
                    <div
                      key={cluster.ClusterId}
                      className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow overflow-hidden"
                    >
                      {/* ✅ Cabeçalho clicável para expandir/colapsar */}
                      <button
                        onClick={() => toggleCluster(cluster.ClusterId)}
                        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                            {numeroParaLetra(cluster.ClusterNumero)}
                          </div>
                          <div className="text-left">
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                              Grupo {numeroParaLetra(cluster.ClusterNumero)}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {cluster.ClusterQtdChamados} chamados
                            </p>
                          </div>
                        </div>

                        {/* Ícone de expandir/colapsar */}
                        <div className="flex items-center gap-2">
                          {expandido ? (
                            <ChevronUp size={18} className="text-gray-400" />
                          ) : (
                            <ChevronDown size={18} className="text-gray-400" />
                          )}
                        </div>
                      </button>

                      {/* ✅ Conteúdo expandido (apenas quando expandido) */}
                      {expandido && (
                        <div className="px-4 pb-4 space-y-3 border-t border-gray-200 dark:border-gray-800 pt-3">

                          {/* Métricas do Cluster */}
                          <div className="space-y-2">
                            {cluster.ClusterMediaDiasProblema !== null && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500 dark:text-gray-400">Média dias problema</span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {formatarDecimal(cluster.ClusterMediaDiasProblema)} dias
                                </span>
                              </div>
                            )}

                            {cluster.ClusterMediaUrgencia !== null && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500 dark:text-gray-400">Urgência média</span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {formatarDecimal(cluster.ClusterMediaUrgencia)}
                                </span>
                              </div>
                            )}

                            {cluster.ClusterMediaTempoResolucao !== null && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500 dark:text-gray-400">Tempo resolução</span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {formatarDecimal(cluster.ClusterMediaTempoResolucao)}h
                                </span>
                              </div>
                            )}

                            {cluster.ClusterPercentualRiscoHumano !== null && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500 dark:text-gray-400">Risco de vida humana</span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {formatarDecimal(cluster.ClusterPercentualRiscoHumano)}%
                                </span>
                              </div>
                            )}

                            {cluster.ClusterPercentualRiscoAnimal !== null && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500 dark:text-gray-400">Risco de vida animal</span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {formatarDecimal(cluster.ClusterPercentualRiscoAnimal)}%
                                </span>
                              </div>
                            )}

                            {cluster.ClusterPercentualBloqueioVia !== null && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500 dark:text-gray-400">Atrapalha o trânsito</span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {formatarDecimal(cluster.ClusterPercentualBloqueioVia)}%
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Urgências do Cluster */}
                          {cluster.urgencias && cluster.urgencias.length > 0 && (
                            <div className="pt-3 border-t border-gray-200 dark:border-gray-800">
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                                <AlertTriangle size={12} />
                                Urgências
                              </p>
                              <div className="space-y-1.5">
                                {cluster.urgencias.map((urgencia) => {
                                  const corUrgencia = {
                                    URGENTE: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
                                    ALTA: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
                                    MEDIA: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
                                    BAIXA: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                  }[urgencia.ClusterUrgenciaNome] || 'bg-gray-100 text-gray-800';

                                  return (
                                    <div key={urgencia.ClusterUrgenciaId} className="flex items-center justify-between text-xs">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${corUrgencia}`}>
                                        {urgencia.ClusterUrgenciaNome}
                                      </span>
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="text-gray-500 dark:text-gray-500">
                                          {urgencia.ClusterUrgenciaQtdChamados}
                                        </span>
                                        <span className="font-medium text-purple-600 dark:text-purple-400 min-w-[40px] text-right">
                                          {formatarDecimal(urgencia.ClusterUrgenciaPercentual)}%
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Tipos de Suporte do Cluster */}
                          {cluster.tiposSuporte && cluster.tiposSuporte.length > 0 && (
                            <div className="pt-3 border-t border-gray-200 dark:border-gray-800">
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                                <Briefcase size={12} />
                                Tipos de Suporte
                              </p>
                              <div className="space-y-1.5">
                                {cluster.tiposSuporte.map((tipo) => (
                                  <div
                                    key={tipo.TipSupId}
                                    className="flex items-center justify-between text-xs"
                                  >
                                    <span className="text-gray-600 dark:text-gray-400 truncate flex-1 mr-2">
                                      {tipo.TipSupNom}
                                    </span>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className="text-gray-500 dark:text-gray-500">
                                        {tipo.ClusterTipoQtdChamados}
                                      </span>
                                      <span className="font-medium text-purple-600 dark:text-purple-400 min-w-[40px] text-right">
                                        {formatarDecimal(tipo.ClusterTipoPercentual)}%
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Busca */}
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por título ou solicitante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-gray-100"
              />
            </form>

            {/* Botão de filtros */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Filter size={18} />
              <span>Filtros</span>
            </button>

            {/* Atualizar */}
            <button
              onClick={carregarDados}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              <span>Atualizar</span>
            </button>
          </div>

          {/* Opções de filtro */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Status */}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Status
                  </label>
                  <select
                    value={filters.status || ''}
                    onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                    className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
                  >
                    <option value="">Todos</option>
                    {statusOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Urgência */}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Urgência
                  </label>
                  <select
                    value={filters.urgencia || ''}
                    onChange={(e) => handleFilterChange('urgencia', e.target.value || undefined)}
                    className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
                  >
                    <option value="">Todas</option>
                    <option value="BAIXA">BAIXA</option>
                    <option value="MEDIA">MÉDIA</option>
                    <option value="ALTA">ALTA</option>
                    <option value="URGENTE">URGENTE</option>
                  </select>
                </div>

                {/* Período */}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Data Início
                  </label>
                  <input
                    type="date"
                    value={filters.dataInicio || ''}
                    onChange={(e) => handleFilterChange('dataInicio', e.target.value || undefined)}
                    className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Data Fim
                  </label>
                  <input
                    type="date"
                    value={filters.dataFim || ''}
                    onChange={(e) => handleFilterChange('dataFim', e.target.value || undefined)}
                    className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lista de Chamados */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : chamadosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Ticket size={48} className="text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">Nenhum chamado encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {chamadosFiltrados.map((chamado) => (
              <div
                key={chamado.ChamadoId}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                onClick={() => router.push(`/gestor/autenticado/chamados/${chamado.ChamadoId}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        #{chamado.ChamadoN1}-{chamado.ChamadoN2}
                      </span>
                      <StatusBadge status={chamado.ChamadoStatus} />
                      {chamado.ChamadoUrgencia && (
                        <UrgenciaBadge urgencia={chamado.ChamadoUrgencia} />
                      )}
                    </div>

                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                      {chamado.ChamadoTitulo}
                    </h3>

                    <span>
                      {chamado.ChamadoDescricaoFormatada || chamado.ChamadoDescricaoInicial}
                    </span>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users size={14} />
                        {chamado.Pessoa.PessoaNome}
                      </span>

                      {chamado.TipoSuporte && (
                        <span className="flex items-center gap-1">
                          <Briefcase size={14} />
                          {chamado.TipoSuporte.TipSupNom}
                        </span>
                      )}

                      {chamado.Equipe && (
                        <span className="flex items-center gap-1">
                          <Users size={14} />
                          {chamado.Equipe.EquipeNome}
                        </span>
                      )}

                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {formatarDataBrasil(chamado.ChamadoDtAbertura)}
                      </span>

                      {chamado._count && (
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {chamado._count.AtividadeChamado} atividades
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/gestor/autenticado/chamados/${chamado.ChamadoId}`);
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                      title="Visualizar"
                    >
                      <Eye size={18} className="text-gray-600 dark:text-gray-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/gestor/autenticado/chamados/${chamado.ChamadoId}/editar`);
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                      title="Editar"
                    >
                      <Edit size={18} className="text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginação */}
        {/* Paginação - ATUALIZADA para usar estados client-side */}
        {!isLoading && chamadosFiltrados.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Mostrando {inicio + 1} a {Math.min(fim, totalRegistros)} de {totalRegistros} resultados
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(paginaAtual - 1)}
                disabled={paginaAtual === 1}
                className="p-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>

              {/* Botões de página dinâmicos */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                  let pageNum;
                  if (totalPaginas <= 5) {
                    pageNum = i + 1;
                  } else if (paginaAtual <= 3) {
                    pageNum = i + 1;
                  } else if (paginaAtual >= totalPaginas - 2) {
                    pageNum = totalPaginas - 4 + i;
                  } else {
                    pageNum = paginaAtual - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${paginaAtual === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(paginaAtual + 1)}
                disabled={paginaAtual === totalPaginas}
                className="p-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Seletor de itens por página */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Itens por página:</span>
              <select
                value={itensPorPagina}
                onChange={(e) => {
                  setItensPorPagina(Number(e.target.value));
                  setPaginaAtual(1);
                }}
                className="px-2 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}