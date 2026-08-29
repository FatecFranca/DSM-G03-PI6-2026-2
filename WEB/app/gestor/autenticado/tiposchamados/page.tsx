"use client"

import { useState, useEffect, useMemo } from "react"
import {
    Tag,
    Search,
    Plus,
    Edit,
    ChevronLeft,
    ChevronRight,
    Filter,
    X,
    CheckCircle,
    XCircle,
    AlertCircle,
    RefreshCw,
    Eye,
    Building2,
    MessageSquare,
    Hash
} from "lucide-react"
import { useGestorAuth } from "@/app/contexts/GestorAuthContext"
import {
    listarTiposSuporte,
    alterarStatusTipoSuporte,
    type TipoSuporte,
    type TipoSuporteFilters
} from "@/lib/tipoSuporte-service"

// Componente de Modal de Confirmação
function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    type = "warning"
}: {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    type?: "warning" | "danger" | "info"
}) {
    if (!isOpen) return null

    const colors = {
        warning: {
            bg: "bg-yellow-100 dark:bg-yellow-900/20",
            text: "text-yellow-600 dark:text-yellow-400",
            button: "bg-yellow-600 hover:bg-yellow-700"
        },
        danger: {
            bg: "bg-red-100 dark:bg-red-900/20",
            text: "text-red-600 dark:text-red-400",
            button: "bg-red-600 hover:bg-red-700"
        },
        info: {
            bg: "bg-blue-100 dark:bg-blue-900/20",
            text: "text-blue-600 dark:text-blue-400",
            button: "bg-blue-600 hover:bg-blue-700"
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full mx-4">
                <div className="p-6">
                    <div className={`w-12 h-12 ${colors[type].bg} rounded-full flex items-center justify-center mx-auto mb-4`}>
                        {type === "warning" && <AlertCircle className={colors[type].text} size={24} />}
                        {type === "danger" && <XCircle className={colors[type].text} size={24} />}
                        {type === "info" && <CheckCircle className={colors[type].text} size={24} />}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 text-center mb-2">
                        {title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
                        {message}
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm()
                                onClose()
                            }}
                            className={`flex-1 px-4 py-2 ${colors[type].button} text-white rounded-lg transition-colors`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function TiposSuportePage() {
    const [tipos, setTipos] = useState<TipoSuporte[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filters, setFilters] = useState<TipoSuporteFilters>({})
    const [showFilters, setShowFilters] = useState(false)
    const [modalOpen, setModalOpen] = useState(false)
    const [modalLoading, setModalLoading] = useState(false)
    const [confirmModalOpen, setConfirmModalOpen] = useState(false)
    const [tipoToToggle, setTipoToToggle] = useState<TipoSuporte | null>(null)
    const [searchTerm, setSearchTerm] = useState("")

    const [paginaAtual, setPaginaAtual] = useState(1)
    const [itensPorPagina, setItensPorPagina] = useState(10)

    const { user } = useGestorAuth()

    useEffect(() => {
        carregarTipos()
    }, [filters])

    const carregarTipos = async () => {
        try {
            setIsLoading(true)
            setError(null)
            const response = await listarTiposSuporte(filters)
            setTipos(response.data)
            setPaginaAtual(1)
        } catch (err: any) {
            console.error('Erro ao carregar tipos de suporte:', err)
            setError(err.message || 'Não foi possível carregar os tipos de suporte')
        } finally {
            setIsLoading(false)
        }
    }

    // Filtrar localmente
    const tiposFiltrados = useMemo(() => {
        let filtered = [...tipos]

        // Filtro por busca
        if (searchTerm) {
            filtered = filtered.filter(t =>
                t.TipSupNom.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }

        // Filtro por status (se aplicado via filters)
        if (filters.status) {
            filtered = filtered.filter(t => t.TipSupStatus === filters.status)
        }

        return filtered
    }, [tipos, searchTerm, filters.status])

    // Calcular paginação
    const totalRegistros = tiposFiltrados.length
    const totalPaginas = Math.ceil(totalRegistros / itensPorPagina)
    const inicio = (paginaAtual - 1) * itensPorPagina
    const fim = inicio + itensPorPagina
    const tiposPaginados = tiposFiltrados.slice(inicio, fim)

    const handleFilterChange = (key: keyof TipoSuporteFilters, value: any) => {
        setFilters({ ...filters, [key]: value })
        setPaginaAtual(1)
    }

    const handlePageChange = (novaPagina: number) => {
        setPaginaAtual(novaPagina)
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        setPaginaAtual(1)
        handleFilterChange('nome', searchTerm || undefined)
    }

    const confirmToggleStatus = async () => {
        if (!tipoToToggle) return

        try {
            setModalLoading(true)
            const novoStatus = tipoToToggle.TipSupStatus === 'ATIVO' ? 'INATIVO' : 'ATIVO'
            await alterarStatusTipoSuporte(tipoToToggle.TipSupId, novoStatus)
            await carregarTipos()
        } catch (err: any) {
            console.error('Erro ao alterar status:', err)
            alert(err.message || 'Erro ao alterar status do tipo de suporte')
        } finally {
            setModalLoading(false)
            setTipoToToggle(null)
        }
    }

    const getStatusBadge = (status: string) => {
        const styles = {
            ATIVO: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            INATIVO: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
        }
        return styles[status as keyof typeof styles] || styles.INATIVO
    }

    // Resetar página quando busca ou filtro de status mudar
    useEffect(() => {
        setPaginaAtual(1)
    }, [searchTerm, filters.status])

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        Tipos de Chamados
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Gerencie os tipos de suporte disponíveis na unidade
                    </p>
                    {user?.Unidade && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                            <Building2 size={12} />
                            {user.Unidade.UnidadeNome}
                        </p>
                    )}
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                <div className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Busca */}
                        <form onSubmit={handleSearch} className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por nome do tipo..."
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
                            onClick={carregarTipos}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                            <span>Atualizar</span>
                        </button>
                    </div>

                    {/* Opções de filtro */}
                    {showFilters && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => handleFilterChange('status', undefined)}
                                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${!filters.status
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    Todos
                                </button>
                                <button
                                    onClick={() => handleFilterChange('status', 'ATIVO')}
                                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filters.status === 'ATIVO'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800'
                                        }`}
                                >
                                    ATIVO
                                </button>
                                <button
                                    onClick={() => handleFilterChange('status', 'INATIVO')}
                                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filters.status === 'INATIVO'
                                        ? 'bg-gray-600 text-white'
                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    INATIVO
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Error state */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            {/* Tabela */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : tiposFiltrados.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64">
                        <Tag size={48} className="text-gray-400 mb-4" />
                        <p className="text-gray-600 dark:text-gray-400 mb-2">Nenhum tipo de suporte encontrado</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        ID
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Nome
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Chamados
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {tiposPaginados.map((tipo) => (
                                    <tr key={tipo.TipSupId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                                            #{tipo.TipSupId}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                                <Tag size={16} className="text-gray-400" />
                                                {tipo.TipSupNom}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(tipo.TipSupStatus)}`}>
                                                {tipo.TipSupStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <MessageSquare size={14} />
                                                {tipo._count?.Chamado || 0}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Paginação */}
                {!isLoading && tiposFiltrados.length > 0 && (
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between flex-wrap gap-3">
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
                                    setItensPorPagina(Number(e.target.value))
                                    setPaginaAtual(1)
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

            <ConfirmModal
                isOpen={confirmModalOpen}
                onClose={() => setConfirmModalOpen(false)}
                onConfirm={confirmToggleStatus}
                title={tipoToToggle?.TipSupStatus === 'ATIVO' ? 'Inativar Tipo' : 'Ativar Tipo'}
                message={`Tem certeza que deseja ${tipoToToggle?.TipSupStatus === 'ATIVO' ? 'inativar' : 'ativar'} o tipo "${tipoToToggle?.TipSupNom}"?${tipoToToggle?.TipSupStatus === 'ATIVO' && (tipoToToggle?._count?.Chamado || 0) > 0 ? '\n\nAtenção: Existem chamados vinculados a este tipo. Ao inativá-lo, não será possível criar novos chamados com este tipo.' : ''}`}
                confirmText={tipoToToggle?.TipSupStatus === 'ATIVO' ? 'Inativar' : 'Ativar'}
                type={tipoToToggle?.TipSupStatus === 'ATIVO' ? 'danger' : 'info'}
            />
        </div>
    )
}