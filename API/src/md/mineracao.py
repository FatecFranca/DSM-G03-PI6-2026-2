import os
import sys
import traceback
from datetime import datetime, timezone

import numpy as np
import pandas as pd
import psycopg2

from dotenv import load_dotenv
from sklearn.cluster import KMeans
from sklearn.metrics import (
    silhouette_score,
    davies_bouldin_score,
    adjusted_rand_score,
    pairwise_distances
)
from sklearn.preprocessing import StandardScaler

import argparse

# ============================================================
# CONFIGURAÇÃO
# ============================================================

load_dotenv()

DATABASE_URL_PYTHON = os.getenv("DATABASE_URL_PYTHON")

if not DATABASE_URL_PYTHON:
    print("ERRO: DATABASE_URL_PYTHON não encontrada.")
    sys.exit(1)


# Quantidade mínima de registros para executar o K-Means
MINIMO_CHAMADOS = 10

# Testaremos K entre esses valores
K_MIN = 2
K_MAX = 40

# Reprodutibilidade
RANDOM_STATE = 42

# Quantidade de execuções independentes usadas para
# verificar a estabilidade de cada K.
ESTABILIDADE_EXECUCOES = 5

# Percentual mínimo desejável de chamados no menor cluster.
# É usado como penalização na seleção do K, e não como
# regra absoluta de exclusão.
PERCENTUAL_MINIMO_CLUSTER = 0.02

# Pesos usados para selecionar o K inicial.
# Silhouette e Davies-Bouldin medem qualidade geométrica.
# Estabilidade mede se a solução se repete em diferentes sementes.
# Tamanho evita favorecer soluções muito fragmentadas.
PESO_SILHOUETTE = 0.35
PESO_DAVIES = 0.25
PESO_ESTABILIDADE = 0.25
PESO_TAMANHO = 0.15

def parse_argumentos():
    parser = argparse.ArgumentParser(
        description=(
            "Executa a mineração de chamados "
            "(K-Means) para uma unidade."
        )
    )

    parser.add_argument(
        "--unidade-id",
        type=int,
        required=True,
        help="ID da unidade."
    )

    parser.add_argument(
        "--calibrar",
        action="store_true",
        help="Executa a calibração do K."
    )
    return parser.parse_args()

def salvar_configuracao_mineracao(
    conn,
    unidade_id,
    quantidade_clusters,
    quantidade_chamados,
    silhouette,
    davies_bouldin,
    score_combinado
):

    cursor = conn.cursor()

    query = """
        INSERT INTO "ConfiguracaoMineracao"
        (
            "ConfiguracaoId",
            "UnidadeId",
            "ConfiguracaoQtdClusters",
            "ConfiguracaoQtdChamadosBase",
            "ConfiguracaoSilhouetteScore",
            "ConfiguracaoDaviesBouldinScore",
            "ConfiguracaoScoreCombinado",
            "ConfiguracaoPercentualRecalibracao",
            "ConfiguracaoDtCalibracao",
            "ConfiguracaoAtivo"
        )
        VALUES
        (
            gen_random_uuid(),
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            20,
            NOW(),
            TRUE
        )
        ON CONFLICT ("UnidadeId")
        DO UPDATE SET
            "ConfiguracaoQtdClusters" = EXCLUDED."ConfiguracaoQtdClusters",
            "ConfiguracaoQtdChamadosBase" = EXCLUDED."ConfiguracaoQtdChamadosBase",
            "ConfiguracaoSilhouetteScore" = EXCLUDED."ConfiguracaoSilhouetteScore",
            "ConfiguracaoDaviesBouldinScore" = EXCLUDED."ConfiguracaoDaviesBouldinScore",
            "ConfiguracaoScoreCombinado" = EXCLUDED."ConfiguracaoScoreCombinado",
            "ConfiguracaoDtCalibracao" = NOW(),
            "ConfiguracaoAtivo" = TRUE
    """

    cursor.execute(
        query,
        (
            unidade_id,
            quantidade_clusters,
            quantidade_chamados,
            silhouette,
            davies_bouldin,
            score_combinado
        )
    )

    conn.commit()

    cursor.close()

def buscar_configuracao_mineracao(conn, unidade_id):

    cursor = conn.cursor()

    query = """
        SELECT
            "ConfiguracaoQtdClusters",
            "ConfiguracaoQtdChamadosBase",
            "ConfiguracaoPercentualRecalibracao",
            "ConfiguracaoDtCalibracao",
            "ConfiguracaoSilhouetteScore",
            "ConfiguracaoDaviesBouldinScore",
            "ConfiguracaoScoreCombinado"
        FROM "ConfiguracaoMineracao"
        WHERE
            "UnidadeId" = %s
            AND "ConfiguracaoAtivo" = TRUE
    """

    cursor.execute(
        query,
        (unidade_id,)
    )

    configuracao = cursor.fetchone()

    cursor.close()

    return configuracao

def verificar_recalibracao(
    quantidade_atual,
    quantidade_base,
    percentual_recalibracao
):

    if quantidade_base <= 0:
        return True, 100.0

    crescimento = (
        (quantidade_atual - quantidade_base)
        / quantidade_base
    ) * 100

    precisa_recalibrar = (
        crescimento >= percentual_recalibracao
    )

    return precisa_recalibrar, crescimento

# ============================================================
# CONEXÃO COM BANCO
# ============================================================

def conectar_banco():
    #print('DATABASE_URL_PYTHON = ', DATABASE_URL_PYTHON)
    return psycopg2.connect(DATABASE_URL_PYTHON)


# ============================================================
# BUSCAR CHAMADOS
# ============================================================

