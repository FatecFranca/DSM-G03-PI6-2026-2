# src/ia/classificadorUrgencia.py
import sys
import json
import joblib
import numpy as np
import os
import warnings
warnings.filterwarnings('ignore')

# Caminhos dos arquivos
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, 'modelo_cart.pkl')
SCALER_PATH = os.path.join(SCRIPT_DIR, 'scaler.pkl')

class ClassificadorChamado:
    def __init__(self):
        self.modelo = None
        self.scaler = None
        self.carregar_modelo()
    
    def carregar_modelo(self):
        try:
            if os.path.exists(SCALER_PATH):
                self.scaler = joblib.load(SCALER_PATH)
                print("✅ Scaler carregado", file=sys.stderr)
            
            if os.path.exists(MODEL_PATH):
                self.modelo = joblib.load(MODEL_PATH)
                print(f"✅ Modelo carregado", file=sys.stderr)
            else:
                print(f"⚠️ Modelo não encontrado", file=sys.stderr)
        except Exception as e:
            print(f"❌ Erro: {e}", file=sys.stderr)
    
    def classificar(self, dados):
        if self.modelo is None:
            return self.classificar_fallback(dados)
        
        try:
            # Ordem correta: tipo_chamado, dias_problema, risco_vida_humana, risco_vida_animal, bloqueio_via
            features = np.array([
                float(dados.get('tipo_chamanado', 1)),
                float(dados.get('dias_problema', 1)),
                float(dados.get('risco_vida_humana', 0)),
                float(dados.get('risco_vida_animal', 0)),
                float(dados.get('bloqueio_via', 0))
            ]).reshape(1, -1)
            
            print(f"Features: {features[0].tolist()}", file=sys.stderr)
            
            if self.scaler is not None:
                features = self.scaler.transform(features)
            
            urgencia_code = int(self.modelo.predict(features)[0])
            print(f"Predição código: {urgencia_code}", file=sys.stderr)
            
            urgencia_map = {
                0: 'URGENTE',
                1: 'ALTA',
                2: 'MEDIA',
                3: 'BAIXA'
            }
            
            urgencia = urgencia_map.get(urgencia_code, 'MEDIA')
            
            return {'urgencia': urgencia}
            
        except Exception as e:
            print(f"Erro na predição: {e}", file=sys.stderr)
            return self.classificar_fallback(dados)
    
    def classificar_fallback(self, dados):
        dias = dados.get('dias_problema', 1)
        risco_humano = dados.get('risco_vida_humana', 0)
        risco_animal = dados.get('risco_vida_animal', 0)
        bloqueio = dados.get('bloqueio_via', 0)
        
        if risco_humano == 1:
            urgencia = 'URGENTE'
        elif risco_animal == 1 or bloqueio == 1:
            urgencia = 'ALTA'
        elif dias >= 30:
            urgencia = 'ALTA'
        elif dias >= 15:
            urgencia = 'MEDIA'
        else:
            urgencia = 'BAIXA'
        
        return {'urgencia': urgencia}

if __name__ == "__main__":
    # IMPORTANTE: Enviar sinal de pronto para o Node.js
    print("READY", flush=True)
    sys.stdout.flush()
    
    # Criar classificador uma única vez
    classificador = ClassificadorChamado()
    
    # Loop para processar múltiplas requisições
    while True:
        try:
            # Ler uma linha do stdin
            linha = sys.stdin.readline()
            
            if not linha:
                break
            
            linha = linha.strip()
            if not linha:
                continue
            
            # Processar a requisição
            dados = json.loads(linha)
            resultado = classificador.classificar(dados)
            
            # Enviar resposta
            print(json.dumps(resultado), flush=True)
            
        except json.JSONDecodeError as e:
            print(json.dumps({'error': f'JSON inválido: {str(e)}', 'urgencia': 'MEDIA'}), flush=True)
        except Exception as e:
            print(json.dumps({'error': str(e), 'urgencia': 'MEDIA'}), flush=True)