import json
import os

# Lista dos arquivos na ordem desejada
arquivos = ['Pre_Processamento_Base.ipynb', 'Extracao_Padrao.ipynb']
celulas_combinadas = []
metadata_kernel = None

for arquivo in arquivos:
    if not os.path.exists(arquivo):
        print(f"ERRO: Arquivo '{arquivo}' não encontrado!")
        exit(1)
    
    with open(arquivo, 'r', encoding='utf-8') as f:
        notebook = json.load(f)
        
        # Salvar a metadata do primeiro notebook como referência
        if metadata_kernel is None and 'metadata' in notebook:
            metadata_kernel = notebook['metadata'].get('kernelspec', None)
        
        # Adicionar todas as células
        if 'cells' in notebook:
            celulas_combinadas.extend(notebook['cells'])

# Criar notebook combinado
notebook_combinado = {
    "cells": celulas_combinadas,
    "metadata": {
        "kernelspec": metadata_kernel or {
            "display_name": "Python 3",
            "language": "python",
            "name": "python3"
        },
        "language_info": {
            "name": "python",
            "version": "3.11.0"
        }
    },
    "nbformat": 4,
    "nbformat_minor": 5
}

# Salvar resultado
output_file = 'unido.ipynb'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(notebook_combinado, f, indent=1, ensure_ascii=False)

print(f"✅ Arquivos combinados com sucesso em '{output_file}'")
print(f"📊 Total de células: {len(celulas_combinadas)}")