def buscar_chamados(conn, unidade_id):

    query = """
        SELECT
            c."ChamadoId",
            c."TipSupId",
            c."ChamadoDiasComProblema",
            c."ChamadoRiscoVidaHumana",
            c."ChamadoRiscoVidaAnimal",
            c."ChamadoBloqueioVia",
            c."ChamadoDtAbertura",
            c."ChamadoDtEncerramento",
            c."ChamadoUrgencia"
        FROM "Chamado" c
        WHERE
            c."UnidadeId" = %s
            AND c."ChamadoDiasComProblema" IS NOT NULL
            AND c."ChamadoRiscoVidaHumana" IS NOT NULL
            AND c."ChamadoRiscoVidaAnimal" IS NOT NULL
            AND c."ChamadoBloqueioVia" IS NOT NULL
    """

    df = pd.read_sql_query(query, conn, params=(unidade_id,))

    return df


# ============================================================
# PREPARAR DADOS
# ============================================================

def preparar_dados(df):

    df = df.copy()

    # --------------------------------------------------------
    # Tempo de resolução
    # --------------------------------------------------------

    df["ChamadoDtAbertura"] = pd.to_datetime(
        df["ChamadoDtAbertura"],
        errors="coerce",
        utc=True,          # <-- força UTC
    )

    df["ChamadoDtEncerramento"] = pd.to_datetime(
        df["ChamadoDtEncerramento"],
        errors="coerce",
        utc=True,          # <-- força UTC
    )

    agora = pd.Timestamp.now(tz="UTC")

    # Para chamados ainda abertos, usamos o momento atual
    data_fim = df["ChamadoDtEncerramento"].fillna(agora)

    df["TempoResolucaoHoras"] = (
        data_fim - df["ChamadoDtAbertura"]
    ).dt.total_seconds() / 3600

    # Evita valores inválidos
    df["TempoResolucaoHoras"] = (
        df["TempoResolucaoHoras"]
        .clip(lower=0)
        .fillna(0)
    )

    # --------------------------------------------------------
    # Booleanos → números
    # --------------------------------------------------------

    df["ChamadoRiscoVidaHumana"] = (
        df["ChamadoRiscoVidaHumana"]
        .astype(int)
    )

    df["ChamadoRiscoVidaAnimal"] = (
        df["ChamadoRiscoVidaAnimal"]
        .astype(int)
    )

    df["ChamadoBloqueioVia"] = (
        df["ChamadoBloqueioVia"]
        .astype(int)
    )

    # --------------------------------------------------------
    # Características utilizadas pelo K-Means
    # --------------------------------------------------------

    numericas = df[
        [
            "ChamadoDiasComProblema",
            "ChamadoRiscoVidaHumana",
            "ChamadoRiscoVidaAnimal",
            "ChamadoBloqueioVia",
            "TempoResolucaoHoras"
        ]
    ].copy()

    numericas = numericas.fillna(0)

    # Converte tudo para float
    numericas = numericas.astype(float)

    # Características utilizadas pelo K-Means
    X = numericas

    return df, X


# ============================================================
# FUNÇÕES AUXILIARES DA MINERAÇÃO
# ============================================================

def normalizar_maior_melhor(valores):
    """
    Normaliza uma lista para [0, 1], onde maior é melhor.
    """
    valores = np.asarray(valores, dtype=float)

    if valores.max() == valores.min():
        return np.ones(len(valores))

    return (
        (valores - valores.min())
        /
        (valores.max() - valores.min())
    )


def normalizar_menor_melhor(valores):
    """
    Normaliza uma lista para [0, 1], onde menor é melhor.
    """
    valores = np.asarray(valores, dtype=float)

    if valores.max() == valores.min():
        return np.ones(len(valores))

    return (
        (valores.max() - valores)
        /
        (valores.max() - valores.min())
    )


def calcular_estabilidade(X, k):
    """
    Executa o K-Means várias vezes com sementes diferentes e
    mede o quanto as partições encontradas são semelhantes.

    ARI (Adjusted Rand Index):
        1.0  -> partições praticamente idênticas
        0.0  -> concordância próxima do acaso
        < 0  -> concordância pior que a esperada ao acaso

    Como os números dos clusters podem mudar entre execuções,
    o ARI é adequado porque não depende do número atribuído
    ao cluster.
    """

    labels_execucoes = []

    for deslocamento in range(ESTABILIDADE_EXECUCOES):

        seed = RANDOM_STATE + deslocamento

        modelo = KMeans(
            n_clusters=k,
            random_state=seed,
            n_init=20
        )

        labels = modelo.fit_predict(X)

        labels_execucoes.append(labels)

    scores = []

    for i in range(len(labels_execucoes)):

        for j in range(i + 1, len(labels_execucoes)):

            score = adjusted_rand_score(
                labels_execucoes[i],
                labels_execucoes[j]
            )

            scores.append(score)

    if not scores:
        return 1.0

    return float(np.mean(scores))


def avaliar_k(X, k):
    """
    Avalia uma quantidade de clusters usando:

    - Silhouette
    - Davies-Bouldin
    - estabilidade
    - tamanho do menor cluster
    - distância mínima entre centróides

    O modelo retornado aqui é apenas o modelo de avaliação.
    O modelo final será treinado novamente depois que o K
    definitivo for determinado.
    """

    modelo = KMeans(
        n_clusters=k,
        random_state=RANDOM_STATE,
        n_init=20
    )

    labels = modelo.fit_predict(X)

    if len(set(labels)) < 2:
        return None

    silhouette = silhouette_score(
        X,
        labels
    )

    davies_bouldin = davies_bouldin_score(
        X,
        labels
    )

    estabilidade = calcular_estabilidade(
        X,
        k
    )

    tamanhos = np.bincount(labels)

    tamanho_minimo = int(tamanhos.min())

    percentual_menor_cluster = (
        tamanho_minimo / len(X)
    )

    # --------------------------------------------------------
    # Distâncias entre centróides
    # --------------------------------------------------------

    centroides = modelo.cluster_centers_

    matriz_distancias = pairwise_distances(
        centroides,
        metric="euclidean"
    )

    np.fill_diagonal(
        matriz_distancias,
        np.inf
    )

    distancia_minima = float(
        matriz_distancias.min()
    )

    distancia_media = float(
        np.mean(
            matriz_distancias[
                np.isfinite(matriz_distancias)
            ]
        )
    )

    return {
        "k": k,
        "modelo": modelo,
        "labels": labels,
        "silhouette": float(silhouette),
        "davies_bouldin": float(davies_bouldin),
        "estabilidade": estabilidade,
        "tamanho_minimo": tamanho_minimo,
        "percentual_menor_cluster": float(
            percentual_menor_cluster
        ),
        "distancia_minima_centroides": distancia_minima,
        "distancia_media_centroides": distancia_media
    }

