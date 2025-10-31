import requests
import json
from pymongo import MongoClient
from datetime import datetime
import sys
import os
import time

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
        
        # Resource IDs conhecidos
        self.resource_ids = {
            "2024": "f6b478a0-bf4d-4d18-8f7f-067d01fefbd0",
            "2025": "e14c30bf-e02e-40a5-afd2-0491e41e03c7"
        }
    
    def get_resource_id(self, ano):
        """Tenta encontrar o resource ID para o ano"""
        if ano in self.resource_ids:
            return self.resource_ids[ano]
        
        print(f"🔍 Resource ID não conhecido para {ano}, tentando descobrir...")
        latest_known = max(self.resource_ids.keys())
        print(f"💡 Usando resource ID do ano mais recente conhecido: {latest_known}")
        return self.resource_ids[latest_known]
    
    def fetch_data_for_month(self, ano, mes):
        """Busca dados de um mês específico da API CCEE com paginação completa"""
        resource_id = self.get_resource_id(ano)
        if not resource_id:
            print(f"❌ Não foi possível obter resource ID para {ano}")
            return None
        
        mes_referencia = f"{ano}{mes:02d}"
        filters = {"MES_REFERENCIA": mes_referencia}
        filters_json = json.dumps(filters)
        
        print(f"🌐 Buscando {mes_referencia}...")
        
        all_records = []
        offset = 0
        limit = 500
        max_records = 50000
        total_records = None
        page = 1
        
        try:
            while len(all_records) < max_records:
                url = f"https://dadosabertos.ccee.org.br/api/3/action/datastore_search?resource_id={resource_id}&filters={filters_json}&limit={limit}&offset={offset}"
                
                print(f"   📄 Página {page}...")
                
                response = requests.get(url, timeout=60)
                response.raise_for_status()
                
                data = response.json()
                
                if data.get("success"):
                    result = data["result"]
                    records = result["records"]
                    
                    if total_records is None:
                        total_records = result.get("total", 0)
                        print(f"   📊 Total na API: {total_records:,} registros")
                        if total_records > max_records:
                            print(f"   ⚠️  Limitando para: {max_records:,} registros")
                    
                    if records:
                        all_records.extend(records)
                        print(f"   ✅ Página {page}: +{len(records):,} registros (Total: {len(all_records):,})")
                        
                        if len(records) < limit or len(all_records) >= total_records:
                            break
                        
                        offset += limit
                        page += 1
                        time.sleep(0.3)
                    else:
                        break
                else:
                    print(f"❌ Erro na API para {mes_referencia}")
                    return None
                    
            if all_records:
                print(f"🎯 {mes_referencia}: {len(all_records):,} registros baixados")
                
                empresas_unicas = len(set(record.get('NOME_EMPRESARIAL', '') for record in all_records))
                perfis_unicos = len(set(record.get('CODIGO_PERFIL_AGENTE', '') for record in all_records))
                print(f"   🏢 Empresas únicas: {empresas_unicas}")
                print(f"   🔢 Perfis únicos: {perfis_unicos}")
                
                return all_records
            else:
                print(f"⚠️  {mes_referencia}: 0 registros")
                return None
                
        except Exception as e:
            print(f"❌ Erro ao buscar {mes_referencia}: {e}")
            return None
    
    def save_data_fast_insert(self, data):
        """
        SALVAMENTO RÁPIDO - apenas INSERT para carga inicial
        """
        if not data:
            print("❌ Nenhum dado para salvar")
            return 0
        
        print("💾 Salvando dados (INSERT RÁPIDO)...")
        
        # Remove _ids para evitar conflitos
        for record in data:
            if '_id' in record:
                del record['_id']
            record['DATA_CARREGAMENTO'] = datetime.now()
        
        try:
            # INSERÇÃO EM LOTE - MUITO MAIS RÁPIDO
            result = self.collection.insert_many(data, ordered=False)
            print(f"✅ INSERT concluído: {len(result.inserted_ids):,} registros")
            return len(result.inserted_ids)
            
        except Exception as e:
            print(f"❌ Erro no INSERT: {e}")
            # Fallback: inserção um por um
            successful_inserts = 0
            for record in data:
                try:
                    self.collection.insert_one(record)
                    successful_inserts += 1
                except Exception as single_error:
                    continue
            print(f"✅ Fallback: {successful_inserts:,} registros inseridos")
            return successful_inserts
    
    def check_existing_data(self, mes_referencia):
        """Verifica se já existem dados para o mês"""
        count = self.collection.count_documents({"MES_REFERENCIA": mes_referencia})
        return count > 0
    
    def delete_month_data(self, ano, mes):
        """APAGA todos os dados de um mês específico"""
        mes_referencia = f"{ano}{mes:02d}"
        
        # Verifica se existe
        existing_count = self.collection.count_documents({"MES_REFERENCIA": mes_referencia})
        if existing_count == 0:
            print(f"ℹ️  {mes_referencia} não existe no banco")
            return 0
        
        # Confirmação
        confirm = input(f"⚠️  Apagar {existing_count:,} registros de {mes_referencia}? (s/N): ")
        if confirm.lower() != 's':
            print("❌ Operação cancelada")
            return 0
        
        # Apaga os dados
        try:
            result = self.collection.delete_many({"MES_REFERENCIA": mes_referencia})
            print(f"🗑️  {result.deleted_count:,} registros de {mes_referencia} removidos")
            return result.deleted_count
        except Exception as e:
            print(f"❌ Erro ao apagar {mes_referencia}: {e}")
            return 0
    
    def reload_month_data(self, ano, mes):
        """
        RECARREGA um mês específico: apaga e baixa novamente
        Útil quando faltam dados ou há problemas
        """
        mes_referencia = f"{ano}{mes:02d}"
        
        print(f"🔄 RECARREGANDO {mes_referencia}...")
        
        # Primeiro apaga os dados existentes
        deleted_count = self.delete_month_data(ano, mes)
        if deleted_count == 0:
            return 0
        
        # Depois busca e salva novos dados
        print(f"📥 Buscando {mes_referencia}...")
        records = self.fetch_data_for_month(ano, mes)
        
        if records:
            saved_count = self.save_data_fast_insert(records)
            print(f"✅ {mes_referencia}: {saved_count:,} registros recarregados")
            return saved_count
        else:
            print(f"❌ Não foi possível carregar dados para {mes_referencia}")
            return 0
    
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
            return 2000 <= year_num <= 2100
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
        """Carrega dados de um ano completo - apenas meses NOVOS"""
        if not self.is_valid_year(ano):
            print(f"❌ Ano inválido: {ano}")
            return 0
        
        if meses is None:
            meses = list(range(1, 13))
        
        print(f"🎯 CARGA INICIAL para {ano}...")
        print("💡 Apenas meses que NÃO existem no banco")
        
        total_records = 0
        months_processed = 0
        
        for mes in meses:
            mes_referencia = f"{ano}{mes:02d}"
            
            # VERIFICA se o mês já existe - se existir, PULA
            if self.check_existing_data(mes_referencia):
                existing_count = self.collection.count_documents({"MES_REFERENCIA": mes_referencia})
                print(f"⏭️  {mes_referencia} já existe ({existing_count:,} registros), pulando...")
                continue
            
            print(f"📥 Buscando {mes_referencia}...")
            records = self.fetch_data_for_month(ano, mes)
            
            if records:
                saved_count = self.save_data_fast_insert(records)
                total_records += saved_count
                months_processed += 1
                print(f"✅ {mes_referencia}: {saved_count:,} registros")
            else:
                print(f"⚠️  Sem dados para {mes_referencia}")
        
        # Cria índices apenas se adicionou dados novos
        if total_records > 0:
            self.create_indexes()
        
        print(f"📈 {ano}: {total_records:,} registros em {months_processed} meses")
        return total_records
    
    def create_indexes(self):
        """Cria índices para performance"""
        try:
            self.collection.create_index("NOME_EMPRESARIAL")
            self.collection.create_index("MES_REFERENCIA")
            self.collection.create_index("CODIGO_PERFIL_AGENTE")
            self.collection.create_index([("MES_REFERENCIA", 1), ("CODIGO_PERFIL_AGENTE", 1)])
            print("📊 Índices criados/atualizados")
        except Exception as e:
            print(f"⚠️  Erro nos índices: {e}")
    
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
            
            print(f"✅ Ano {ano}: {records_loaded:,} registros carregados")
        
        return total_records
    
    def clear_database(self):
        """Limpa todo o banco de dados"""
        confirm = input("⚠️  TEM CERTEZA que quer limpar TODOS os dados? (s/N): ")
        if confirm.lower() == 's':
            result = self.collection.delete_many({})
            print(f"🗑️  {result.deleted_count:,} registros removidos")
            return True
        else:
            print("❌ Operação cancelada")
            return False
    
    def get_database_stats(self):
        """Retorna estatísticas do banco"""
        total_records = self.collection.count_documents({})
        empresas_count = len(self.collection.distinct("NOME_EMPRESARIAL"))
        meses = self.collection.distinct("MES_REFERENCIA")
        anos = list(set(mes[:4] for mes in meses))
        
        print(f"\n{'='*50}")
        print("📊 ESTATÍSTICAS DO BANCO DE DADOS")
        print(f"{'='*50}")
        print(f"📈 Total de registros: {total_records:,}")
        print(f"🏢 Empresas únicas: {empresas_count:,}")
        print(f"📅 Meses disponíveis: {len(meses)}")
        print(f"🎯 Anos disponíveis: {sorted(anos)}")
        
        # Estatísticas por ano
        for ano in sorted(anos):
            count = self.collection.count_documents({"MES_REFERENCIA": {"$regex": f"^{ano}"}})
            meses_ano = [mes for mes in meses if mes.startswith(ano)]
            empresas_ano = len(self.collection.distinct("NOME_EMPRESARIAL", {"MES_REFERENCIA": {"$regex": f"^{ano}"}}))
            print(f"   {ano}: {count:,} registros, {empresas_ano:,} empresas, {len(meses_ano)} meses")
    
    def close_connection(self):
        """Fecha a conexão com o MongoDB"""
        if self.client:
            self.client.close()
            print("🔌 Conexão com MongoDB fechada")

