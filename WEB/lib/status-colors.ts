// lib/status-colors.ts
export interface StatusColors {
  text: string;
  bg: string;
  border: string;
  dot: string;
  gradient: string;
}

export const STATUS_COLORS: Record<string, StatusColors> = {
  PROCESSAMENTO: {
    text: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-900/20',
    border: 'border-orange-300 dark:border-orange-700',
    dot: 'bg-orange-500',
    gradient: 'from-orange-500 to-orange-600',
  },
  PENDENTE: {
    text: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-100 dark:bg-yellow-900/20',
    border: 'border-yellow-300 dark:border-yellow-700',
    dot: 'bg-yellow-500',
    gradient: 'from-yellow-500 to-yellow-600',
  },
  ANALISADO: {
    text: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/20',
    border: 'border-blue-300 dark:border-blue-700',
    dot: 'bg-blue-500',
    gradient: 'from-blue-500 to-blue-600',
  },
  ATRIBUIDO: {
    text: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-100 dark:bg-indigo-900/20',
    border: 'border-indigo-300 dark:border-indigo-700',
    dot: 'bg-indigo-500',
    gradient: 'from-indigo-500 to-indigo-600',
  },
  EMATENDIMENTO: {
    text: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/20',
    border: 'border-purple-300 dark:border-purple-700',
    dot: 'bg-purple-500',
    gradient: 'from-purple-500 to-purple-600',
  },
  CONCLUIDO: {
    text: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/20',
    border: 'border-green-300 dark:border-green-700',
    dot: 'bg-green-500',
    gradient: 'from-green-500 to-green-600',
  },
  FALTAINFORMACAO: {
    text: 'text-pink-600 dark:text-pink-400',
    bg: 'bg-pink-100 dark:bg-pink-900/20',
    border: 'border-pink-300 dark:border-pink-700',
    dot: 'bg-pink-500',
    gradient: 'from-pink-500 to-pink-600',
  },
  RECUSADO: {
    text: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/20',
    border: 'border-red-300 dark:border-red-700',
    dot: 'bg-red-500',
    gradient: 'from-red-500 to-red-600',
  },
  CANCELADO: {
    text: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800',
    border: 'border-gray-300 dark:border-gray-700',
    dot: 'bg-gray-500',
    gradient: 'from-gray-500 to-gray-600',
  },
};