def recalcular_score_final(
    resultados,
    avaliacao_final
):
    """
    Substitui as métricas do K efetivo pelas métricas
    realmente obtidas pelo K-Means final e recalcula
    o Score de todos os candidatos.

    Dessa forma, o Score armazenado para o K final
    corresponde ao modelo efetivamente utilizado.
    """

    k_final = avaliacao_final["k"]

    resultado_final = next(
        (
            resultado
            for resultado in resultados
            if resultado["k"] == k_final
        ),
        None
    )

    if resultado_final is None:

        raise Exception(
            f"K final {k_final} não encontrado "
            "entre os candidatos avaliados."
        )

    # Substitui as métricas antigas pelas métricas
    # do modelo final realmente executado.

    resultado_final["silhouette"] = (
        avaliacao_final["silhouette"]
    )

    resultado_final["davies_bouldin"] = (
        avaliacao_final["davies_bouldin"]
    )

    resultado_final["estabilidade"] = (
        avaliacao_final["estabilidade"]
    )

    resultado_final["percentual_menor_cluster"] = (
        avaliacao_final["percentual_menor_cluster"]
    )

    resultado_final["tamanho_minimo"] = (
        avaliacao_final["tamanho_minimo"]
    )

    # Recalcula os Scores utilizando os valores
    # atualizados do K final.

    resultados = calcular_score_k(
        resultados
    )

    resultado_final = next(
        (
            resultado
            for resultado in resultados
            if resultado["k"] == k_final
        ),
        None
    )

    return float(
        resultado_final["score_combinado"]
    )


def calcular_score_k(resultados):
    """
    Cria um score para selecionar o K inicial.

    Diferentemente da versão anterior, o score não considera
    somente Silhouette e Davies-Bouldin.

    Também considera:
        - estabilidade da solução;
        - tamanho do menor cluster.

    Isso reduz a tendência de escolher automaticamente o maior
    K testado apenas porque os índices geométricos continuam
    melhorando.
    """

    silhouettes = [
        r["silhouette"]
        for r in resultados
    ]

    davies = [
        r["davies_bouldin"]
        for r in resultados
    ]

    estabilidade = [
        r["estabilidade"]
        for r in resultados
    ]

    tamanho = [
        r["percentual_menor_cluster"]
        for r in resultados
    ]

    sil_norm = normalizar_maior_melhor(
        silhouettes
    )

    davies_norm = normalizar_menor_melhor(
        davies
    )

    estabilidade_norm = normalizar_maior_melhor(
        estabilidade
    )

    # O tamanho é limitado em 2%. Acima disso não recebe
    # vantagem adicional; abaixo disso sofre penalização.
    tamanho_norm = np.minimum(
        np.asarray(tamanho) /
        PERCENTUAL_MINIMO_CLUSTER,
        1.0
    )

    for i, resultado in enumerate(resultados):

        resultado["silhouette_normalizado"] = float(
            sil_norm[i]
        )

        resultado["davies_normalizado"] = float(
            davies_norm[i]
        )

        resultado["estabilidade_normalizada"] = float(
            estabilidade_norm[i]
        )

        resultado["tamanho_normalizado"] = float(
            tamanho_norm[i]
        )

        resultado["score_combinado"] = float(
            (
                PESO_SILHOUETTE * sil_norm[i]
                +
                PESO_DAVIES * davies_norm[i]
                +
                PESO_ESTABILIDADE * estabilidade_norm[i]
                +
                PESO_TAMANHO * tamanho_norm[i]
            )
        )

    return resultados


def encontrar_melhor_k(X):
    """
    Primeira etapa da mineração.

    Procura um K inicial candidato entre K_MIN e K_MAX.
    Esse K ainda NÃO é necessariamente o K definitivo.

    O K inicial é usado para criar uma solução suficientemente
    detalhada, cujos centróides serão posteriormente analisados
    para detectar grupos redundantes.
    """

    quantidade = len(X)

    k_maximo = min(
        K_MAX,
        quantidade - 1
    )

    resultados = []

    print("\n")
    print("=" * 70)
    print("AVALIAÇÃO DOS VALORES DE K")
    print("=" * 70)

    for k in range(K_MIN, k_maximo + 1):

        resultado = avaliar_k(
            X,
            k
        )

        if resultado is None:
            continue

        resultados.append(resultado)

        print(
            f"K={k:2d} | "
            f"Silhouette={resultado['silhouette']:.4f} | "
            f"Davies-Bouldin={resultado['davies_bouldin']:.4f} | "
            f"Estabilidade={resultado['estabilidade']:.4f} | "
            f"Menor cluster={resultado['tamanho_minimo']} "
            f"({resultado['percentual_menor_cluster'] * 100:.2f}%) | "
            f"Dist. mínima={resultado['distancia_minima_centroides']:.4f}"
        )

    if not resultados:
        raise Exception(
            "Não foi possível determinar o número de clusters."
        )

    resultados = calcular_score_k(
        resultados
    )

    melhor = max(
        resultados,
        key=lambda x: x["score_combinado"]
    )

    print("\n")
    print("=" * 70)
    print("RESULTADOS DA SELEÇÃO DO K INICIAL")
    print("=" * 70)

    for resultado in resultados:

        print(
            f"K={resultado['k']:2d} | "
            f"Silhouette={resultado['silhouette']:.4f} | "
            f"Davies-Bouldin={resultado['davies_bouldin']:.4f} | "
            f"Estabilidade={resultado['estabilidade']:.4f} | "
            f"Menor={resultado['percentual_menor_cluster'] * 100:.2f}% | "
            f"Score={resultado['score_combinado']:.4f}"
        )

    print(
        f"\nK inicial selecionado: {melhor['k']}"
    )

    return (
        melhor["k"],
        melhor["silhouette"],
        melhor["davies_bouldin"],
        melhor["score_combinado"],
        resultados
    )


