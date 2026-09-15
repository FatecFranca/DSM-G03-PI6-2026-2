# src/ia/classificadorUrgencia.py
import sys
import json
import joblib
import numpy as np
import os
import re
import warnings
warnings.filterwarnings('ignore')

import spacy
from spacy.matcher import Matcher, PhraseMatcher
from spacy.tokens import Span

# Caminhos dos arquivos
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, 'modelo_cart.pkl')
SCALER_PATH = os.path.join(SCRIPT_DIR, 'scaler.pkl')

# =============================================
# CARREGAR MODELO spaCy PORTUGUÊS
# =============================================
try:
    nlp = spacy.load("pt_core_news_lg")
    print("✅ Modelo spaCy pt_core_news_lg carregado", file=sys.stderr)
except OSError:
    print("⚠️ Modelo pt_core_news_lg não encontrado. Instale com: python -m spacy download pt_core_news_lg", file=sys.stderr)
    nlp = None


class ExtratorDadosChamado:
    """Extrai dados estruturados da descrição do chamado usando spaCy + Regras"""
    
    def __init__(self):
        self.nlp = nlp
        self._configurar_matchers()
    
    def _configurar_matchers(self):
        """Configura os matchers de padrões linguísticos"""
        if not self.nlp:
            return
        
        self.matcher = Matcher(self.nlp.vocab)
        self.phrase_matcher = PhraseMatcher(self.nlp.vocab, attr="LOWER")
        
        # =============================================
        # PADRÕES PARA RISCO DE VIDA HUMANA
        # =============================================
        # Padrão: [substantivo/pessoa] + [verbo risco] + [contexto]
        self.matcher.add("RISCO_HUMANO_VERBO", [
            # "risco de vida", "risco à vida"
            [{"LOWER": "risco"}, {"LOWER": "de"}, {"LOWER": "vida"}],
            [{"LOWER": "risco"}, {"LOWER": "a"}, {"LOWER": "vida"}],
            [{"LOWER": "perigo"}, {"LOWER": "de"}, {"LOWER": "vida"}],
            [{"LOWER": "perigo"}, {"LOWER": "de"}, {"LOWER": "morte"}],
            # "pode morrer", "vai morrer"
            [{"LOWER": "pode"}, {"LOWER": "morrer"}],
            [{"LOWER": "vai"}, {"LOWER": "morrer"}],
            [{"LOWER": "esta"}, {"LOWER": "morrendo"}],
            # "ferido grave", "ferimento grave"
            [{"LOWER": "ferido"}, {"LOWER": "grave"}],
            [{"LOWER": "ferimento"}, {"LOWER": "grave"}],
            [{"LOWER": "gravemente"}, {"LOWER": "ferido"}],
            # "socorro urgente"
            [{"LOWER": "socorro"}, {"LOWER": "urgente"}],
            [{"LOWER": "emergencia"}],
        ])
        
        # Padrão: [pessoa/criança/idoso] + [contexto de risco]
        self.matcher.add("RISCO_HUMANO_PESSOA", [
            # "criança em risco", "criança sozinha"
            [{"LOWER": {"IN": ["crianca", "criança", "idoso", "idosa", "deficiente", "gestante"]}},
             {"LOWER": {"IN": ["em", "com", "sozinha", "sozinho", "perdida", "perdido"]}}],
            # "pessoa ferida", "pessoa caida"
            [{"LOWER": {"IN": ["pessoa", "homem", "mulher", "senhor", "senhora"]}},
             {"LOWER": {"IN": ["ferida", "ferido", "caida", "caido", "machucada", "machucado", "sangrando"]}}],
        ])
        
        # =============================================
        # PADRÕES PARA RISCO DE VIDA ANIMAL
        # =============================================
        self.matcher.add("RISCO_ANIMAL", [
            # "animal ferido", "animal atropelado"
            [{"LOWER": {"IN": ["animal", "cachorro", "gato", "cao", "cão", "passaro", "pássaro", "ave"]}},
             {"LOWER": {"IN": ["ferido", "atropelado", "machucado", "preso", "abandonado", "doente", "morrendo", "envenenado"]}}],
            # "risco animal", "risco de vida animal"
            [{"LOWER": "risco"}, {"LOWER": "animal"}],
            [{"LOWER": "risco"}, {"LOWER": "de"}, {"LOWER": "vida"}, {"LOWER": "animal"}],
        ])
        
        # =============================================
        # PADRÕES PARA BLOQUEIO DE VIA
        # =============================================
        self.matcher.add("BLOQUEIO_VIA", [
            # "rua bloqueada", "via interditada", "estrada fechada"
            [{"LOWER": {"IN": ["rua", "avenida", "via", "estrada", "rodovia", "travessa", "alameda", "praca", "praça"]}},
             {"LOWER": {"IN": ["bloqueada", "bloqueado", "interditada", "interditado", "fechada", "fechado"]}}],
            # "bloqueio total", "bloqueio parcial"
            [{"LOWER": "bloqueio"}, {"LOWER": {"IN": ["total", "parcial"]}}],
            # "não consigo passar", "impossível passar"
            [{"LOWER": {"IN": ["nao", "não"]}}, {"LOWER": "consigo"}, {"LOWER": "passar"}],
            [{"LOWER": "impossivel"}, {"LOWER": "passar"}],
            [{"LOWER": "impossível"}, {"LOWER": "passar"}],
            # "árvore caída", "árvore na via"
            [{"LOWER": {"IN": ["arvore", "árvore"]}},
             {"LOWER": {"IN": ["caida", "caída", "caiu", "na", "sobre"]}}],
            # "buraco na via"
            [{"LOWER": "buraco"}, {"LOWER": {"IN": ["na", "em"]}}, {"LOWER": {"IN": ["via", "rua", "avenida"]}}],
            # "alagamento", "enchente", "inundação"
            [{"LOWER": {"IN": ["alagamento", "alagado", "enchente", "inundacao", "inundação", "deslizamento", "desmoronamento"]}}],
        ])
        
        # =============================================
        # FRASES PARA TIPO DE CHAMADO (PhraseMatcher)
        # =============================================
        # Tipos: 1=Iluminação, 2=Buracos/Vias, 3=Limpeza, 4=Saneamento, 5=Segurança,
        #        6=Meio Ambiente, 7=Saúde, 8=Educação, 9=Transporte, 10=Obras
        
        # =============================================
        # TIPOS DE CHAMADO - PALAVRAS-CHAVE
        # =============================================
        self.tipos_frases = {
            # ==========================================
            # ILUMINAÇÃO E POSTES (1, 2, 7, 19)
            # ==========================================
            
            # 1 - Outros Problemas com Postes
            1: [
                "outros problemas com postes", "problema com poste", "problema no poste",
                "poste com problema", "poste danificado", "poste torto", "poste inclinado",
                "poste quebrado", "poste rachado", "poste com infiltracao", "poste com infiltração",
                "poste com buraco", "poste com corrosao", "poste com corrosão",
                "poste com fios soltos", "poste com fios expostos", "poste com fios caindo",
                "poste com risco", "poste com perigo", "poste sem placa", "poste sem identificacao",
                "poste sem identificação", "poste com publicidade", "poste com cartaz",
                "poste com cartazes", "poste com faixa", "poste com faixas",
                "poste com pichacao", "poste com pichação", "poste com grafite",
                "poste com adesivo", "poste com adesivos", "poste com cola",
                "poste com tinta", "poste com sujeira", "poste com lixo",
                "poste com ninho", "poste com passaro", "poste com pássaro",
                "poste com abelha", "poste com marimbondo", "poste com vespa",
                "poste com cupim", "poste com cupins", "poste com cupinzeiro",
                "poste com formiga", "poste com formigas", "poste com inseto",
                "poste com insetos", "poste com aranha", "poste com aranhas",
                "poste com morcego", "poste com morcegos", "poste com rato",
                "poste com ratos", "poste com pombo", "poste com pombos",
                "poste com urubu", "poste com urubus", "poste com gato",
                "poste com gatos", "poste com cachorro", "poste com cachorros",
                "poste com animal", "poste com animais", "poste com vegetacao",
                "poste com vegetação", "poste com mato", "poste com planta",
                "poste com plantas", "poste com trepadeira", "poste com trepadeiras",
                "poste com arvore", "poste com árvore", "poste com galho",
                "poste com galhos", "poste com folha", "poste com folhas",
                "poste com raiz", "poste com raizes", "poste com raízes",
                "poste com cupim", "poste com cupins", "poste com apodrecido",
                "poste com apodrecida", "poste com mofado", "poste com mofada",
                "poste com enferrujado", "poste com enferrujada", "poste com oxidado",
                "poste com oxidada", "poste com desgastado", "poste com desgastada",
                "poste com velho", "poste com velha", "poste com antigo",
                "poste com antiga", "poste com novo", "poste com nova",
                "poste com reforma", "poste com manutencao", "poste com manutenção",
                "poste com reparo", "poste com conserto", "poste com troca",
                "poste com substituicao", "poste com substituição", "poste com instalacao",
                "poste com instalação", "poste com remocao", "poste com remoção",
                "poste com retirada", "poste com colocacao", "poste com colocação"
            ],
            
            # 2 - Luz Queimada Poste
            2: [
                "luz queimada poste", "luz queimada no poste", "lampada queimada poste",
                "lâmpada queimada poste", "lampada queimada no poste", "lâmpada queimada no poste",
                "luz apagada poste", "luz apagada no poste", "lampada apagada poste",
                "lâmpada apagada poste", "lampada apagada no poste", "lâmpada apagada no poste",
                "luz do poste queimada", "luz do poste apagada", "lampada do poste queimada",
                "lâmpada do poste queimada", "lampada do poste apagada", "lâmpada do poste apagada",
                "luz do poste nao acende", "luz do poste não acende", "lampada do poste nao acende",
                "lâmpada do poste não acende", "luz do poste nao liga", "luz do poste não liga",
                "lampada do poste nao liga", "lâmpada do poste não liga", "luz do poste nao funciona",
                "luz do poste não funciona", "lampada do poste nao funciona",
                "lâmpada do poste não funciona", "luz do poste com problema",
                "lampada do poste com problema", "lâmpada do poste com problema",
                "luz do poste quebrada", "lampada do poste quebrada", "lâmpada do poste quebrada",
                "luz do poste danificada", "lampada do poste danificada", "lâmpada do poste danificada",
                "luz do poste sem funcionar", "lampada do poste sem funcionar",
                "lâmpada do poste sem funcionar", "luz do poste piscando",
                "lampada do poste piscando", "lâmpada do poste piscando",
                "luz do poste intermitente", "lampada do poste intermitente",
                "lâmpada do poste intermitente", "luz do poste fraca",
                "lampada do poste fraca", "lâmpada do poste fraca",
                "luz do poste baixa", "lampada do poste baixa", "lâmpada do poste baixa",
                "luz do poste queimou", "lampada do poste queimou", "lâmpada do poste queimou",
                "luz do poste apagou", "lampada do poste apagou", "lâmpada do poste apagou",
                "luz do poste parou", "lampada do poste parou", "lâmpada do poste parou",
                "luz do poste falhou", "lampada do poste falhou", "lâmpada do poste falhou",
                "luz do poste com defeito", "lampada do poste com defeito",
                "lâmpada do poste com defeito", "luz do poste com curto",
                "lampada do poste com curto", "lâmpada do poste com curto",
                "luz do poste com mau contato", "lampada do poste com mau contato",
                "lâmpada do poste com mau contato", "luz do poste sem luminosidade",
                "lampada do poste sem luminosidade", "lâmpada do poste sem luminosidade"
            ],
            
            # 7 - Poste Caído
            7: [
                "poste caido", "poste caído", "poste caiu", "poste caindo",
                "poste no chao", "poste no chão", "poste no solo", "poste no chão",
                "poste derrubado", "poste derrubada", "poste tombado", "poste tombada",
                "poste deitado", "poste deitada", "poste deitado no chao", "poste deitado no chão",
                "poste deitada no chao", "poste deitada no chão", "poste caiu na rua",
                "poste caiu na calçada", "poste caiu na calcada", "poste caiu na via",
                "poste caiu na avenida", "poste caiu na estrada", "poste caiu na rodovia",
                "poste caiu no chao", "poste caiu no chão", "poste caiu no solo",
                "poste caiu em cima", "poste caiu sobre", "poste caiu em cima de",
                "poste caiu sobre", "poste caiu em cima do carro", "poste caiu sobre o carro",
                "poste caiu em cima da casa", "poste caiu sobre a casa",
                "poste caiu em cima do muro", "poste caiu sobre o muro",
                "poste caiu em cima da arvore", "poste caiu sobre a arvore",
                "poste caiu em cima da árvore", "poste caiu sobre a árvore",
                "poste caiu em cima do fio", "poste caiu sobre o fio",
                "poste caiu em cima dos fios", "poste caiu sobre os fios",
                "poste caiu em cima da rede", "poste caiu sobre a rede",
                "poste caiu em cima da fiação", "poste caiu sobre a fiação",
                "poste caiu em cima da fiacao", "poste caiu sobre a fiacao",
                "poste caiu em cima do poste", "poste caiu sobre o poste",
                "poste caiu em cima da rua", "poste caiu sobre a rua",
                "poste caiu em cima da via", "poste caiu sobre a via",
                "poste caiu em cima da pista", "poste caiu sobre a pista",
                "poste caiu em cima do asfalto", "poste caiu sobre o asfalto",
                "poste caiu em cima da calçada", "poste caiu sobre a calçada",
                "poste caiu em cima da calcada", "poste caiu sobre a calcada"
            ],
            
            # 19 - Luz Queimada (genérico)
            19: [
                "luz queimada", "luz apagada", "luz nao acende", "luz não acende",
                "luz nao liga", "luz não liga", "luz nao funciona", "luz não funciona",
                "luz com problema", "luz quebrada", "luz danificada",
                "luz sem funcionar", "luz piscando", "luz intermitente",
                "luz fraca", "luz baixa", "luz queimou", "luz apagou",
                "luz parou", "luz falhou", "luz com defeito", "luz com curto",
                "luz com mau contato", "luz sem luminosidade",
                "lampada queimada", "lâmpada queimada", "lampada apagada", "lâmpada apagada",
                "lampada nao acende", "lâmpada não acende", "lampada nao liga", "lâmpada não liga",
                "lampada nao funciona", "lâmpada não funciona", "lampada com problema",
                "lâmpada com problema", "lampada quebrada", "lâmpada quebrada",
                "lampada danificada", "lâmpada danificada", "lampada sem funcionar",
                "lâmpada sem funcionar", "lampada piscando", "lâmpada piscando",
                "lampada intermitente", "lâmpada intermitente", "lampada fraca", "lâmpada fraca",
                "lampada baixa", "lâmpada baixa", "lampada queimou", "lâmpada queimou",
                "lampada apagou", "lâmpada apagou", "lampada parou", "lâmpada parou",
                "lampada falhou", "lâmpada falhou", "lampada com defeito", "lâmpada com defeito",
                "lampada com curto", "lâmpada com curto", "lampada com mau contato",
                "lâmpada com mau contato", "lampada sem luminosidade", "lâmpada sem luminosidade"
            ],
            
            # ==========================================
            # ANIMAIS (3, 4, 5, 17)
            # ==========================================
            
            # 3 - Problema com Animal Doméstico
            3: [
                "animal domestico", "animal doméstico", "cachorro", "gato", "cao", "cão",
                "cachorra", "cadela", "gata", "gato", "coelho", "coelha", "hamster",
                "porquinho da india", "porquinho da índia", "passaro domestico", "pássaro doméstico",
                "papagaio", "periquito", "calopsita", "canario", "canário", "tartaruga",
                "peixe", "aquario", "aquário", "animal de estimacao", "animal de estimação",
                "pet", "pets", "animal ferido", "animal doente", "animal machucado",
                "animal atropelado", "animal abandonado", "animal preso", "animal solto",
                "animal agressivo", "animal bravo", "animal com raiva", "animal com doenca",
                "animal com doença", "animal com ferimento", "animal com fratura",
                "animal com sangramento", "animal com problema", "animal com risco",
                "animal em perigo", "animal em risco", "animal em sofrimento",
                "animal com dor", "animal com fome", "animal com sede",
                "animal com frio", "animal com calor", "animal com medo",
                "animal com estresse", "animal com ansiedade", "animal com depressao",
                "animal com depressão", "animal com cancer", "animal com câncer",
                "animal com tumores", "animal com tumor", "animal com verme",
                "animal com vermes", "animal com pulga", "animal com pulgas",
                "animal com carrapato", "animal com carrapatos", "animal com sarna",
                "animal com micose", "animal com fungos", "animal com bacteria",
                "animal com bactéria", "animal com virus", "animal com vírus",
                "animal com infeccao", "animal com infecção", "animal com inflamacao",
                "animal com inflamação", "animal com alergia", "animal com alergias"
            ],
            
            # 4 - Problema com Animal Selvagem
            4: [
                "animal selvagem", "animal silvestre", "animal bravio", "animal nativo",
                "animal exotico", "animal exótico", "animal peconhento", "animal peçonhento",
                "animal venenoso", "animal perigoso", "animal feroz", "animal agressivo",
                "cobra", "serpente", "cascavel", "jararaca", "coral", "sucuri", "jiboia",
                "aranha", "aranha armadeira", "aranha marrom", "viuva negra", "caranguejeira",
                "escorpiao", "escorpião", "lacraia", "centopeia", "centopeia",
                "tatu", "gamba", "gambá", "sarue", "saruê", "raposa", "lobo",
                "onca", "onça", "puma", "jaguar", "jacare", "jacaré", "crocodilo",
                "capivara", "anta", "veado", "cervo", "macaco", "bugio", "sagui",
                "mico", "tucano", "arara", "papagaio selvagem", "periquito selvagem",
                "coruja", "gaviao", "gavião", "falcao", "falcão", "urubu",
                "morcego", "morcegos", "rato", "ratos", "camundongo", "camundongos",
                "esquilo", "esquilos", "prea", "preá", "cotia", "cutia",
                "paca", "pacas", "quati", "quatis", "mão pelada", "mao pelada",
                "animal silvestre ferido", "animal selvagem ferido", "animal silvestre doente",
                "animal selvagem doente", "animal silvestre atropelado", "animal selvagem atropelado",
                "animal silvestre preso", "animal selvagem preso", "animal silvestre abandonado",
                "animal selvagem abandonado", "animal silvestre em perigo", "animal selvagem em perigo",
                "animal silvestre em risco", "animal selvagem em risco"
            ],
            
            # 5 - Animal Perdido
            5: [
                "animal perdido", "animal desaparecido", "animal sumido", "animal fugiu",
                "animal escapou", "animal solto", "animal na rua", "animal na via",
                "animal na estrada", "animal na rodovia", "animal na avenida",
                "animal na praca", "animal na praça", "animal no parque",
                "animal no bairro", "animal na vizinhanca", "animal na vizinhança",
                "cachorro perdido", "cachorro desaparecido", "cachorro sumido",
                "cachorro fugiu", "cachorro escapou", "cachorro solto",
                "cachorro na rua", "cachorro na via", "cachorro na estrada",
                "gato perdido", "gato desaparecido", "gato sumido",
                "gato fugiu", "gato escapou", "gato solto",
                "gato na rua", "gato na via", "gato na estrada",
                "animal de estimacao perdido", "animal de estimação perdido",
                "animal de estimacao desaparecido", "animal de estimação desaparecido",
                "pet perdido", "pet desaparecido", "pet sumido",
                "pet fugiu", "pet escapou", "pet solto",
                "encontrei um animal", "encontrei um cachorro", "encontrei um gato",
                "achei um animal", "achei um cachorro", "achei um gato",
                "animal abandonado", "cachorro abandonado", "gato abandonado",
                "animal largado", "cachorro largado", "gato largado",
                "animal jogado", "cachorro jogado", "gato jogado",
                "animal na chuva", "cachorro na chuva", "gato na chuva",
                "animal no sol", "cachorro no sol", "gato no sol",
                "animal com frio", "cachorro com frio", "gato com frio",
                "animal com fome", "cachorro com fome", "gato com fome",
                "animal com sede", "cachorro com sede", "gato com sede",
                "animal machucado na rua", "cachorro machucado na rua", "gato machucado na rua",
                "animal atropelado na rua", "cachorro atropelado na rua", "gato atropelado na rua"
            ],
            
            # 17 - Animal Morto no Parque/Praça
            17: [
                "animal morto", "animal morto no parque", "animal morto na praca",
                "animal morto na praça", "animal morto no jardim", "animal morto na area verde",
                "animal morto na área verde", "animal morto no gramado", "animal morto na grama",
                "cachorro morto", "cachorro morto no parque", "cachorro morto na praca",
                "cachorro morto na praça", "gato morto", "gato morto no parque",
                "gato morto na praca", "gato morto na praça", "passaro morto",
                "pássaro morto", "ave morta", "ave morta no parque", "ave morta na praca",
                "ave morta na praça", "animal sem vida", "animal sem vida no parque",
                "animal sem vida na praca", "animal sem vida na praça",
                "carcaca de animal", "carcaça de animal", "carcaca no parque",
                "carcaça no parque", "carcaca na praca", "carcaça na praça",
                "animal em decomposicao", "animal em decomposição",
                "animal em decomposicao no parque", "animal em decomposição no parque",
                "animal em decomposicao na praca", "animal em decomposição na praça",
                "animal com mau cheiro", "animal com cheiro ruim", "animal com odor",
                "animal com feder", "animal fedendo", "animal fedorento",
                "animal com urubus", "animal com urubu", "animal com moscas",
                "animal com mosca", "animal com vermes", "animal com verme",
                "animal com larvas", "animal com larva", "animal com bichos",
                "animal com bicho", "animal com insetos", "animal com inseto"
            ],
            
            # ==========================================
            # ÁRVORES E VEGETAÇÃO (6, 9, 10, 11, 13)
            # ==========================================
            
            # 6 - Remoção de Árvore ou Tocos
            6: [
                "remocao de arvore", "remoção de árvore", "remocao de arvores", "remoção de árvores",
                "remocao de toco", "remoção de toco", "remocao de tocos", "remoção de tocos",
                "corte de arvore", "corte de árvore", "corte de arvores", "corte de árvores",
                "corte de toco", "corte de tocos", "derrubada de arvore", "derrubada de árvore",
                "derrubada de arvores", "derrubada de árvores", "derrubar arvore", "derrubar árvore",
                "derrubar arvores", "derrubar árvores", "tirar arvore", "tirar árvore",
                "tirar arvores", "tirar árvores", "retirar arvore", "retirar árvore",
                "retirar arvores", "retirar árvores", "remover arvore", "remover árvore",
                "remover arvores", "remover árvores", "arvore morta", "árvore morta",
                "arvores mortas", "árvores mortas", "arvore seca", "árvore seca",
                "arvores secas", "árvores secas", "arvore doente", "árvore doente",
                "arvores doentes", "árvores doentes", "arvore com cupim", "árvore com cupim",
                "arvores com cupim", "árvores com cupim", "arvore com praga", "árvore com praga",
                "arvores com praga", "árvores com praga", "arvore com fungo", "árvore com fungo",
                "arvores com fungo", "árvores com fungo", "arvore com infestacao", "árvore com infestação",
                "arvores com infestacao", "árvores com infestação", "arvore com risco", "árvore com risco",
                "arvores com risco", "árvores com risco", "arvore com perigo", "árvore com perigo",
                "arvores com perigo", "árvores com perigo", "arvore caindo", "árvore caindo",
                "arvores caindo", "árvores caindo", "arvore inclinada", "árvore inclinada",
                "arvores inclinadas", "árvores inclinadas", "arvore torta", "árvore torta",
                "arvores tortas", "árvores tortas", "toco de arvore", "toco de árvore",
                "tocos de arvore", "tocos de árvore", "toco no chao", "toco no chão",
                "tocos no chao", "tocos no chão", "toco na calcada", "toco na calçada",
                "tocos na calcada", "tocos na calçada", "toco na rua", "toco na via",
                "tocos na rua", "tocos na via", "toco no passeio", "tocos no passeio"
            ],
            
            # 9 - Árvore ou Galhos Caídos
            9: [
                "arvore caida", "árvore caída", "arvores caidas", "árvores caídas",
                "arvore caiu", "árvore caiu", "arvores cairam", "árvores caíram",
                "galho caido", "galho caído", "galhos caidos", "galhos caídos",
                "galho caiu", "galhos cairam", "galhos caíram",
                "arvore na rua", "árvore na rua", "arvores na rua", "árvores na rua",
                "arvore na via", "árvore na via", "arvores na via", "árvores na via",
                "arvore na estrada", "árvore na estrada", "arvores na estrada", "árvores na estrada",
                "arvore na rodovia", "árvore na rodovia", "arvores na rodovia", "árvores na rodovia",
                "arvore na avenida", "árvore na avenida", "arvores na avenida", "árvores na avenida",
                "arvore na calcada", "árvore na calçada", "arvores na calcada", "árvores na calçada",
                "arvore no passeio", "árvore no passeio", "arvores no passeio", "árvores no passeio",
                "arvore em cima", "árvore em cima", "arvores em cima", "árvores em cima",
                "arvore sobre", "árvore sobre", "arvores sobre", "árvores sobre",
                "arvore em cima do carro", "árvore em cima do carro",
                "arvore sobre o carro", "árvore sobre o carro",
                "arvore em cima da casa", "árvore em cima da casa",
                "arvore sobre a casa", "árvore sobre a casa",
                "arvore em cima do muro", "árvore em cima do muro",
                "arvore sobre o muro", "árvore sobre o muro",
                "arvore em cima da fiacao", "árvore em cima da fiação",
                "arvore sobre a fiacao", "árvore sobre a fiação",
                "arvore em cima do poste", "árvore em cima do poste",
                "arvore sobre o poste", "árvore sobre o poste",
                "arvore em cima da rede", "árvore em cima da rede",
                "arvore sobre a rede", "árvore sobre a rede",
                "galho na rua", "galhos na rua", "galho na via", "galhos na via",
                "galho na estrada", "galhos na estrada", "galho na rodovia", "galhos na rodovia",
                "galho na calcada", "galhos na calcada", "galho na calçada", "galhos na calçada",
                "galho em cima", "galhos em cima", "galho sobre", "galhos sobre",
                "galho em cima do carro", "galhos em cima do carro",
                "galho sobre o carro", "galhos sobre o carro",
                "galho em cima da casa", "galhos em cima da casa",
                "galho sobre a casa", "galhos sobre a casa"
            ],
            
            # 10 - Solicitação de Poda
            10: [
                "solicitacao de poda", "solicitação de poda", "poda de arvore", "poda de árvore",
                "poda de arvores", "poda de árvores", "poda de galho", "poda de galhos",
                "podar arvore", "podar árvore", "podar arvores", "podar árvores",
                "podar galho", "podar galhos", "podar arvore", "podar árvore",
                "arvore precisa de poda", "árvore precisa de poda",
                "arvores precisam de poda", "árvores precisam de poda",
                "arvore com galho grande", "árvore com galho grande",
                "arvore com galhos grandes", "árvore com galhos grandes",
                "arvore com galho alto", "árvore com galho alto",
                "arvore com galhos altos", "árvore com galhos altos",
                "arvore com galho baixo", "árvore com galho baixo",
                "arvore com galhos baixos", "árvore com galhos baixos",
                "arvore com galho na fiacao", "árvore com galho na fiação",
                "arvore com galhos na fiacao", "árvore com galhos na fiação",
                "arvore com galho no poste", "árvore com galho no poste",
                "arvore com galhos no poste", "árvore com galhos no poste",
                "arvore com galho na rede", "árvore com galho na rede",
                "arvore com galhos na rede", "árvore com galhos na rede",
                "arvore com galho na casa", "árvore com galho na casa",
                "arvore com galhos na casa", "árvore com galhos na casa",
                "arvore com galho no muro", "árvore com galho no muro",
                "arvore com galhos no muro", "árvore com galhos no muro",
                "arvore com galho no telhado", "árvore com galho no telhado",
                "arvore com galhos no telhado", "árvore com galhos no telhado",
                "arvore com galho na janela", "árvore com galho na janela",
                "arvore com galhos na janela", "árvore com galhos na janela",
                "arvore com galho na varanda", "árvore com galho na varanda",
                "arvore com galhos na varanda", "árvore com galhos na varanda",
                "arvore com galho na piscina", "árvore com galho na piscina",
                "arvore com galhos na piscina", "árvore com galhos na piscina",
                "arvore com galho na calha", "árvore com galho na calha",
                "arvore com galhos na calha", "árvore com galhos na calha",
                "arvore com galho na caixa dagua", "árvore com galho na caixa d'água",
                "arvore com galhos na caixa dagua", "árvore com galhos na caixa d'água"
            ],
            
            # 11 - Solicitação de Plantio
            11: [
                "solicitacao de plantio", "solicitação de plantio", "plantio de arvore", "plantio de árvore",
                "plantio de arvores", "plantio de árvores", "plantar arvore", "plantar árvore",
                "plantar arvores", "plantar árvores", "plantar muda", "plantar mudas",
                "plantio de muda", "plantio de mudas", "muda de arvore", "muda de árvore",
                "mudas de arvore", "mudas de árvores", "quero plantar", "gostaria de plantar",
                "preciso plantar", "desejo plantar", "solicito plantio", "solicitar plantio",
                "pedido de plantio", "pedir plantio", "arvore para plantar", "árvore para plantar",
                "arvores para plantar", "árvores para plantar", "muda para plantar", "mudas para plantar",
                "arvore nova", "árvore nova", "arvores novas", "árvores novas",
                "plantar na calcada", "plantar na calçada", "plantar na praca", "plantar na praça",
                "plantar no parque", "plantar na rua", "plantar na avenida", "plantar na via",
                "plantar no jardim", "plantar na area verde", "plantar na área verde",
                "plantar no canteiro", "plantar no gramado", "plantar na escola",
                "plantar no posto", "plantar na unidade", "plantar no bairro",
                "arvore frutifera", "árvore frutífera", "arvores frutiferas", "árvores frutíferas",
                "arvore nativa", "árvore nativa", "arvores nativas", "árvores nativas",
                "arvore ornamental", "árvore ornamental", "arvores ornamentais", "árvores ornamentais",
                "arvore sombra", "árvore sombra", "arvores sombra", "árvores sombra"
            ],
            
            # 13 - Manutenção da Área Verde
            13: [
                "manutencao da area verde", "manutenção da área verde",
                "manutencao de area verde", "manutenção de área verde",
                "manutencao do jardim", "manutenção do jardim",
                "manutencao do gramado", "manutenção do gramado",
                "manutencao do parque", "manutenção do parque",
                "manutencao da praca", "manutenção da praça",
                "manutencao do canteiro", "manutenção do canteiro",
                "cuidar da area verde", "cuidar da área verde",
                "cuidar do jardim", "cuidar do gramado", "cuidar do parque",
                "cuidar da praca", "cuidar da praça", "cuidar do canteiro",
                "area verde com problema", "área verde com problema",
                "jardim com problema", "gramado com problema",
                "parque com problema", "praca com problema", "praça com problema",
                "area verde precisa de manutencao", "área verde precisa de manutenção",
                "jardim precisa de manutencao", "jardim precisa de manutenção",
                "gramado precisa de manutencao", "gramado precisa de manutenção",
                "parque precisa de manutencao", "parque precisa de manutenção",
                "praca precisa de manutencao", "praça precisa de manutenção",
                "grama alta", "grama alta na area verde", "grama alta na área verde",
                "grama alta no jardim", "grama alta no gramado", "grama alta no parque",
                "grama alta na praca", "grama alta na praça", "grama alta no canteiro",
                "grama seca", "grama seca na area verde", "grama seca na área verde",
                "grama seca no jardim", "grama seca no gramado", "grama seca no parque",
                "grama seca na praca", "grama seca na praça", "grama seca no canteiro",
                "mato alto", "mato alto na area verde", "mato alto na área verde",
                "mato alto no jardim", "mato alto no gramado", "mato alto no parque",
                "mato alto na praca", "mato alto na praça", "mato alto no canteiro",
                "erva daninha", "ervas daninhas", "erva daninha na area verde",
                "erva daninha na área verde", "erva daninha no jardim",
                "erva daninha no gramado", "erva daninha no parque",
                "erva daninha na praca", "erva daninha na praça",
                "erva daninha no canteiro"
            ],
            
            # ==========================================
            # PARQUES E PRAÇAS (14, 15, 16)
            # ==========================================
            
            # 14 - Sugestões para o Parque/Praça
            14: [
                "sugestao para o parque", "sugestão para o parque",
                "sugestao para a praca", "sugestão para a praça",
                "sugestao parque", "sugestão parque", "sugestao praca", "sugestão praça",
                "sugerir para o parque", "sugerir para a praca", "sugerir para a praça",
                "sugerir parque", "sugerir praca", "sugerir praça",
                "ideia para o parque", "ideia para a praca", "ideia para a praça",
                "ideia parque", "ideia praca", "ideia praça",
                "proposta para o parque", "proposta para a praca", "proposta para a praça",
                "proposta parque", "proposta praca", "proposta praça",
                "melhoria para o parque", "melhoria para a praca", "melhoria para a praça",
                "melhoria parque", "melhoria praca", "melhoria praça",
                "melhorar o parque", "melhorar a praca", "melhorar a praça",
                "melhorar parque", "melhorar praca", "melhorar praça",
                "sugestoes para o parque", "sugestões para o parque",
                "sugestoes para a praca", "sugestões para a praça",
                "sugestoes parque", "sugestões parque", "sugestoes praca", "sugestões praça"
            ],
            
            # 15 - Equipamento Quebrado no Parque/Praça
            15: [
                "equipamento quebrado no parque", "equipamento quebrado na praca",
                "equipamento quebrado na praça", "equipamento quebrado parque",
                "equipamento quebrado praca", "equipamento quebrado praça",
                "equipamento danificado no parque", "equipamento danificado na praca",
                "equipamento danificado na praça", "equipamento danificado parque",
                "equipamento danificado praca", "equipamento danificado praça",
                "equipamento com defeito no parque", "equipamento com defeito na praca",
                "equipamento com defeito na praça", "equipamento com defeito parque",
                "equipamento com defeito praca", "equipamento com defeito praça",
                "equipamento estragado no parque", "equipamento estragado na praca",
                "equipamento estragado na praça", "equipamento estragado parque",
                "equipamento estragado praca", "equipamento estragado praça",
                "brinquedo quebrado no parque", "brinquedo quebrado na praca",
                "brinquedo quebrado na praça", "brinquedo quebrado parque",
                "brinquedo quebrado praca", "brinquedo quebrado praça",
                "brinquedo danificado no parque", "brinquedo danificado na praca",
                "brinquedo danificado na praça", "brinquedo danificado parque",
                "brinquedo danificado praca", "brinquedo danificado praça",
                "brinquedo com defeito no parque", "brinquedo com defeito na praca",
                "brinquedo com defeito na praça", "brinquedo com defeito parque",
                "brinquedo com defeito praca", "brinquedo com defeito praça",
                "brinquedo estragado no parque", "brinquedo estragado na praca",
                "brinquedo estragado na praça", "brinquedo estragado parque",
                "brinquedo estragado praca", "brinquedo estragado praça",
                "balanco quebrado", "balanço quebrado", "escorregador quebrado",
                "gangorra quebrada", "trepa-trepa quebrado", "escorrega quebrado",
                "balanco danificado", "balanço danificado", "escorregador danificado",
                "gangorra danificada", "trepa-trepa danificado", "escorrega danificado",
                "balanco com defeito", "balanço com defeito", "escorregador com defeito",
                "gangorra com defeito", "trepa-trepa com defeito", "escorrega com defeito"
            ],
            
            # 16 - Solicitações Gerais para o Parque/Praça
            16: [
                "solicitacao para o parque", "solicitação para o parque",
                "solicitacao para a praca", "solicitação para a praça",
                "solicitacao parque", "solicitação parque", "solicitacao praca", "solicitação praça",
                "pedido para o parque", "pedido para a praca", "pedido para a praça",
                "pedido parque", "pedido praca", "pedido praça",
                "requerimento para o parque", "requerimento para a praca", "requerimento para a praça",
                "requerimento parque", "requerimento praca", "requerimento praça",
                "solicitar para o parque", "solicitar para a praca", "solicitar para a praça",
                "solicitar parque", "solicitar praca", "solicitar praça",
                "pedir para o parque", "pedir para a praca", "pedir para a praça",
                "pedir parque", "pedir praca", "pedir praça",
                "solicitacoes para o parque", "solicitações para o parque",
                "solicitacoes para a praca", "solicitações para a praça",
                "solicitacoes parque", "solicitações parque", "solicitacoes praca", "solicitações praça",
                "parque precisa de", "praca precisa de", "praça precisa de",
                "parque necessita de", "praca necessita de", "praça necessita de",
                "parque com problema", "praca com problema", "praça com problema",
                "parque abandonado", "praca abandonada", "praça abandonada",
                "parque descuidado", "praca descuidada", "praça descuidada",
                "parque sem manutencao", "parque sem manutenção",
                "praca sem manutencao", "praça sem manutenção"
            ],
            
            # ==========================================
            # LIMPEZA E MEIO AMBIENTE (12, 18)
            # ==========================================
            
            # 12 - Lixo e Detritos
            12: [
                "lixo", "lixos", "lixeira", "lixeiras", "lixo na rua", "lixo na via",
                "lixo na calcada", "lixo na calçada", "lixo na praca", "lixo na praça",
                "lixo no parque", "lixo no jardim", "lixo na area verde", "lixo na área verde",
                "lixo no terreno", "lixo no lote", "lixo no quintal", "lixo na frente",
                "lixo acumulado", "lixo acumulando", "lixo espalhado", "lixo jogado",
                "lixo descartado", "lixo irregular", "lixo inadequado", "lixo perigoso",
                "lixo hospitalar", "lixo infectante", "lixo contaminado", "lixo toxico",
                "lixo tóxico", "lixo radioativo", "lixo eletronico", "lixo eletrônico",
                "lixo reciclavel", "lixo reciclável", "lixo organico", "lixo orgânico",
                "lixo comum", "lixo domestico", "lixo doméstico", "lixo industrial",
                "lixo comercial", "lixo publico", "lixo público", "lixo urbano",
                "entulho", "entulhos", "entulho na rua", "entulho na via",
                "entulho na calcada", "entulho na calçada", "entulho na praca",
                "entulho na praça", "entulho no parque", "entulho no terreno",
                "entulho de obra", "entulho de construcao", "entulho de construção",
                "restos de obra", "restos de construcao", "restos de construção",
                "detritos", "detrito", "detritos na rua", "detritos na via",
                "detritos na calcada", "detritos na calçada", "detritos na praca",
                "detritos na praça", "detritos no parque", "detritos no terreno",
                "sujeira", "sujeiras", "sujeira na rua", "sujeira na via",
                "sujeira na calcada", "sujeira na calçada", "sujeira na praca",
                "sujeira na praça", "sujeira no parque", "sujeira no terreno",
                "coleta de lixo", "coleta de entulho", "coleta de detritos",
                "coleta de sujeira", "coleta seletiva", "coleta irregular",
                "caminhao de lixo", "caminhão de lixo", "caminhao de entulho",
                "caminhão de entulho", "caminhao de coleta", "caminhão de coleta",
                "contentor de lixo", "contêiner de lixo", "container de lixo",
                "caçamba de lixo", "caçamba de entulho", "caçamba na rua",
                "caçamba na via", "caçamba na calcada", "caçamba na calçada",
                "caçamba na praca", "caçamba na praça", "caçamba no parque"
            ],
            
            # 18 - Grafite em Lugares Públicos
            18: [
                "grafite", "grafites", "grafite em lugares publicos", "grafite em lugares públicos",
                "grafite na rua", "grafite na via", "grafite na calcada", "grafite na calçada",
                "grafite na praca", "grafite na praça", "grafite no parque", "grafite no jardim",
                "grafite na area verde", "grafite na área verde", "grafite no muro",
                "grafite na parede", "grafite no predio", "grafite no prédio",
                "grafite na escola", "grafite no posto", "grafite na unidade",
                "grafite no banheiro", "grafite na quadra", "grafite no campo",
                "pichacao", "pichação", "pichacoes", "pichações", "pichacao na rua",
                "pichação na rua", "pichacao na via", "pichação na via",
                "pichacao na calcada", "pichação na calçada", "pichacao na praca",
                "pichação na praça", "pichacao no parque", "pichação no parque",
                "pichacao no muro", "pichação no muro", "pichacao na parede",
                "pichação na parede", "pichacao no predio", "pichação no prédio",
                "pichacao na escola", "pichação na escola", "pichacao no posto",
                "pichação no posto", "pichacao na unidade", "pichação na unidade",
                "pichacao no banheiro", "pichação no banheiro", "pichacao na quadra",
                "pichação na quadra", "pichacao no campo", "pichação no campo",
                "pixacao", "pixação", "pixacoes", "pixações", "pixacao na rua",
                "pixação na rua", "pixacao na via", "pixação na via",
                "pixacao na calcada", "pixação na calçada", "pixacao na praca",
                "pixação na praça", "pixacao no parque", "pixação no parque",
                "pixacao no muro", "pixação no muro", "pixacao na parede",
                "pixação na parede", "pixacao no predio", "pixação no prédio",
                "pixacao na escola", "pixação na escola", "pixacao no posto",
                "pixação no posto", "pixacao na unidade", "pixação na unidade",
                "pixacao no banheiro", "pixação no banheiro", "pixacao na quadra",
                "pixação na quadra", "pixacao no campo", "pixação no campo"
            ],
            
            # ==========================================
            # CEMITÉRIO (21)
            # ==========================================
            
            # 21 - Manutenção do Cemitério
            21: [
                "manutencao do cemiterio", "manutenção do cemitério",
                "manutencao cemiterio", "manutenção cemitério",
                "cuidar do cemiterio", "cuidar do cemitério",
                "cemiterio com problema", "cemitério com problema",
                "cemiterio precisa de manutencao", "cemitério precisa de manutenção",
                "cemiterio abandonado", "cemitério abandonado",
                "cemiterio descuidado", "cemitério descuidado",
                "cemiterio sem manutencao", "cemitério sem manutenção",
                "tumulo com problema", "túmulo com problema",
                "tumulo quebrado", "túmulo quebrado",
                "tumulo danificado", "túmulo danificado",
                "tumulo abandonado", "túmulo abandonado",
                "tumulo sem manutencao", "túmulo sem manutenção",
                "cova com problema", "cova aberta", "cova fechada",
                "cova danificada", "cova abandonada",
                "cova sem manutencao", "cova sem manutenção",
                "jazigo com problema", "jazigo quebrado", "jazigo danificado",
                "jazigo abandonado", "jazigo sem manutencao", "jazigo sem manutenção",
                "sepultura com problema", "sepultura quebrada", "sepultura danificada",
                "sepultura abandonada", "sepultura sem manutencao", "sepultura sem manutenção",
                "maussoleu com problema", "mausoléu com problema",
                "maussoleu quebrado", "mausoléu quebrado",
                "maussoleu danificado", "mausoléu danificado",
                "maussoleu abandonado", "mausoléu abandonado",
                "maussoleu sem manutencao", "mausoléu sem manutenção",
                "capela com problema", "capela quebrada", "capela danificada",
                "capela abandonada", "capela sem manutencao", "capela sem manutenção",
                "velorio com problema", "velório com problema",
                "velorio quebrado", "velório quebrado",
                "velorio danificado", "velório danificado",
                "velorio abandonado", "velório abandonado",
                "velorio sem manutencao", "velório sem manutenção"
            ],
            
            # ==========================================
            # OUTROS (22) - Genérico
            # ==========================================
            
            # 22 - Outros
            22: [
                "outros", "outro", "outros problemas", "outro problema",
                "outras solicitacoes", "outras solicitações", "outra solicitacao",
                "outra solicitação", "outros assuntos", "outro assunto",
                "diversos", "diversas", "variados", "variadas",
                "geral", "gerais", "generalizado", "generalizada",
                "nao especificado", "não especificado", "nao especificada",
                "não especificada", "sem especificacao", "sem especificação",
                "informacao", "informação", "informacoes", "informações",
                "duvida", "duvidas", "dúvida", "dúvidas",
                "reclamacao", "reclamação", "reclamacoes", "reclamações",
                "sugestao", "sugestão", "sugestoes", "sugestões",
                "elogio", "elogios", "agradecimento", "agradecimentos",
                "denuncia", "denúncias", "denuncias", "denúncia",
                "pedido", "pedidos", "solicitacao", "solicitação",
                "requerimento", "requerimentos", "requerimento geral",
                "assunto", "assuntos", "assunto geral", "assuntos gerais",
                "problema", "problemas", "problema geral", "problemas gerais",
                "questao", "questão", "questoes", "questões",
                "ocorrencia", "ocorrência", "ocorrencias", "ocorrências",
                "situacao", "situação", "situacoes", "situações",
                "caso", "casos", "caso geral", "casos gerais"
            ],

            # 8 - Divisor de Pista
            8: [
                "divisor de pista", "divisor de pista quebrado", "divisor de pista danificado",
                "divisor de pista com problema", "divisor de pista solto",
                "divisor de pista torto", "divisor de pista inclinado",
                "divisor de pista caindo", "divisor de pista caido",
                "divisor de pista caído", "divisor central quebrado",
                "divisor central danificado", "divisor central com problema",
                "divisor central solto", "divisor central torto",
                "divisor central inclinado", "divisor central caindo",
                "divisor central caido", "divisor central caído",
                "separador de pista", "separador de pista quebrado",
                "separador de pista danificado", "separador de pista com problema",
                "separador de pista solto", "separador de pista torto",
                "separador de pista inclinado", "separador de pista caindo",
                "separador de pista caido", "separador de pista caído",
                "separador central", "separador central quebrado",
                "separador central danificado", "separador central com problema",
                "separador central solto", "separador central torto",
                "separador central inclinado", "separador central caindo",
                "separador central caido", "separador central caído"
            ],

            # 20 - Portões Trancados
            20: [
                "portao trancado", "portão trancado", "portoes trancados", "portões trancados",
                "portao fechado", "portão fechado", "portoes fechados", "portões fechados",
                "portao com problema", "portão com problema",
                "portao quebrado", "portão quebrado", "portoes quebrados", "portões quebrados",
                "portao danificado", "portão danificado", "portoes danificados", "portões danificados",
                "portao emperrado", "portão emperrado", "portoes emperrados", "portões emperrados",
                "portao travado", "portão travado", "portoes travados", "portões travados",
                "portao nao abre", "portão não abre", "portoes nao abrem", "portões não abrem",
                "portao nao fecha", "portão não fecha", "portoes nao fecham", "portões não fecham",
                "portao com cadeado", "portão com cadeado",
                "portao sem cadeado", "portão sem cadeado",
                "portao com corrente", "portão com corrente",
                "portao sem corrente", "portão sem corrente",
                "portao do parque", "portão do parque",
                "portao da praca", "portão da praça",
                "portao da escola", "portão da escola",
                "portao do cemiterio", "portão do cemitério",
                "portao da unidade", "portão da unidade",
                "portao do posto", "portão do posto",
                "portao da quadra", "portão da quadra",
                "portao do campo", "portão do campo",
                "portao do banheiro", "portão do banheiro",
                "portao do vestiario", "portão do vestiário"
            ]
        }
        
        for tipo_id, frases in self.tipos_frases.items():
            patterns = [self.nlp.make_doc(frase) for frase in frases]
            self.phrase_matcher.add(f"TIPO_{tipo_id}", patterns)
    
    # =============================================
    # EXTRAÇÃO DE RISCO DE VIDA HUMANA
    # =============================================
    def extrair_risco_humano(self, doc):
        """Extrai risco de vida humana usando spaCy + Regras"""
        # 1. Verificar padrões do Matcher
        matches = self.matcher(doc)
        for match_id, start, end in matches:
            rule_id = self.nlp.vocab.strings[match_id]
            if rule_id in ["RISCO_HUMANO_VERBO", "RISCO_HUMANO_PESSOA"]:
                span = doc[start:end]
                print(f"   ✅ Risco humano detectado: '{span.text}' (regra: {rule_id})", file=sys.stderr)
                return 1
        
        # 2. Verificar se há entidades de PESSOA + palavras de perigo
        for ent in doc.ents:
            if ent.label_ in ["PER", "PESSOA"]:
                # Verificar o contexto ao redor da pessoa
                contexto = self._obter_contexto(doc, ent, janela=10)
                if any(p in contexto for p in ["risco", "perigo", "morte", "ferido", "morrendo", "socorro"]):
                    print(f"   ✅ Risco humano detectado: pessoa '{ent.text}' em contexto de perigo", file=sys.stderr)
                    return 1
        
        return 0
    
    # =============================================
    # EXTRAÇÃO DE RISCO DE VIDA ANIMAL
    # =============================================
    def extrair_risco_animal(self, doc):
        """Extrai risco de vida animal usando spaCy + Regras"""
        # 1. Verificar padrões do Matcher
        matches = self.matcher(doc)
        for match_id, start, end in matches:
            rule_id = self.nlp.vocab.strings[match_id]
            if rule_id == "RISCO_ANIMAL":
                span = doc[start:end]
                print(f"   ✅ Risco animal detectado: '{span.text}'", file=sys.stderr)
                return 1
        
        # 2. Verificar se há menção a animal + contexto de perigo
        palavras_animais = ["animal", "cachorro", "gato", "cao", "cão", "passaro", "pássaro", "ave", "bicho"]
        palavras_perigo = ["ferido", "atropelado", "machucado", "preso", "abandonado", "doente", "morrendo", "envenenado", "sofrimento"]
        
        texto = doc.text.lower()
        tem_animal = any(a in texto for a in palavras_animais)
        tem_perigo = any(p in texto for p in palavras_perigo)
        
        if tem_animal and tem_perigo:
            print(f"   ✅ Risco animal detectado: animal + contexto de perigo", file=sys.stderr)
            return 1
        
        return 0
    
    # =============================================
    # EXTRAÇÃO DE BLOQUEIO DE VIA
    # =============================================
    def extrair_bloqueio_via(self, doc):
        """Extrai bloqueio de via usando spaCy + Regras"""
        # 1. Verificar padrões do Matcher
        matches = self.matcher(doc)
        for match_id, start, end in matches:
            rule_id = self.nlp.vocab.strings[match_id]
            if rule_id == "BLOQUEIO_VIA":
                span = doc[start:end]
                print(f"   ✅ Bloqueio de via detectado: '{span.text}'", file=sys.stderr)
                return 1
        
        # 2. Verificar se há entidade de LOCAL + verbo de bloqueio
        for ent in doc.ents:
            if ent.label_ in ["LOC", "LOCAL", "GPE"]:
                contexto = self._obter_contexto(doc, ent, janela=8)
                if any(p in contexto for p in ["bloquead", "interditad", "fechad", "obstruid", "impassavel"]):
                    print(f"   ✅ Bloqueio de via detectado: local '{ent.text}' bloqueado", file=sys.stderr)
                    return 1
        
        return 0
    
    # =============================================
    # EXTRAÇÃO DE TIPO DE CHAMADO
    # =============================================
    def extrair_tipo_chamado(self, doc):
        """Extrai tipo de chamado usando PhraseMatcher"""
        matches = self.phrase_matcher(doc)
        
        if not matches:
            print(f"   ⚠️ Nenhum tipo de chamado identificado, usando padrão (1)", file=sys.stderr)
            return 1
        
        # Contar matches por tipo
        contagem = {}
        for match_id, start, end in matches:
            rule_id = self.nlp.vocab.strings[match_id]
            tipo_id = int(rule_id.split("_")[1])
            contagem[tipo_id] = contagem.get(tipo_id, 0) + 1
        
        # Retornar o tipo com mais matches
        melhor_tipo = max(contagem.items(), key=lambda x: x[1])
        print(f"   ✅ Tipo de chamado detectado: {melhor_tipo[0]} ({melhor_tipo[1]} ocorrências)", file=sys.stderr)
        
        return melhor_tipo[0]
    
    # =============================================
    # MÉTODO AUXILIAR: OBTER CONTEXTO
    # =============================================
    def _obter_contexto(self, doc, ent, janela=10):
        """Obtém o texto ao redor de uma entidade"""
        inicio = max(0, ent.start - janela)
        fim = min(len(doc), ent.end + janela)
        return doc[inicio:fim].text.lower()
    
    # =============================================
    # MÉTODO PRINCIPAL: EXTRAIR TODOS OS DADOS
    # =============================================
    def extrair_dados(self, descricao):
        """Extrai todos os dados da descrição usando spaCy + Regras"""
        if not self.nlp:
            print("❌ Modelo spaCy não carregado, usando fallback", file=sys.stderr)
            return None
        
        print(f"\n🔍 Processando com spaCy: '{descricao[:100]}...'", file=sys.stderr)
        
        doc = self.nlp(descricao)
        
        dados = {
            'risco_vida_humana': self.extrair_risco_humano(doc),
            'risco_vida_animal': self.extrair_risco_animal(doc),
            'bloqueio_via': self.extrair_bloqueio_via(doc),
            'tipo_chamanado': self.extrair_tipo_chamado(doc),
        }
        
        print(f"📊 Dados extraídos: {dados}", file=sys.stderr)
        
        return dados


