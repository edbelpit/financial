import json
import csv
import os
from datetime import datetime
from collections import Counter

def carregar_json(nome_arquivo):
    """
    Carrega dados de um arquivo JSON
    
    Args:
        nome_arquivo: Nome do arquivo JSON
    
    Returns:
        list: Dados carregados ou None em caso de erro
    """
    try:
        # Verifica se o arquivo existe
        if not os.path.exists(nome_arquivo):
            print(f"❌ Arquivo não encontrado: {nome_arquivo}")
            return None
        
        # Lê o arquivo JSON
        with open(nome_arquivo, 'r', encoding='utf-8') as file:
            dados = json.load(file)
        
        print(f"✅ Arquivo carregado: {nome_arquivo}")
        return dados
        
    except json.JSONDecodeError as e:
        print(f"❌ Erro ao decodificar JSON: {e}")
        return None
    except Exception as e:
        print(f"❌ Erro ao ler arquivo: {e}")
        return None

def analisar_dados(dados):
    """
    Analisa os dados antes da conversão
    """
    if not dados:
        return
    
    print("\n📈 ANÁLISE DOS DADOS:")
    print("=" * 50)
    print(f"📊 Total de registros: {len(dados):,}")
    
    # Verifica a estrutura dos dados
    if dados:
        primeiro_registro = dados[0]
        print(f"📋 Campos disponíveis: {', '.join(primeiro_registro.keys())}")
    
    # Análise por mês (se existir o campo)
    if 'MES_REFERENCIA' in primeiro_registro:
        meses = set(item.get('MES_REFERENCIA', 'N/A') for item in dados)
        print(f"📅 Meses encontrados: {len(meses)}")
        print(f"   Período: {min(meses)} a {max(meses)}")
    
    # Análise por empresa (se existir o campo)
    if 'NOME_EMPRESARIAL' in primeiro_registro:
        empresas = set(item.get('NOME_EMPRESARIAL', 'N/A') for item in dados)
        print(f"🏢 Empresas únicas: {len(empresas):,}")
        
        # Top 5 empresas com mais registros
        empresa_counts = Counter(item.get('NOME_EMPRESARIAL', 'N/A') for item in dados)
        print("\n🏆 Top 5 empresas com mais registros:")
        for empresa, count in empresa_counts.most_common(5):
            print(f"   {empresa}: {count:,} registros")
    
    # Análise por perfil (se existir o campo)
    if 'CODIGO_PERFIL_AGENTE' in primeiro_registro:
        perfis = set(str(item.get('CODIGO_PERFIL_AGENTE', 'N/A')) for item in dados)
        print(f"🔢 Códigos de perfil únicos: {len(perfis)}")

def json_para_csv(dados, nome_arquivo_saida=None):
    """
    Converte dados JSON para CSV
    
    Args:
        dados: Lista de dicionários com os dados
        nome_arquivo_saida: Nome do arquivo de saída (opcional)
    
    Returns:
        str: Caminho do arquivo CSV gerado
    """
    if not dados:
        print("❌ Nenhum dado para converter")
        return None
    
    # Define nome do arquivo se não fornecido
    if not nome_arquivo_saida:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        nome_arquivo_saida = f"ccee_energy_contracts_{timestamp}.csv"
    
    try:
        # Extrai todos os cabeçalhos únicos
        headers = list(dados[0].keys())
        
        print(f"\n💾 Gerando arquivo CSV...")
        print(f"   Arquivo: {nome_arquivo_saida}")
        print(f"   Colunas: {len(headers)}")
        print(f"   Registros: {len(dados):,}")
        
        # Escreve o arquivo CSV
        with open(nome_arquivo_saida, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=headers)
            
            # Escreve cabeçalho
            writer.writeheader()
            
            # Escreve dados com barra de progresso
            for i, item in enumerate(dados):
                writer.writerow(item)
                
                # Mostra progresso a cada 10.000 registros
                if (i + 1) % 10000 == 0:
                    print(f"   Processados: {i + 1:,} registros")
        
        print(f"✅ CSV gerado com sucesso: {nome_arquivo_saida}")
        
        # Estatísticas finais
        tamanho_arquivo = os.path.getsize(nome_arquivo_saida)
        print(f"📏 Tamanho do arquivo: {tamanho_arquivo:,} bytes ({tamanho_arquivo / 1024 / 1024:.2f} MB)")
        
        return nome_arquivo_saida
        
    except Exception as e:
        print(f"❌ Erro ao gerar CSV: {e}")
        return None

def filtrar_dados_2025(dados):
    """
    Filtra dados apenas do ano 2025
    """
    if not dados:
        return []
    
    dados_2025 = [
        item for item in dados 
        if 'MES_REFERENCIA' in item and str(item['MES_REFERENCIA']).startswith('2025')
    ]
    
    print(f"\n🎯 Filtro aplicado - Ano 2025:")
    print(f"   Registros antes do filtro: {len(dados):,}")
    print(f"   Registros após filtro: {len(dados_2025):,}")
    
    return dados_2025

# Execução principal
if __name__ == "__main__":
    print("🚀 CONVERSOR CCEE ENERGY CONTRACTS - JSON para CSV")
    print("=" * 60)
    
    # Nome do arquivo JSON
    arquivo_json = "ccee_data.energy_contracts.json"
    
    # Carrega os dados do JSON
    dados = carregar_json(arquivo_json)
    
    if dados:
        # Analisa os dados
        analisar_dados(dados)
        
        # Filtra apenas 2025 (opcional - remova esta linha se quiser todos os dados)
        dados = filtrar_dados_2025(dados)
        
        # Converte para CSV
        if dados:
            csv_file = json_para_csv(dados, "ccee_energy_contracts_2025.csv")
            
            if csv_file:
                print(f"\n🎯 Conversão concluída!")
                print(f"💡 Arquivo salvo: {csv_file}")
                print("📊 Use Excel, Google Sheets ou outro software para visualizar")
            else:
                print("❌ Falha na conversão para CSV")
    else:
        print("❌ Não foi possível carregar os dados")
    
    print("\n" + "=" * 60)