# ============================================================
# DETECTAR CLUSTERS REDUNDANTES
# ============================================================

def obter_distancias_vizinhos_centroides(modelo):
    """
    Para cada centróide, encontra a distância até o centróide
    mais próximo.

    Essas distâncias permitem identificar automaticamente
    regiões onde existem centróides muito próximos.
    """

    centroides = modelo.cluster_centers_

    matriz = pairwise_distances(
        centroides,
        metric="euclidean"
    )

    np.fill_diagonal(
        matriz,
        np.inf
    )

    menores = matriz.min(
        axis=1
    )

    return menores


def determinar_limite_redundancia(modelo):
    """
    Determina automaticamente um limite de distância para
    identificar centróides praticamente redundantes.

    O método procura o maior "salto" nas distâncias dos
    vizinhos mais próximos.

    Exemplo:

        0.20
        0.22
        0.24
        0.27
        ----------------
        0.71
        0.83
        1.02

    O salto entre 0.27 e 0.71 indica uma separação natural
    entre centróides muito próximos e centróides mais isolados.

    Não é necessário informar manualmente um limite como 0.5.
    """

    menores = obter_distancias_vizinhos_centroides(
        modelo
    )

    menores = np.sort(
        menores
    )

    if len(menores) < 2:
        return 0.0, menores

    diferencas = np.diff(
        menores
    )

    indice = int(
        np.argmax(diferencas)
    )

    valor_anterior = menores[indice]
    valor_posterior = menores[indice + 1]

    limite = (
        valor_anterior
        +
        valor_posterior
    ) / 2

    return float(limite), menores


def distancia_maxima_entre_grupos(
    grupo_a,
    grupo_b,
    matriz_distancias
):
    """
    Distância de ligação completa (complete linkage).

    Para dois grupos de centróides, considera a maior distância
    entre qualquer par de centróides dos dois grupos.

    Isso evita o problema de "encadeamento", onde A é próximo
    de B e B é próximo de C, mas A e C são muito diferentes.
    """

    maior = 0.0

    for a in grupo_a:

        for b in grupo_b:

            distancia = matriz_distancias[a][b]

            if distancia > maior:
                maior = distancia

    return maior


def fundir_centroides_por_distancia(
    modelo,
    limite_distancia
):
    """
    Agrupa centróides semelhantes usando uma estratégia
    hierárquica com complete linkage.

    Retorna grupos de números de clusters do K-Means inicial.

    Exemplo:

        [[0, 7], [1], [2, 8, 11], [3], ...]

    significa que os clusters 0 e 7 são considerados
    semelhantes e serão representados por um único grupo
    no K efetivo.
    """

    centroides = modelo.cluster_centers_

    quantidade = len(centroides)

    if quantidade <= 1:
        return [
            [0]
        ]

    matriz_distancias = pairwise_distances(
        centroides,
        metric="euclidean"
    )

    grupos = [
        [i]
        for i in range(quantidade)
    ]

    while len(grupos) > K_MIN:

        menor_distancia = np.inf
        melhor_par = None

        for i in range(len(grupos)):

            for j in range(i + 1, len(grupos)):

                distancia = distancia_maxima_entre_grupos(
                    grupos[i],
                    grupos[j],
                    matriz_distancias
                )

                if distancia < menor_distancia:

                    menor_distancia = distancia
                    melhor_par = (i, j)

        if melhor_par is None:
            break

        # Não funde grupos que já ultrapassaram o limite.
        if menor_distancia > limite_distancia:
            break

        i, j = melhor_par

        novo_grupo = (
            grupos[i]
            +
            grupos[j]
        )

        grupos = [
            grupo
            for indice, grupo in enumerate(grupos)
            if indice not in (i, j)
        ]

        grupos.append(
            novo_grupo
        )

    grupos.sort(
        key=lambda grupo: min(grupo)
    )

    return grupos


def criar_mapeamento_clusters(grupos):
    """
    Converte os grupos de clusters iniciais para um mapeamento.

    Exemplo:

        grupos = [[0, 7], [1], [2, 8]]

        resultado:
        {
            0: 0,
            7: 0,
            1: 1,
            2: 2,
            8: 2
        }
    """

    mapeamento = {}

    for novo_cluster, grupo in enumerate(grupos):

        for cluster_original in grupo:

            mapeamento[
                cluster_original
            ] = novo_cluster

    return mapeamento


def aplicar_fusao_labels(
    labels,
    grupos
):
    """
    Aplica a fusão dos clusters aos chamados originais.
    """

    mapeamento = criar_mapeamento_clusters(
        grupos
    )

    novos_labels = np.array(
        [
            mapeamento[int(label)]
            for label in labels
        ],
        dtype=int
    )

    return novos_labels


def analisar_redundancia_clusters(
    modelo,
    labels
):
    """
    Executa a análise de redundância do K inicial.

    Retorna:
        grupos
        limite de distância
        distâncias dos vizinhos
        labels após a fusão
    """

    limite, distancias = (
        determinar_limite_redundancia(
            modelo
        )
    )

    grupos = fundir_centroides_por_distancia(
        modelo,
        limite
    )

    labels_fundidos = aplicar_fusao_labels(
        labels,
        grupos
    )

    return (
        grupos,
        limite,
        distancias,
        labels_fundidos
    )


# ============================================================
# VALIDAR K APÓS A FUSÃO
# ============================================================

