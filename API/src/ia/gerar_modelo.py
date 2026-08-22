# src/ia/gerar_modelo.py
import pandas as pd
import numpy as np
import joblib
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import os

print("="*60)
print("GERANDO MODELO CART PARA CLASSIFICAÇÃO DE URGÊNCIA")
print("="*60)

# 1. Carregar os dados
print("\n1. Carregando dados...")
df = pd.read_csv('Base_Treinamento.csv', sep=',')

# 2. Remover colunas desnecessárias
print("2. Removendo colunas desnecessárias...")
df = df.drop(columns=['id', 'data_criacao'])

# 3. Converter tipo_chamado para números (1-based)
print("3. Convertendo tipo_chamado...")
mapeamento_tipo = {tipo: i + 1 for i, tipo in enumerate(df['tipo_chamado'].unique())}
df['tipo_chamado'] = df['tipo_chamado'].map(mapeamento_tipo)

# Salvar mapeamento para referência
with open('mapeamento_tipo.txt', 'w') as f:
    for tipo, codigo in mapeamento_tipo.items():
        f.write(f"{codigo}:{tipo}\n")
print(f"   ✓ {len(mapeamento_tipo)} tipos de chamado mapeados")

# 4. Converter urgencia para números (0-based)
print("4. Convertendo urgencia...")
mapeamento_urgencia = {urgencia: i for i, urgencia in enumerate(df['urgencia'].unique())}
df['urgencia'] = df['urgencia'].map(mapeamento_urgencia)

# Mostrar mapeamento das classes
print("   Mapeamento de classes:")
for classe, codigo in mapeamento_urgencia.items():
    print(f"     {classe} -> {codigo}")

# 5. Converter colunas Sim/Não
print("5. Convertendo colunas Sim/Não...")
for coluna in ['risco_vida_humana', 'risco_vida_animal', 'bloqueio_via']:
    df[coluna] = df[coluna].map({'Sim': 1, 'Não': 0})
print("   ✓ risco_vida_humana, risco_vida_animal, bloqueio_via convertidas")

# 6. Separar features e target
print("6. Separando features e target...")
X = df.drop('urgencia', axis=1).values
Y = df['urgencia'].values

# 7. Normalizar os dados
print("7. Normalizando dados...")
scaler = StandardScaler()
X = scaler.fit_transform(X)

# Salvar o scaler para usar na API
joblib.dump(scaler, 'scaler.pkl')
print("   ✓ Scaler salvo em scaler.pkl")

# 8. Dividir em treino e validação
print("8. Dividindo dados (80% treino, 20% validação)...")
X_train, X_validation, Y_train, Y_validation = train_test_split(
    X, Y, test_size=0.20, random_state=7, stratify=Y
)

# 9. Treinar o modelo CART
print("9. Treinando modelo CART...")
seed = 42
cart = DecisionTreeClassifier(max_depth=10, random_state=seed)
cart.fit(X_train, Y_train)

# 10. Salvar o modelo
print("10. Salvando modelo...")
#os.makedirs('src/ia', exist_ok=True)
joblib.dump(cart, 'modelo_cart.pkl')
print(f"   ✓ Modelo salvo em modelo_cart.pkl")

# 11. Avaliar o modelo
print("\n" + "="*60)
print("AVALIAÇÃO DO MODELO")
print("="*60)

from sklearn.metrics import accuracy_score, classification_report

# Avaliar no treino
Y_train_pred = cart.predict(X_train)
acc_train = accuracy_score(Y_train, Y_train_pred)
print(f"\nAcurácia no treino: {acc_train:.4f} ({acc_train*100:.2f}%)")

# Avaliar na validação
Y_val_pred = cart.predict(X_validation)
acc_val = accuracy_score(Y_validation, Y_val_pred)
print(f"Acurácia na validação: {acc_val:.4f} ({acc_val*100:.2f}%)")

# Relatório de classificação na validação
print("\nRelatório de Classificação (Validação):")
# Mapear de volta para os nomes das classes
target_names = list(mapeamento_urgencia.keys())
print(classification_report(Y_validation, Y_val_pred, target_names=target_names))

# 12. Informações finais
print("\n" + "="*60)
print("RESUMO FINAL")
print("="*60)
print(f"Features utilizadas: {list(df.drop('urgencia', axis=1).columns)}")
print(f"Total de amostras: {len(df)}")
print(f"Features esperadas pelo modelo: {cart.n_features_in_}")
print(f"Classes previstas: {cart.classes_} -> {target_names}")
print("\n✅ MODELO GERADO COM SUCESSO!")