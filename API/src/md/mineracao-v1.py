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
    davies_bouldin_score
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
K_MAX = 30

# Reprodutibilidade
RANDOM_STATE = 42

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
    # Tipo de suporte
    #
    # Não usamos o ID diretamente.
    # Fazemos One-Hot Encoding.
    # --------------------------------------------------------

    df["TipSupId"] = (
        df["TipSupId"]
        .fillna(-1)
        .astype(str)
    )

    tipos = pd.get_dummies(
        df["TipSupId"],
        prefix="Tipo"
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

    # Junta características numéricas e tipo
    X = pd.concat(
        [numericas, tipos.astype(float)],
        axis=1
    )

    return df, X


# ============================================================
# ENCONTRAR MELHOR K
# ============================================================

def encontrar_melhor_k(X):

    quantidade = len(X)

    k_maximo = min(
        K_MAX,
        quantidade - 1
    )

    resultados = []

    for k in range(K_MIN, k_maximo + 1):

        modelo = KMeans(
            n_clusters=k,
            random_state=RANDOM_STATE,
            n_init=20
        )

        labels = modelo.fit_predict(X)

        if len(set(labels)) < 2:
            continue

        # --------------------------------------------------------
        # Silhouette
        # Maior = melhor
        # --------------------------------------------------------

        silhouette = silhouette_score(
            X,
            labels
        )

        # --------------------------------------------------------
        # Davies-Bouldin
        # Menor = melhor
        # --------------------------------------------------------

        davies_bouldin = davies_bouldin_score(
            X,
            labels
        )

        resultados.append({
            "k": k,
            "silhouette": float(silhouette),
            "davies_bouldin": float(davies_bouldin)
        })

        print(
            f"K={k} | "
            f"Silhouette={silhouette:.4f} | "
            f"Davies-Bouldin={davies_bouldin:.4f}"
        )

    if not resultados:
        raise Exception(
            "Não foi possível determinar o número de clusters."
        )

    # ============================================================
    # NORMALIZAÇÃO DAS MÉTRICAS
    # ============================================================

    silhouettes = np.array([
        r["silhouette"]
        for r in resultados
    ])

    davies = np.array([
        r["davies_bouldin"]
        for r in resultados
    ])

    # Silhouette:
    # maior é melhor
    if silhouettes.max() == silhouettes.min():
        silhouette_normalizado = np.ones(
            len(silhouettes)
        )
    else:
        silhouette_normalizado = (
            (silhouettes - silhouettes.min())
            /
            (silhouettes.max() - silhouettes.min())
        )

    # Davies-Bouldin:
    # menor é melhor
    if davies.max() == davies.min():
        davies_normalizado = np.ones(
            len(davies)
        )
    else:
        davies_normalizado = (
            (davies.max() - davies)
            /
            (davies.max() - davies.min())
        )

    # ============================================================
    # SCORE COMBINADO
    # ============================================================
    #
    # 50% Silhouette
    # 50% Davies-Bouldin
    #

    for i, resultado in enumerate(resultados):

        resultado["silhouette_normalizado"] = float(
            silhouette_normalizado[i]
        )

        resultado["davies_normalizado"] = float(
            davies_normalizado[i]
        )

        resultado["score_combinado"] = float(
            (
                silhouette_normalizado[i]
                +
                davies_normalizado[i]
            ) / 2
        )

    melhor = max(
        resultados,
        key=lambda x: x["score_combinado"]
    )

    print("\nResultados finais:")

    for resultado in resultados:

        print(
            f"K={resultado['k']} | "
            f"Silhouette={resultado['silhouette']:.4f} | "
            f"Davies-Bouldin={resultado['davies_bouldin']:.4f} | "
            f"Score combinado={resultado['score_combinado']:.4f}"
        )

    print(
        f"\nMelhor K pelo score combinado: "
        f"{melhor['k']}"
    )

    return (
        melhor["k"],
        melhor["silhouette"],
        melhor["davies_bouldin"],
        melhor["score_combinado"],
        resultados
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
            ].astype(int).mean()
        )

        percentual_risco_animal = float(
            dados_cluster[
                "ChamadoRiscoVidaAnimal"
            ].astype(int).mean()
        )

        percentual_bloqueio = float(
            dados_cluster[
                "ChamadoBloqueioVia"
            ].astype(int).mean()
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
                melhor_k,
                melhor_silhouette,
                melhor_davies,
                melhor_score,
                resultados
            ) = encontrar_melhor_k(
                X_normalizado
            )

            print(
                f"\nK escolhido: {melhor_k}"
            )

            print(
                f"Silhouette: "
                f"{melhor_silhouette:.4f}"
            )

            print(
                f"Davies-Bouldin: "
                f"{melhor_davies:.4f}"
            )

            print(
                f"Score combinado: "
                f"{melhor_score:.4f}"
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

        modelo, labels = executar_kmeans(
            X_normalizado,
            melhor_k
        )

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
            f"Silhouette: {melhor_score:.4f}"
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