def avaliar_solucao_final(
    X,
    labels,
    k=None
):
    """
    Calcula as métricas da solução final.

    Todas as métricas representam a solução efetivamente
    utilizada pelo modelo final.
    """

    quantidade_clusters = len(
        np.unique(labels)
    )

    if quantidade_clusters < 2:
        raise Exception(
            "A solução possui menos de 2 clusters."
        )

    silhouette = silhouette_score(
        X,
        labels
    )

    davies_bouldin = davies_bouldin_score(
        X,
        labels
    )

    tamanhos = np.bincount(
        labels
    )

    percentual_menor_cluster = (
        tamanhos.min() / len(X)
    )

    if k is None:
        k = quantidade_clusters

    estabilidade = calcular_estabilidade(
        X,
        k
    )

    return {
        "k": quantidade_clusters,
        "silhouette": float(silhouette),
        "davies_bouldin": float(davies_bouldin),
        "estabilidade": float(estabilidade),
        "tamanho_minimo": int(tamanhos.min()),
        "tamanho_maximo": int(tamanhos.max()),
        "percentual_menor_cluster": float(
            percentual_menor_cluster
        )
    }


def executar_kmeans_final(X, k):
    """
    Executa o K-Means definitivo depois que o K efetivo
    foi determinado.
    """

    modelo = KMeans(
        n_clusters=k,
        random_state=RANDOM_STATE,
        n_init=20
    )

    labels = modelo.fit_predict(
        X
    )

    return modelo, labels


def determinar_k_efetivo(
    X,
    modelo_inicial,
    labels_iniciais
):
    """
    Segunda etapa da calibração.

    1. Detecta centróides redundantes.
    2. Funde esses centróides.
    3. Mede a solução resultante.
    4. Executa um novo K-Means com o K efetivo.
    5. Valida novamente a solução.

    O K efetivo é portanto diferente do K inicial quando
    existem clusters praticamente iguais.
    """

    (
        grupos,
        limite,
        distancias,
        labels_fundidos
    ) = analisar_redundancia_clusters(
        modelo_inicial,
        labels_iniciais
    )

    k_inicial = len(
        modelo_inicial.cluster_centers_
    )

    k_efetivo = len(
        grupos
    )

    print("\n")
    print("=" * 70)
    print("ANÁLISE DE REDUNDÂNCIA DOS CLUSTERS")
    print("=" * 70)

    print(
        f"K inicial: {k_inicial}"
    )

    print(
        f"Limite automático de redundância: "
        f"{limite:.4f}"
    )

    print(
        "Distâncias dos vizinhos mais próximos:"
    )

    print(
        " ".join(
            f"{valor:.4f}"
            for valor in np.sort(distancias)
        )
    )

    print(
        f"\nClusters antes da fusão: "
        f"{k_inicial}"
    )

    print(
        f"Clusters após a fusão: "
        f"{k_efetivo}"
    )

    for novo_cluster, grupo in enumerate(grupos):

        if len(grupo) > 1:

            print(
                f"Grupo final {novo_cluster}: "
                f"fundiu clusters iniciais {grupo}"
            )

    if k_efetivo == k_inicial:

        print(
            "\nNenhum cluster foi considerado "
            "redundante pelo limite automático."
        )

    # --------------------------------------------------------
    # Avalia a solução diretamente obtida pela fusão.
    # --------------------------------------------------------

    avaliacao_fusao = avaliar_solucao_final(
        X,
        labels_fundidos
    )

    print("\nAvaliação após fusão:")
    print(
        f"K={avaliacao_fusao['k']} | "
        f"Silhouette={avaliacao_fusao['silhouette']:.4f} | "
        f"Davies-Bouldin={avaliacao_fusao['davies_bouldin']:.4f} | "
        f"Menor cluster={avaliacao_fusao['tamanho_minimo']}"
    )

    # --------------------------------------------------------
    # K-Means final
    # --------------------------------------------------------

    modelo_final, labels_finais = (
        executar_kmeans_final(
            X,
            k_efetivo
        )
    )

    avaliacao_final = avaliar_solucao_final(
        X,
        labels_finais,
        k_efetivo
    )

    estabilidade_final = (
        avaliacao_final["estabilidade"]
    )

    print("\nValidação do K-Means final:")
    print(
        f"K={avaliacao_final['k']} | "
        f"Silhouette={avaliacao_final['silhouette']:.4f} | "
        f"Davies-Bouldin={avaliacao_final['davies_bouldin']:.4f} | "
        f"Estabilidade={estabilidade_final:.4f} | "
        f"Menor cluster={avaliacao_final['tamanho_minimo']}"
    )

    return (
        k_efetivo,
        modelo_final,
        labels_finais,
        avaliacao_final,
        estabilidade_final,
        grupos,
        limite
    )



# ============================================================
# EXECUTAR K-MEANS
# ============================================================

def executar_kmeans(X, k):

    modelo = KMeans(
        n_clusters=k,
        random_state=RANDOM_STATE,
        n_init=20
    )

    labels = modelo.fit_predict(X)

    return modelo, labels


# ============================================================
# ANÁLISE DOS CLUSTERS
# ============================================================
def analisar_clusters(df, modelo, labels):

    df_analise = df.copy()

    df_analise["Cluster"] = labels

    analise = []

    print("\n")
    print("=" * 70)
    print("ANÁLISE DOS CLUSTERS")
    print("=" * 70)

    for cluster_num in sorted(df_analise["Cluster"].unique()):

        dados_cluster = df_analise[
            df_analise["Cluster"] == cluster_num
        ]

        quantidade = len(dados_cluster)

        media_dias = dados_cluster[
            "ChamadoDiasComProblema"
        ].mean()

        risco_humano = (
            dados_cluster["ChamadoRiscoVidaHumana"]
            .astype(int)
            .mean() * 100
        )

        risco_animal = (
            dados_cluster["ChamadoRiscoVidaAnimal"]
            .astype(int)
            .mean() * 100
        )

        bloqueio = (
            dados_cluster["ChamadoBloqueioVia"]
            .astype(int)
            .mean() * 100
        )

        media_tempo = dados_cluster[
            "TempoResolucaoHoras"
        ].mean()

        print(f"\nCluster {cluster_num}")
        print("-" * 50)

        print(f"Quantidade de chamados: {quantidade}")
        print(f"Média de dias com problema: {media_dias:.2f}")
        print(f"Risco humano: {risco_humano:.2f}%")
        print(f"Risco animal: {risco_animal:.2f}%")
        print(f"Bloqueio de via: {bloqueio:.2f}%")
        print(f"Média de resolução: {media_tempo:.2f} horas")

        analise.append({
            "ClusterNumero": int(cluster_num),
            "QuantidadeChamados": int(quantidade),
            "MediaDiasProblema": float(media_dias),
            "PercentualRiscoHumano": float(risco_humano),
            "PercentualRiscoAnimal": float(risco_animal),
            "PercentualBloqueioVia": float(bloqueio),
            "MediaTempoResolucaoHoras": float(media_tempo)
        })

    return analise



