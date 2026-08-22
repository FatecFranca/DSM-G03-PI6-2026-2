import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const api = {
  baseURL: API_URL,
  endpoints: {
    admin: {
      login: `${API_URL}/admin/login`,
    },
    gestor: {
      login: `${API_URL}/gestor/login`,
    }
  }
};

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: Number(process.env.NEXT_PUBLIC_API_TIMEOUT) || 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token automaticamente baseado na rota
apiClient.interceptors.request.use((config) => {
  // Verificar qual tipo de token deve ser usado baseado na URL
  const url = config.url || '';
  
  let token = null;
  
  // Se for rota de admin, usa token do admin
  if (Cookies.get('admin_token')) {
    token = Cookies.get('admin_token');
    //console.log('🔑 Usando token de ADMIN');
  } 
  // Se for rota de gestor, usa token do gestor
  else if (Cookies.get('gestor_token')) {
    token = Cookies.get('gestor_token');
    //console.log('🔑 Usando token de GESTOR');
  } 
  // Fallback: tenta qualquer token disponível
  else {
    token = Cookies.get('gestor_token') || Cookies.get('admin_token');
    //console.log('🔑 Usando token fallback');
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    //console.log(`✅ Token adicionado para ${url}`);
  } else {
    console.warn(`⚠️ Nenhum token encontrado para ${url}`);
  }
  
  return config;
});

// Interceptor para tratar erros de autenticação
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Erro 401 - Token inválido ou não fornecido');
      
      // Limpar cookies se houver erro de autenticação
      Cookies.remove('gestor_token');
      Cookies.remove('gestor_user');
      Cookies.remove('admin_token');
      Cookies.remove('admin_user');
      
      // Redirecionar para login baseado na URL da requisição
      const url = error.config?.url || '';
      if (url.includes('/gestor/')) {
        window.location.href = '/gestor/login';
      } else if (url.includes('/admin/')) {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);