class ClassificadorChamado:
    def __init__(self):
        self.modelo = None
        self.scaler = None
        self.extrator = ExtratorDadosChamado()
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
        """Classifica a urgência do chamado"""
        # Se receber apenas a descrição, extrair os dados com spaCy
        if 'descricao' in dados and 'risco_vida_humana' not in dados:
            print("📝 Modo PLN (spaCy): Extraindo dados da descrição...", file=sys.stderr)
            
            dados_extraidos = self.extrator.extrair_dados(dados['descricao'])
            
            if dados_extraidos:
                dados.update(dados_extraidos)
            else:
                # Fallback para regex se spaCy falhar
                print("⚠️ spaCy falhou, usando fallback simples", file=sys.stderr)
                dados.update({
                    'risco_vida_humana': self._fallback_risco_humano(dados['descricao']),
                    'risco_vida_animal': self._fallback_risco_animal(dados['descricao']),
                    'bloqueio_via': self._fallback_bloqueio(dados['descricao']),
                    'tipo_chamanado': 1
                })
        
        if self.modelo is None:
            return self.classificar_fallback(dados)
        
        try:
            features = np.array([
                float(dados.get('tipo_chamanado', 1)),
                float(dados.get('dias_problema', 1)),
                float(dados.get('risco_vida_humana', 0)),
                float(dados.get('risco_vida_animal', 0)),
                float(dados.get('bloqueio_via', 0))
            ]).reshape(1, -1)
            
            print(f"Features para classificação: {features[0].tolist()}", file=sys.stderr)
            
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
            
            return {
                'urgencia': urgencia,
                'risco_vida_humana': dados.get('risco_vida_humana', 0),
                'risco_vida_animal': dados.get('risco_vida_animal', 0),
                'bloqueio_via': dados.get('bloqueio_via', 0),
                'tipo_chamanado': dados.get('tipo_chamanado', 22),
            }
            
        except Exception as e:
            print(f"Erro na predição: {e}", file=sys.stderr)
            return self.classificar_fallback(dados)
    
    # =============================================
    # FALLBACKS SIMPLES (caso spaCy falhe)
    # =============================================
    def _fallback_risco_humano(self, texto):
        texto = texto.lower()
        return 1 if any(p in texto for p in ["risco de vida", "risco a vida", "pode morrer", "crianca sozinha", "criança sozinha"]) else 0
    
    def _fallback_risco_animal(self, texto):
        texto = texto.lower()
        animais = ["cachorro", "gato", "cao", "cão", "passaro", "pássaro", "ave", "animal"]
        perigos = ["ferido", "atropelado", "machucado", "preso", "abandonado", "doente", "morrendo"]
        return 1 if any(a in texto for a in animais) and any(p in texto for p in perigos) else 0
    
    def _fallback_bloqueio(self, texto):
        texto = texto.lower()
        return 1 if any(p in texto for p in ["bloqueada", "bloqueado", "interditada", "interditado", "fechada", "fechado", "impossivel passar", "impossível passar"]) else 0
    
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
        
        return {
            'urgencia': urgencia,
            'risco_vida_humana': risco_humano,
            'risco_vida_animal': risco_animal,
            'bloqueio_via': bloqueio,
            'tipo_chamanado': dados.get('tipo_chamanado', 22)
        }


if __name__ == "__main__":
    print("READY", flush=True)
    sys.stdout.flush()
    
    classificador = ClassificadorChamado()
    
    while True:
        try:
            linha = sys.stdin.readline()
            if not linha:
                break
            
            linha = linha.strip()
            if not linha:
                continue
            
            dados = json.loads(linha)
            resultado = classificador.classificar(dados)
            print(json.dumps(resultado), flush=True)
            
        except json.JSONDecodeError as e:
            print(json.dumps({'error': f'JSON inválido: {str(e)}', 'urgencia': 'MEDIA'}), flush=True)
        except Exception as e:
            print(json.dumps({'error': str(e), 'urgencia': 'MEDIA'}), flush=True)