# ============================================================
# CRIAR EXECUÇÃO
# ============================================================

def criar_execucao(conn, unidade_id):

    cursor = conn.cursor()

    query = """
        INSERT INTO "ExecucaoMineracao"
        (
            "ExecucaoId",
            "UnidadeId",
            "ExecucaoDtInicio",
            "ExecucaoStatus",
            "ExecucaoQtdDados",
            "ExecucaoQtdClusters"
        )
        VALUES
        (
            gen_random_uuid(),
            %s,
            NOW(),
            'EXECUTANDO',
            0,
            0
        )
        RETURNING "ExecucaoId"
    """

    cursor.execute(query, (unidade_id,))

    execucao_id = cursor.fetchone()[0]

    conn.commit()

    cursor.close()

    return execucao_id


# ============================================================
# ATUALIZAR EXECUÇÃO
# ============================================================

def atualizar_execucao(
    conn,
    execucao_id,
    quantidade_dados,
    quantidade_clusters,
    silhouette,
    davies_bouldin,
    estabilidade,
    percentual_menor_cluster,
    score_combinado,
    status,
    mensagem_erro=None
):

    cursor = conn.cursor()

    query = """
        UPDATE "ExecucaoMineracao"
        SET
            "ExecucaoDtFim" = NOW(),
            "ExecucaoQtdDados" = %s,
            "ExecucaoQtdClusters" = %s,
            "ExecucaoSilhouetteScore" = %s,
            "ExecucaoDaviesBouldinScore" = %s,
            "ExecucaoEstabilidadeScore" = %s,
            "ExecucaoPercentualMenorCluster" = %s,
            "ExecucaoScoreCombinado" = %s,
            "ExecucaoStatus" = %s,
            "ExecucaoMensagemErro" = %s
        WHERE "ExecucaoId" = %s
    """

    cursor.execute(
        query,
        (
            quantidade_dados,
            quantidade_clusters,
            silhouette,
            davies_bouldin,
            estabilidade,
            percentual_menor_cluster,
            score_combinado,
            status,
            mensagem_erro,
            execucao_id
        )
    )

    conn.commit()

    cursor.close()


# ============================================================
# SALVAR CLUSTERS
# ============================================================

