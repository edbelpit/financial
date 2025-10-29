import requests
import json
from pymongo import MongoClient
from datetime import datetime
import sys
import os

class CCEEDataLoader:
    def __init__(self):
        # Configuração de conexão com autenticação
        MONGODB_USER = os.getenv("MONGODB_USER", "belpit")
        MONGODB_PASS = os.getenv("MONGODB_PASS", "Belpit364!")
        MONGODB_HOST = os.getenv("MONGODB_HOST", "localhost")
        MONGODB_PORT = os.getenv("MONGODB_PORT", "27017")
        MONGODB_DB = os.getenv("MONGODB_DB", "ccee_data")
        
        # URI de conexão com autenticação
        MONGODB_URI = f"mongodb://{MONGODB_USER}:{MONGODB_PASS}@{MONGODB_HOST}:{MONGODB_PORT}/{MONGODB_DB}?authSource=admin"
        
        try:
            self.client = MongoClient(MONGODB_URI)
            self.db = self.client[MONGODB_DB]
            self.collection = self.db["energy_contracts"]
            
            # Testar conexão e autenticação
            self.client.admin.command('ping')
            print("✅ Autenticação bem-sucedida!")
            print(f"✅ Conectado ao MongoDB: {MONGODB_HOST}:{MONGODB_PORT}/{MONGODB_DB}")
            
            # Verificar se o database existe, se não, criar
            if MONGODB_DB not in self.client.list_database_names():
                print(f"📁 Database {MONGODB_DB} será criado na primeira inserção")
            else:
                print(f"📁 Database {MONGODB_DB} encontrado")
                
        except Exception as e:
            print(f"❌ Erro de autenticação/conexão: {e}")
            print(f"💡 Verifique se o MongoDB está rodando e as credenciais estão corretas")
            sys.exit(1)
        
        # Resource IDs conhecidos - podemos adicionar novos anos conforme surgirem
        self.resource_ids = {
            "2024": "f6b478a0-bf4d-4d18-8f7f-067d01fefbd0",
            "2025": "e14c30bf-e02e-40a5-afd2-0491e41e03c7"
        }
    
    def get_resource_id(self, ano):
        """Tenta encontrar o resource ID para o ano"""
        # Primeiro tenta os IDs conhecidos
        if ano in self.resource_ids:
            return self.resource_ids[ano]
        
        # Se não encontrou, tenta descobrir automaticamente
        print(f"🔍 Resource ID não conhecido para {ano}, tentando descobrir...")
        
        # Para anos futuros, podemos tentar o padrão mais recente
        # Ou buscar na documentação da API CCEE
        latest_known = max(self.resource_ids.keys())
        print(f"💡 Usando resource ID do ano mais recente conhecido: {latest_known}")
        return self.resource_ids[latest_known]
    
    def test_resource_id(self, resource_id, ano, mes):
        """Testa se o resource ID funciona para o ano"""
        try:
            mes_referencia = f"{ano}{mes:02d}"
            filters = {"MES_REFERENCIA": mes_referencia}
            filters_json = json.dumps(filters)
            
            url = f"https://dadosabertos.ccee.org.br/api/3/action/datastore_search?resource_id={resource_id}&filters={filters_json}&limit=1"
            
            response = requests.get(url, timeout=10)
            data = response.json()
            
            if data.get("success") and data["result"]["records"]:
                return True
        except:
            pass
        return False
    
    def discover_resource_id(self, ano):
        """Tenta descobrir o resource ID para um ano específico"""
        print(f"🎯 Tentando descobrir resource ID para {ano}...")
        
        # Padrões comuns de resource IDs (podemos expandir isso)
        test_ids = [
            f"resource_{ano}",  # Padrão possível
            # Adicione outros padrões aqui conforme descobrir
        ]
        
        for test_id in test_ids:
            if self.test_resource_id(test_id, ano, 1):  # Testa com janeiro
                print(f"✅ Resource ID descoberto: {test_id}")
                self.resource_ids[ano] = test_id
                return test_id
        
        print(f"❌ Não foi possível descobrir resource ID para {ano}")
        return None
    
    def fetch_data_for_month(self, ano, mes):
        """Busca dados de um mês específico da API CCEE"""
        resource_id = self.get_resource_id(ano)
        if not resource_id:
            print(f"❌ Não foi possível obter resource ID para {ano}")
            return None
        
        mes_referencia = f"{ano}{mes:02d}"
        filters = {"MES_REFERENCIA": mes_referencia}
        filters_json = json.dumps(filters)
        
        url = f"https://dadosabertos.ccee.org.br/api/3/action/datastore_search?resource_id={resource_id}&filters={filters_json}"
        
        print(f"🌐 Buscando {mes_referencia}...")
        
        try:
            response = requests.get(url, timeout=60)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get("success"):
                records = data["result"]["records"]
                if records:
                    print(f"✅ {mes_referencia}: {len(records)} registros")
                    return records
                else:
                    print(f"⚠️  {mes_referencia}: 0 registros (possivelmente mês sem dados)")
                    return None
            else:
                print(f"❌ Erro na API para {mes_referencia}")
                return None
                
        except Exception as e:
            print(f"❌ Erro ao buscar {mes_referencia}: {e}")
            return None
    
    def check_existing_data(self, mes_referencia):
        """Verifica se já existem dados para o mês"""
        count = self.collection.count_documents({"MES_REFERENCIA": mes_referencia})
        return count > 0
    
    def remove_duplicate_ids(self, records):
        """Remove _id dos registros para evitar conflitos"""
        for record in records:
            if '_id' in record:
                del record['_id']
        return records
    
    def is_valid_year(self, ano):
        """Valida se o ano é válido"""
        try:
            year_num = int(ano)
            return 2000 <= year_num <= 2100  # Aceita anos entre 2000 e 2100
        except:
            return False
    
    def is_valid_month(self, mes):
        """Valida se o mês é válido"""
        try:
            month_num = int(mes)
            return 1 <= month_num <= 12
        except:
            return False
    
    def load_year_data(self, ano, meses=None):
        """Carrega dados de um ano completo"""
        if not self.is_valid_year(ano):
            print(f"❌ Ano inválido: {ano}")
            return 0
        
        if meses is None:
            meses = list(range(1, 13))  # Todos os meses
        
        print(f"🎯 Iniciando carga de dados para {ano}...")
        
        total_records = 0
        months_with_data = 0
        
        for mes in meses:
            mes_referencia = f"{ano}{mes:02d}"
            
            # Verifica se já existe
            existing_count = self.collection.count_documents({"MES_REFERENCIA": mes_referencia})
            if existing_count > 0:
                print(f"⏭️  {mes_referencia} já existe ({existing_count} registros), pulando...")
                continue
            
            # Busca dados
            records = self.fetch_data_for_month(ano, mes)
            
            if records:
                # Remove _ids para evitar conflitos
                records = self.remove_duplicate_ids(records)
                
                # Insere no MongoDB
                try:
                    result = self.collection.insert_many(records)
                    total_records += len(result.inserted_ids)
                    months_with_data += 1
                    print(f"💾 {mes_referencia} salvo no MongoDB")
                except Exception as e:
                    print(f"❌ Erro ao salvar {mes_referencia}: {e}")
                    # Tenta inserir um por um
                    successful_inserts = 0
                    for record in records:
                        try:
                            self.collection.insert_one(record)
                            successful_inserts += 1
                        except Exception as single_error:
                            print(f"   ⚠️ Erro em registro individual: {single_error}")
                    total_records += successful_inserts
                    months_with_data += 1 if successful_inserts > 0 else 0
                    print(f"💾 {mes_referencia}: {successful_inserts}/{len(records)} registros salvos")
            else:
                print(f"⚠️  Nenhum dado encontrado para {mes_referencia}")
        
        # Cria índices se carregou dados novos
        if total_records > 0:
            try:
                self.collection.create_index("NOME_EMPRESARIAL")
                self.collection.create_index("MES_REFERENCIA")
                self.collection.create_index([("NOME_EMPRESARIAL", 1), ("MES_REFERENCIA", 1)])
                print("📊 Índices criados/atualizados")
            except Exception as e:
                print(f"⚠️  Erro ao criar índices: {e}")
        
        print(f"📈 {ano}: {total_records} registros em {months_with_data} meses")
        return total_records
    
    def load_multiple_years(self, anos):
        """Carrega dados de múltiplos anos"""
        total_records = 0
        
        for ano in anos:
            ano = ano.strip()
            if not self.is_valid_year(ano):
                print(f"❌ Ano inválido: {ano}, pulando...")
                continue
                
            print(f"\n{'='*50}")
            print(f"📅 PROCESSANDO ANO {ano}")
            print(f"{'='*50}")
            
            records_loaded = self.load_year_data(ano)
            total_records += records_loaded
            
            print(f"✅ Ano {ano}: {records_loaded} registros carregados")
        
        return total_records
    
    def clear_database(self):
        """Limpa todo o banco de dados"""
        confirm = input("⚠️  TEM CERTEZA que quer limpar TODOS os dados? (s/N): ")
        if confirm.lower() == 's':
            result = self.collection.delete_many({})
            print(f"🗑️  {result.deleted_count} registros removidos")
            return True
        else:
            print("❌ Operação cancelada")
            return False
    
    def get_database_stats(self):
        """Retorna estatísticas do banco"""
        total_records = self.collection.count_documents({})
        meses = self.collection.distinct("MES_REFERENCIA")
        anos = list(set(mes[:4] for mes in meses))
        
        print(f"\n{'='*50}")
        print("📊 ESTATÍSTICAS DO BANCO DE DADOS")
        print(f"{'='*50}")
        print(f"📈 Total de registros: {total_records:,}")
        print(f"📅 Meses disponíveis: {len(meses)}")
        print(f"🎯 Anos disponíveis: {sorted(anos)}")
        print(f"📋 Meses: {sorted(meses)}")
        
        # Estatísticas por ano
        for ano in sorted(anos):
            count = self.collection.count_documents({"MES_REFERENCIA": {"$regex": f"^{ano}"}})
            meses_ano = [mes for mes in meses if mes.startswith(ano)]
            print(f"   {ano}: {count:,} registros, {len(meses_ano)} meses")
    
    def add_resource_id(self):
        """Adiciona manualmente um resource ID para um ano"""
        ano = input("Digite o ano (YYYY): ").strip()
        resource_id = input("Digite o resource ID: ").strip()
        
        if self.is_valid_year(ano) and resource_id:
            self.resource_ids[ano] = resource_id
            print(f"✅ Resource ID adicionado para {ano}: {resource_id}")
        else:
            print("❌ Ano ou resource ID inválido")

    def close_connection(self):
        """Fecha a conexão com o MongoDB"""
        if self.client:
            self.client.close()
            print("🔌 Conexão com MongoDB fechada")

