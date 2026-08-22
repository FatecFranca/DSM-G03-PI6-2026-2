"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Save,
  Ticket,
  Building2,
  User,
  Briefcase,
  Users,
  AlertTriangle,
  FileText,
  Loader2,
  Calendar1,
  SquareActivity,
  Stethoscope,
  Car,
  Tags
} from "lucide-react"
import { buscarChamadoPorId, alterarChamado, type Chamado } from "@/lib/chamado-service"
import { listarTiposSuporte, type TipoSuporte } from "@/lib/tipoSuporte-service"
import { listarEquipes, type Equipe } from "@/lib/equipe-service"

export default function EditarChamadoPage() {
  const params = useParams();
  const router = useRouter();
  const [chamado, setChamado] = useState<Chamado | null>(null);
  const [tiposSuporte, setTiposSuporte] = useState<TipoSuporte[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    ChamadoTitulo: "",
    ChamadoDescricaoInicial: "",
    TipSupId: "",
    EquipeId: "",
    ChamadoPrioridade: "",
    ChamadoUrgencia: "",
    ChamadoStatus: "",
    ChamadoDescricaoFormatada: "",
    ChamadoDiasComProblema: 0,
    ChamadoRiscoVidaHumana: false,
    ChamadoRiscoVidaAnimal: false,
    ChamadoBloqueioVia: false
  });

  useEffect(() => {
    if (params.id) {
      carregarDados();
    }
  }, [params.id]);

  const carregarDados = async () => {
    try {
      setIsLoading(true);
      const [chamadoData, tiposData, equipesData] = await Promise.all([
        buscarChamadoPorId(String(params.id)),
        listarTiposSuporte({ apenasAtivos: true }),
        listarEquipes({ status: 'ATIVA' })
      ]);

      setChamado(chamadoData);
      setTiposSuporte(tiposData.data || []);
      setEquipes(equipesData.data || []);

      // Preencher formulário com dados do chamado
      setFormData({
        ChamadoTitulo: chamadoData.ChamadoTitulo || "",
        ChamadoDescricaoInicial: chamadoData.ChamadoDescricaoInicial || "",
        ChamadoDescricaoFormatada: chamadoData.ChamadoDescricaoFormatada || "",
        TipSupId: chamadoData.TipSupId?.toString() || "",
        EquipeId: chamadoData.EquipeId || "",
        ChamadoPrioridade: chamadoData.ChamadoPrioridade?.toString() || "",
        ChamadoUrgencia: chamadoData.ChamadoUrgencia || "",
        ChamadoStatus: chamadoData.ChamadoStatus,
        ChamadoDiasComProblema: chamadoData.ChamadoDiasComProblema || 0,
        ChamadoRiscoVidaHumana: chamadoData.ChamadoRiscoVidaHumana || false,
        ChamadoRiscoVidaAnimal: chamadoData.ChamadoRiscoVidaAnimal || false,
        ChamadoBloqueioVia: chamadoData.ChamadoBloqueioVia || false
      });

    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Não foi possível carregar os dados do chamado');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSaving(true);

      const updateData: any = {};

      updateData.ChamadoTitulo = formData.ChamadoTitulo;

      updateData.ChamadoDescricaoInicial = formData.ChamadoDescricaoFormatada;

      if (formData.TipSupId !== (chamado?.TipSupId?.toString() || "")) {
        updateData.TipSupId = formData.TipSupId ? parseInt(formData.TipSupId) : null;
      }

      if (formData.EquipeId !== (chamado?.EquipeId || "")) {
        updateData.EquipeId = formData.EquipeId ? formData.EquipeId : null;
      }

      if (formData.ChamadoPrioridade !== (chamado?.ChamadoPrioridade?.toString() || "")) {
        updateData.ChamadoPrioridade = formData.ChamadoPrioridade ? parseInt(formData.ChamadoPrioridade) : null;
      }

      if (formData.ChamadoUrgencia !== (chamado?.ChamadoUrgencia || "")) {
        updateData.ChamadoUrgencia = formData.ChamadoUrgencia || null;
      }

      if (formData.ChamadoStatus !== chamado?.ChamadoStatus) {
        updateData.ChamadoStatus = formData.ChamadoStatus;
      }

      if (Object.keys(updateData).length === 0) {
        router.back();
        return;
      }

      await alterarChamado(String(params.id), updateData);
      router.push(`/gestor/autenticado/chamados/${params.id}`);

    } catch (err) {
      console.error('Erro ao salvar chamado:', err);

      // Type guard para verificar se é um erro da API
      if (err && typeof err === 'object' && 'response' in err) {
        const errorWithResponse = err as { response?: { data?: { error?: string } } };
        if (errorWithResponse.response?.data?.error) {
          alert(errorWithResponse.response.data.error);
        } else {
          alert('Não foi possível salvar as alterações');
        }
      } else {
        alert('Não foi possível salvar as alterações');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !chamado) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <p className="text-red-600 dark:text-red-400 mb-4">{error || 'Chamado não encontrado'}</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Voltar
        </button>
      </div>
    );
  }

  const urgencias = [
    { value: 'BAIXA', label: 'Baixa', icon: AlertTriangle },
    { value: 'MEDIA', label: 'Média', icon: AlertTriangle },
    { value: 'ALTA', label: 'Alta', icon: AlertTriangle },
    { value: 'URGENTE', label: 'Urgente', icon: AlertTriangle }
  ];

  const prioridades = [
    { value: '1', label: '1 - Muito Baixa' },
    { value: '2', label: '2 - Baixa' },
    { value: '3', label: '3 - Moderada' },
    { value: '4', label: '4 - Normal' },
    { value: '5', label: '5 - Média' },
    { value: '6', label: '6 - Importante' },
    { value: '7', label: '7 - Alta' },
    { value: '8', label: '8 - Muito Alta' },
    { value: '9', label: '9 - Crítica' },
    { value: '10', label: '10 - Emergência' }
  ];

  const statusOptions = [
    { value: 'PROCESSAMENTO', label: 'Em Processamento' },
    { value: 'PENDENTE', label: 'Pendente' },
    { value: 'ANALISADO', label: 'Analisado' },
    { value: 'ATRIBUIDO', label: 'Atribuído' },
    { value: 'EMATENDIMENTO', label: 'Em Atendimento' },
    { value: 'CONCLUIDO', label: 'Concluído' },
    { value: 'CANCELADO', label: 'Cancelado' },
    { value: 'RECUSADO', label: 'Recusado' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Editar Chamado #{chamado.ChamadoN1}-{chamado.ChamadoN2}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {chamado.Pessoa.PessoaNome} - {chamado.Unidade.UnidadeNome}
            </p>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Salvando...</span>
            </>
          ) : (
            <>
              <Save size={18} />
              <span>Salvar Alterações</span>
            </>
          )}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações do Chamado */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Ticket size={20} />
            Informações do Chamado
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Título */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Título
              </label>
              <input
                type="text"
                value={formData.ChamadoTitulo}
                onChange={(e) => handleInputChange('ChamadoTitulo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Descrição Inicial */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Descrição Inicial (Não alterável)
              </label>
              <textarea
                value={formData.ChamadoDescricaoInicial}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-transparent focus:outline-none focus:ring-0"
                readOnly
              />

            </div>

            {/* Descrição Formatada */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Descrição Formatada
              </label>
              <textarea
                value={formData.ChamadoDescricaoFormatada}
                onChange={(e) => handleInputChange('ChamadoDescricaoFormatada', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Tipo de Suporte */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Briefcase size={16} />
                Tipo de Chamado
              </label>
              <select
                value={formData.TipSupId}
                onChange={(e) => handleInputChange('TipSupId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled
              >
                <option value="">Selecione um tipo de suporte</option>
                {tiposSuporte.map((tipo) => (
                  <option key={tipo.TipSupId} value={tipo.TipSupId}>
                    {tipo.TipSupNom}
                  </option>
                ))}
              </select>
            </div>

            {/* Dias com o Problema */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Calendar1 size={16} />
                Dias com o Problema
              </label>
              <input type="number" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent" value={formData.ChamadoDiasComProblema} onChange={(e) => handleInputChange('ChamadoDiasComProblema', e.target.value)} disabled />
            </div>

            {/* Ocasiona Rico a Vidas Humanas? */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <SquareActivity size={16} />
                Ocasiona Rico a Vidas Humanas?
              </label>
              <select
                value={formData.ChamadoRiscoVidaHumana ? 'SIM' : 'NAO'}
                onChange={(e) => handleInputChange('ChamadoRiscoVidaHumana', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled
              >
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </div>

            {/* Ocasiona Rico a Vidas de Animais? */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Stethoscope size={16} />
                Ocasiona Rico a Vidas de Animais?
              </label>
              <select
                value={formData.ChamadoRiscoVidaAnimal ? 'SIM' : 'NAO'}
                onChange={(e) => handleInputChange('ChamadoRiscoVidaAnimal', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled
              >
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </div>

            {/* Via/Rua está bloqueada pelo problema? */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Car size={16} />
                Via/Rua está bloqueada pelo problema?
              </label>
              <select
                value={formData.ChamadoBloqueioVia ? 'SIM' : 'NAO'}
                onChange={(e) => handleInputChange('ChamadoBloqueioVia', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled
              >
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </div>

            {/* Equipe Responsável */}
            {chamado.ChamadoStatus === 'ATRIBUIDO' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Users size={16} />
                  Equipe Responsável
                </label>
                <select
                  value={formData.EquipeId}
                  onChange={(e) => handleInputChange('EquipeId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {equipes.map((equipe) => (
                    <option key={equipe.EquipeId} value={equipe.EquipeId}>
                      {equipe.EquipeNome}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Prioridade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Tags size={16} />
                Prioridade (1-10)
              </label>
              <select
                value={formData.ChamadoPrioridade}
                onChange={(e) => handleInputChange('ChamadoPrioridade', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione a prioridade</option>
                {prioridades.map((prioridade) => (
                  <option key={prioridade.value} value={prioridade.value}>
                    {prioridade.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Urgência */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <AlertTriangle size={16} />
                Urgência
              </label>
              <select
                value={formData.ChamadoUrgencia}
                onChange={(e) => handleInputChange('ChamadoUrgencia', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione a urgência</option>
                {urgencias.map((urgencia) => (
                  <option key={urgencia.value} value={urgencia.value}>
                    {urgencia.label}
                  </option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* Informações do Solicitante (readonly) */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <User size={20} />
            Informações do Solicitante
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nome
              </label>
              <p className="text-gray-900 dark:text-gray-100">{chamado.Pessoa.PessoaNome}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <p className="text-gray-900 dark:text-gray-100">{chamado.Pessoa.PessoaEmail || 'N/A'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Telefone
              </label>
              <p className="text-gray-900 dark:text-gray-100">{chamado.Pessoa.PessoaTelefone || 'N/A'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Building2 size={16} />
                Unidade
              </label>
              <p className="text-gray-900 dark:text-gray-100">{chamado.Unidade.UnidadeNome}</p>
            </div>
          </div>
        </div>

        {/* Datas (readonly) */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <FileText size={20} />
            Datas
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Data de Abertura
              </label>
              <p className="text-gray-900 dark:text-gray-100">
                {new Date(chamado.ChamadoDtAbertura).toLocaleString('pt-BR')}
              </p>
            </div>

            {chamado.ChamadoDtEncerramento && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Data de Encerramento
                </label>
                <p className="text-gray-900 dark:text-gray-100">
                  {new Date(chamado.ChamadoDtEncerramento).toLocaleString('pt-BR')}
                </p>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}