def salvar_clusters(
    conn,
    execucao_id,
    df,
    labels,
    quantidade_clusters
):

    cursor = conn.cursor()

    cluster_ids = {}

    # --------------------------------------------------------
    # Criar clusters
    # --------------------------------------------------------

    for cluster_num in range(quantidade_clusters):

        indices = np.where(labels == cluster_num)[0]

        dados_cluster = df.iloc[indices]

        quantidade = len(dados_cluster)

        media_dias = float(
            dados_cluster[
                "ChamadoDiasComProblema"
            ].mean()
        )

        percentual_risco_humano = float(
            dados_cluster[
                "ChamadoRiscoVidaHumana"
            ].astype(int).mean() * 100
        )

        percentual_risco_animal = float(
            dados_cluster[
                "ChamadoRiscoVidaAnimal"
            ].astype(int).mean() * 100
        )

        percentual_bloqueio = float(
            dados_cluster[
                "ChamadoBloqueioVia"
            ].astype(int).mean() * 100
        )

        media_tempo = float(
            dados_cluster[
                "TempoResolucaoHoras"
            ].mean()
        )

        # ----------------------------------------------------
        # Média de urgência
        #
        # Apenas para análise.
        # NÃO foi utilizada como entrada do K-Means.
        # ----------------------------------------------------

        media_urgencia = None

        if "ChamadoUrgencia" in dados_cluster.columns:

            # Caso ChamadoUrgencia seja enum/string,
            # tentamos mapear para números.
            mapa_urgencia = {
                "BAIXA": 1,
                "MEDIA": 2,
                "MÉDIA": 2,
                "ALTA": 3,
                "URGENTE": 4
            }

            urgencias = (
                dados_cluster["ChamadoUrgencia"]
                .map(mapa_urgencia)
            )

            if urgencias.notna().any():
                media_urgencia = float(
                    urgencias.mean()
                )

        # ----------------------------------------------------
        # Criar cluster
        # ----------------------------------------------------

        cursor.execute(
            """
            INSERT INTO "Cluster"
            (
                "ClusterId",
                "ClusterNumero",
                "ClusterQtdChamados",
                "ClusterMediaDiasProblema",
                "ClusterPercentualRiscoHumano",
                "ClusterPercentualRiscoAnimal",
                "ClusterPercentualBloqueioVia",
                "ClusterMediaTempoResolucao",
                "ClusterMediaUrgencia",
                "ExecucaoId"
            )
            VALUES
            (
                gen_random_uuid(),
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )
            RETURNING "ClusterId"
            """,
            (
                cluster_num,
                quantidade,
                media_dias,
                percentual_risco_humano,
                percentual_risco_animal,
                percentual_bloqueio,
                media_tempo,
                media_urgencia,
                execucao_id
            )
        )

        cluster_id = cursor.fetchone()[0]

        cluster_ids[cluster_num] = cluster_id

        # ----------------------------------------------------
        # Tipos de suporte presentes no cluster
        # ----------------------------------------------------

        tipos_cluster = (
            dados_cluster["TipSupId"]
            .value_counts()
        )

        print(
            f"\nCluster {cluster_num} - Tipos de suporte:"
        )

        print(
            dados_cluster["TipSupId"]
            .value_counts()
        )

        for tip_sup_id, quantidade_tipo in tipos_cluster.items():

            # TipSupId = -1 representa tipo não informado
            if int(tip_sup_id) == -1:
                continue

            percentual = (
                quantidade_tipo / quantidade
            ) * 100

            cursor.execute(
                """
                INSERT INTO "ClusterTipoSuporte"
                (
                    "ClusterTipoSuporteId",
                    "ClusterId",
                    "TipSupId",
                    "ClusterTipoQtdChamados",
                    "ClusterTipoPercentual"
                )
                VALUES
                (
                    gen_random_uuid(),
                    %s,
                    %s,
                    %s,
                    %s
                )
                ON CONFLICT ("ClusterId", "TipSupId")
                DO UPDATE SET
                    "ClusterTipoQtdChamados" = EXCLUDED."ClusterTipoQtdChamados",
                    "ClusterTipoPercentual" = EXCLUDED."ClusterTipoPercentual"
                """,
                (
                    cluster_id,
                    int(tip_sup_id),
                    int(quantidade_tipo),
                    float(percentual)
                )
            )

        # --------------------------------------------------------
        # Distribuição de urgência presente no cluster
        # --------------------------------------------------------

        urgencias_cluster = (
            dados_cluster["ChamadoUrgencia"]
            .dropna()
            .value_counts()
        )

        print(
            f"\nCluster {cluster_num} - Urgências:"
        )

        print(
            urgencias_cluster
        )

        for urgencia, quantidade_urgencia in urgencias_cluster.items():

            percentual = (
                quantidade_urgencia / quantidade
            ) * 100

            cursor.execute(
                """
                INSERT INTO "ClusterUrgencia"
                (
                    "ClusterUrgenciaId",
                    "ClusterId",
                    "ClusterUrgenciaNome",
                    "ClusterUrgenciaQtdChamados",
                    "ClusterUrgenciaPercentual"
                )
                VALUES
                (
                    gen_random_uuid(),
                    %s,
                    %s,
                    %s,
                    %s
                )
                ON CONFLICT ("ClusterId", "ClusterUrgenciaNome")
                DO UPDATE SET
                    "ClusterUrgenciaQtdChamados" = EXCLUDED."ClusterUrgenciaQtdChamados",
                    "ClusterUrgenciaPercentual" = EXCLUDED."ClusterUrgenciaPercentual"
                """,
                (
                    cluster_id,
                    str(urgencia),
                    int(quantidade_urgencia),
                    float(percentual)
                )
            )

    # --------------------------------------------------------
    # Associar chamados aos clusters
    # --------------------------------------------------------

    for index, cluster_num in enumerate(labels):

        chamado_id = df.iloc[index]["ChamadoId"]

        cluster_id = cluster_ids[int(cluster_num)]

        cursor.execute(
            """
            INSERT INTO "ChamadoCluster"
            (
                "ChamadoClusterId",
                "ChamadoId",
                "ClusterId"
            )
            VALUES
            (
                gen_random_uuid(),
                %s,
                %s
            )
            ON CONFLICT DO NOTHING
            """,
            (
                chamado_id,
                cluster_id
            )
        )

    conn.commit()

    cursor.close()


# ============================================================
# FUNÇÃO PRINCIPAL
# ============================================================