def main():
    loader = CCEEDataLoader()
    
    print("🚀 CARREGADOR DE DADOS CCEE - ANOS DINÂMICOS")
    print("💡 Aceita qualquer ano entre 2000-2100")
    print(f"📚 Resource IDs conhecidos: {list(loader.resource_ids.keys())}")
    
    try:
        while True:
            print("\n📝 OPÇÕES:")
            print("1. Carregar ano específico")
            print("2. Carregar múltiplos anos")
            print("3. Carregar mês específico")
            print("4. Ver estatísticas do banco")
            print("5. Adicionar resource ID manualmente")
            print("6. LIMPAR BANCO DE DADOS (cuidado!)")
            print("7. Sair")
            
            opcao = input("\nEscolha uma opção (1-7): ").strip()
            
            if opcao == "1":
                ano = input("Digite o ano (YYYY): ").strip()
                if loader.is_valid_year(ano):
                    total = loader.load_year_data(ano)
                    print(f"\n✅ Carga concluída! {total} registros carregados para {ano}")
                else:
                    print("❌ Ano deve estar entre 2000-2100")
            
            elif opcao == "2":
                anos_input = input("Digite os anos separados por vírgula (ex: 2024,2025,2026): ").strip()
                anos_list = [ano.strip() for ano in anos_input.split(",")]
                valid_anos = [ano for ano in anos_list if loader.is_valid_year(ano)]
                
                if valid_anos:
                    total = loader.load_multiple_years(valid_anos)
                    print(f"\n✅ Carga concluída! {total} registros carregados no total")
                else:
                    print("❌ Nenhum ano válido encontrado")
            
            elif opcao == "3":
                ano = input("Digite o ano (YYYY): ").strip()
                mes = input("Digite o mês (MM): ").strip()
                
                if loader.is_valid_year(ano) and loader.is_valid_month(mes):
                    mes_referencia = f"{ano}{int(mes):02d}"
                    
                    existing_count = loader.collection.count_documents({"MES_REFERENCIA": mes_referencia})
                    if existing_count > 0:
                        print(f"⏭️  {mes_referencia} já existe ({existing_count} registros)")
                        replace = input("Deseja substituir? (s/N): ")
                        if replace.lower() == 's':
                            loader.collection.delete_many({"MES_REFERENCIA": mes_referencia})
                            print(f"🗑️  {existing_count} registros removidos")
                        else:
                            continue
                    
                    records = loader.fetch_data_for_month(ano, int(mes))
                    if records:
                        records = loader.remove_duplicate_ids(records)
                        result = loader.collection.insert_many(records)
                        print(f"✅ {mes_referencia}: {len(result.inserted_ids)} registros carregados")
                    else:
                        print(f"❌ Não foi possível carregar dados para {mes_referencia}")
                else:
                    print("❌ Ano deve estar entre 2000-2100, mês deve ser 01-12")
            
            elif opcao == "4":
                loader.get_database_stats()
            
            elif opcao == "5":
                loader.add_resource_id()
            
            elif opcao == "6":
                loader.clear_database()
            
            elif opcao == "7":
                print("👋 Saindo...")
                break
            
            else:
                print("❌ Opção inválida")
    
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrompido pelo usuário")
    except Exception as e:
        print(f"\n❌ Erro inesperado: {e}")
    finally:
        loader.close_connection()

if __name__ == "__main__":
    main()