def main():
    loader = CCEEDataLoader()
    
    print("🚀 CARREGADOR DE DADOS CCEE - CARGA INICIAL")
    print("💡 Apenas meses NOVOS (não sobrescreve existentes)")
    print(f"📚 Resource IDs conhecidos: {list(loader.resource_ids.keys())}")
    
    try:
        while True:
            print("\n📝 OPÇÕES:")
            print("1. Carregar ano específico")
            print("2. Carregar múltiplos anos") 
            print("3. Carregar mês específico")
            print("4. RECARREGAR mês específico (apaga e baixa de novo)")
            print("5. APAGAR mês específico")
            print("6. Ver estatísticas do banco")
            print("7. LIMPAR BANCO DE DADOS (TUDO!)")
            print("8. Sair")
            
            opcao = input("\nEscolha uma opção (1-8): ").strip()
            
            if opcao == "1":
                ano = input("Digite o ano (YYYY): ").strip()
                if loader.is_valid_year(ano):
                    total = loader.load_year_data(ano)
                    print(f"\n✅ CARGA CONCLUÍDA! {total:,} registros para {ano}")
                else:
                    print("❌ Ano deve estar entre 2000-2100")
            
            elif opcao == "2":
                anos_input = input("Digite os anos separados por vírgula (ex: 2024,2025): ").strip()
                anos_list = [ano.strip() for ano in anos_input.split(",")]
                valid_anos = [ano for ano in anos_list if loader.is_valid_year(ano)]
                
                if valid_anos:
                    total = loader.load_multiple_years(valid_anos)
                    print(f"\n✅ CARGA CONCLUÍDA! {total:,} registros no total")
                else:
                    print("❌ Nenhum ano válido encontrado")
            
            elif opcao == "3":
                ano = input("Digite o ano (YYYY): ").strip()
                mes = input("Digite o mês (MM): ").strip()
                
                if loader.is_valid_year(ano) and loader.is_valid_month(mes):
                    mes_referencia = f"{ano}{int(mes):02d}"
                    
                    if loader.check_existing_data(mes_referencia):
                        existing_count = loader.collection.count_documents({"MES_REFERENCIA": mes_referencia})
                        print(f"❌ {mes_referencia} já existe ({existing_count:,} registros)")
                        continue
                    
                    records = loader.fetch_data_for_month(ano, int(mes))
                    if records:
                        saved_count = loader.save_data_fast_insert(records)
                        print(f"✅ {mes_referencia}: {saved_count:,} registros carregados")
                    else:
                        print(f"❌ Não foi possível carregar dados para {mes_referencia}")
                else:
                    print("❌ Ano deve estar entre 2000-2100, mês deve ser 01-12")
            
            elif opcao == "4":
                ano = input("Digite o ano (YYYY): ").strip()
                mes = input("Digite o mês (MM): ").strip()
                
                if loader.is_valid_year(ano) and loader.is_valid_month(mes):
                    total = loader.reload_month_data(ano, int(mes))
                    if total > 0:
                        print(f"✅ {ano}-{mes}: {total:,} registros RECARREGADOS")
                    else:
                        print(f"❌ Falha ao recarregar {ano}-{mes}")
                else:
                    print("❌ Ano deve estar entre 2000-2100, mês deve ser 01-12")
            
            elif opcao == "5":
                ano = input("Digite o ano (YYYY): ").strip()
                mes = input("Digite o mês (MM): ").strip()
                
                if loader.is_valid_year(ano) and loader.is_valid_month(mes):
                    loader.delete_month_data(ano, int(mes))
                else:
                    print("❌ Ano deve estar entre 2000-2100, mês deve ser 01-12")
            
            elif opcao == "6":
                loader.get_database_stats()
            
            elif opcao == "7":
                loader.clear_database()
            
            elif opcao == "8":
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