def main():

    print("=" * 60)
    print("INICIANDO MINERAÇÃO DE CHAMADOS")
    print("=" * 60)

    argumentos = parse_argumentos()
    unidade_id = argumentos.unidade_id

    print(f"Unidade alvo: {unidade_id}")

    conn = None
    execucao_id = None

    try:

        # ----------------------------------------------------
        # Conectar
        # ----------------------------------------------------

        conn = conectar_banco()

        print("Banco conectado.")

        # ----------------------------------------------------
        # Criar registro da execução
        # ----------------------------------------------------

        execucao_id = criar_execucao(conn, unidade_id)

        print(
            f"Execução criada: {execucao_id}"
        )

        # ----------------------------------------------------
        # Buscar dados
        # ----------------------------------------------------

        df = buscar_chamados(conn, unidade_id)

        print(
            f"Chamados encontrados: {len(df)}"
        )

        if len(df) < MINIMO_CHAMADOS:

            mensagem = (
                f"Quantidade insuficiente de chamados. "
                f"Mínimo: {MINIMO_CHAMADOS}."
            )

            atualizar_execucao(
                conn,
                execucao_id,
                len(df),
                0,
                None,
                None,
                None,
                None,
                None,
                "ERRO",
                mensagem
            )

            print(mensagem)

            return

        # ----------------------------------------------------
        # Preparar
        # ----------------------------------------------------

        df, X = preparar_dados(df)

        print(
            f"Quantidade de características: {X.shape[1]}"
        )

        # ----------------------------------------------------
        # Normalização
        # ----------------------------------------------------

        scaler = StandardScaler()

        X_normalizado = scaler.fit_transform(X)

        configuracao = buscar_configuracao_mineracao(
            conn,
            unidade_id
        )

        if argumentos.calibrar:

            # ==========================================
            # CALIBRAÇÃO
            # ==========================================

            print("\nModo: CALIBRAÇÃO")

            (
                k_inicial,
                silhouette_inicial,
                davies_inicial,
                score_inicial,
                resultados
            ) = encontrar_melhor_k(
                X_normalizado
            )

            # ------------------------------------------------
            # K-Means inicial
            # ------------------------------------------------

            modelo_inicial, labels_iniciais = (
                executar_kmeans(
                    X_normalizado,
                    k_inicial
                )
            )

            # ------------------------------------------------
            # Detectar redundância e determinar K efetivo
            # ------------------------------------------------

            (
                melhor_k,
                modelo_final,
                labels_finais,
                avaliacao_final,
                estabilidade_final,
                grupos_finais,
                limite_redundancia
            ) = determinar_k_efetivo(
                X_normalizado,
                modelo_inicial,
                labels_iniciais
            )

            melhor_silhouette = (
                avaliacao_final["silhouette"]
            )

            melhor_davies = (
                avaliacao_final["davies_bouldin"]
            )

            # Se o K final também foi testado na primeira etapa,
            # usamos o score calculado naquele mesmo conjunto de
            # candidatos. Caso contrário, mantemos o score do K
            # inicial como referência de calibração.
            """
            resultado_k_final = next(
                (
                    resultado
                    for resultado in resultados
                    if resultado["k"] == melhor_k
                ),
                None
            )

            if resultado_k_final is not None:
                melhor_score = (
                    resultado_k_final["score_combinado"]
                )
            else:
                melhor_score = score_inicial
            """

            melhor_estabilidade = (
                avaliacao_final["estabilidade"]
            )

            melhor_percentual_menor = (
                avaliacao_final["percentual_menor_cluster"]
            )

            melhor_score = recalcular_score_final(
                resultados,
                avaliacao_final
            )

            print("\n")
            print("=" * 70)
            print("RESULTADO FINAL DA CALIBRAÇÃO")
            print("=" * 70)

            print(
                f"K inicial: {k_inicial}"
            )

            print(
                f"K efetivo/final: {melhor_k}"
            )

            print(
                f"Clusters fundidos: "
                f"{k_inicial - melhor_k}"
            )

            print(
                f"Silhouette final: "
                f"{melhor_silhouette:.4f}"
            )

            print(
                f"Davies-Bouldin final: "
                f"{melhor_davies:.4f}"
            )

            print(
                f"Estabilidade final: "
                f"{estabilidade_final:.4f}"
            )

            print(
                f"Menor cluster final: "
                f"{melhor_percentual_menor * 100:.2f}%"
            )

            print(
                f"Score combinado final: "
                f"{melhor_score:.4f}"
            )

            print(
                f"Limite de redundância: "
                f"{limite_redundancia:.4f}"
            )

            print(
                f"Limite de redundância: "
                f"{limite_redundancia:.4f}"
            )

            salvar_configuracao_mineracao(
                conn,
                unidade_id,
                melhor_k,
                len(df),
                melhor_silhouette,
                melhor_davies,
                melhor_score
            )

            # O modelo final já foi treinado após a fusão.
            modelo = modelo_final
            labels = labels_finais

        else:

            # ==========================================
            # MINERAÇÃO NORMAL
            # ==========================================

            print("\nModo: MINERAÇÃO NORMAL")

            if not configuracao:

                raise Exception(
                    "A unidade ainda não possui "
                    "uma calibração. Execute com "
                    "--calibrar."
                )

            (
                melhor_k,
                quantidade_base,
                percentual_recalibracao,
                data_calibracao,
                silhouette_configurado,
                davies_configurado,
                score_configurado
            ) = configuracao

            precisa_recalibrar, crescimento = (
                verificar_recalibracao(
                    len(df),
                    quantidade_base,
                    percentual_recalibracao
                )
            )

            print(
                f"Quantidade na calibração: "
                f"{quantidade_base}"
            )

            print(
                f"Quantidade atual: "
                f"{len(df)}"
            )

            print(
                f"Crescimento: "
                f"{crescimento:.2f}%"
            )

            print(
                f"Limite para recalibração: "
                f"{percentual_recalibracao:.2f}%"
            )

            if precisa_recalibrar:

                print(
                    "\nATENÇÃO: a unidade atingiu "
                    "o limite para recalibração."
                )

                raise Exception(
                    "Recalibração necessária. "
                    "Execute novamente utilizando "
                    "--calibrar."
                )

            print(
                f"\nUtilizando K configurado: "
                f"{melhor_k}"
            )

            melhor_silhouette = silhouette_configurado
            melhor_davies     = davies_configurado
            melhor_score      = score_configurado

        # ----------------------------------------------------
        # K-Means final
        # ----------------------------------------------------
        #
        # Na calibração, o modelo final já foi criado após a
        # fusão dos clusters redundantes.
        #
        # Na mineração normal, o modelo é treinado usando o K
        # previamente calibrado e salvo na configuração.
        # ----------------------------------------------------

        if not argumentos.calibrar:

            modelo, labels = executar_kmeans(
                X_normalizado,
                melhor_k
            )

        analise_clusters = analisar_clusters(
            df,
            modelo,
            labels
        )

        for cluster in analise_clusters:
            print(cluster)

        # ----------------------------------------------------
        # Salvar
        # ----------------------------------------------------

        salvar_clusters(
            conn,
            execucao_id,
            df,
            labels,
            melhor_k
        )

        atualizar_execucao(
            conn,
            execucao_id,
            len(df),
            melhor_k,
            melhor_silhouette,
            melhor_davies,
            melhor_estabilidade,
            melhor_percentual_menor,
            melhor_score,
            "CONCLUIDA",
            None
        )

        print("\nMineração concluída.")

        print(
            f"Execução: {execucao_id}"
        )

        print(
            f"Clusters: {melhor_k}"
        )

        print(
            f"Silhouette: {melhor_silhouette:.4f}"
        )

        print(
            f"Davies-Bouldin: {melhor_davies:.4f}"
        )

        print(
            f"Score combinado: {melhor_score:.4f}"
        )

    except Exception as erro:

        print("\nERRO NA MINERAÇÃO:")
        print(str(erro))

        traceback.print_exc()

        if conn and execucao_id:

            atualizar_execucao(
                conn,
                execucao_id,
                0,
                0,
                None,
                None,
                None,
                None,
                None,
                "ERRO",
                str(erro)
            )

        sys.exit(1)

    finally:

        if conn:
            conn.close()

        print("\nProcesso finalizado.")


if __name__ == "__main__":
    main()
