import requests
import json
from pymongo import MongoClient
from datetime import datetime
import sys
import os
import time

class CCEEDataUpdater:
    def __init__(self):
        # Mesma configuração do data_loader
        MONGODB_USER = os.getenv("MONGODB_USER", "belpit")
        MONGODB_PASS = os.getenv("MONGODB_PASS", "Belpit364!")
        MONGODB_HOST = os.getenv("MONGODB_HOST", "localhost")
        MONGODB_PORT = os.getenv("MONGODB_PORT", "27017")
        MONGODB_DB = os.getenv("MONGODB_DB", "ccee_data")
        
        MONGODB_URI = f"mongodb://{MONGODB_USER}:{MONGODB_PASS}@{MONGODB_HOST}:{MONGODB_PORT}/{MONGODB_DB}?authSource=admin"
        
        try:
            self.client = MongoClient(MONGODB_URI)
            self.db = self.client[MONGODB_DB]
            self.collection = self.db["energy_contracts"]
            self.client.admin.command('ping')
            print("✅ Conectado ao MongoDB")
        except Exception as e:
            print(f"❌ Erro de conexão: {e}")
            sys.exit(1)
        
        self.resource_ids = {
            "2024": "f6b478a0-bf4d-4d18-8f7f-067d01fefbd0",
            "2025": "e14c30bf-e02e-40a5-afd2-0491e41e03c7"
        }
    
    def get_latest_stored_month(self):
        """Pega o último MES_REFERENCIA do nosso banco"""
        try:
            latest = self.collection.find_one(
                {}, 
                sort=[("MES_REFERENCIA", -1)],
                projection={"MES_REFERENCIA": 1}
            )
            if latest and "MES_REFERENCIA" in latest:
                mes_ref = latest["MES_REFERENCIA"]
                ano = int(mes_ref[:4])
                mes = int(mes_ref[4:6])
                print(f"📅 Último mês no banco: {ano}-{mes:02d}")
                return ano, mes
        except Exception as e:
            print(f"❌ Erro ao buscar último mês: {e}")
        
        print("ℹ️  Nenhum dado no banco")
        return None, None
    
    def get_next_month(self, ano, mes):
        """Calcula o próximo mês"""
        if mes == 12:
            return ano + 1, 1
        else:
            return ano, mes + 1
    
    def check_month_exists_in_api(self, ano, mes):
        """Verifica se um mês existe na API CCEE"""
        try:
            from data_loader import CCEEDataLoader
            loader = CCEEDataLoader()
            resource_id = loader.get_resource_id(str(ano))
            
            mes_referencia = f"{ano}{mes:02d}"
            filters = {"MES_REFERENCIA": mes_referencia}
            filters_json = json.dumps(filters)
            
            url = f"https://dadosabertos.ccee.org.br/api/3/action/datastore_search?resource_id={resource_id}&filters={filters_json}&limit=1"
            
            response = requests.get(url, timeout=10)
            data = response.json()
            
            exists = data.get("success") and data["result"]["records"]
            print(f"🔍 {ano}-{mes:02d} na API: {'✅' if exists else '❌'}")
            return exists
            
        except Exception as e:
            print(f"❌ Erro ao verificar {ano}-{mes:02d}: {e}")
            return False
    
    def fetch_and_save_month(self, ano, mes):
        """Busca e salva dados de um mês"""
        try:
            from data_loader import CCEEDataLoader
            loader = CCEEDataLoader()
            
            print(f"🌐 Buscando {ano}-{mes:02d}...")
            records = loader.fetch_data_for_month(ano, mes)
            
            if records:
                saved_count = loader.save_data_fast_insert(records)
                print(f"✅ {ano}-{mes:02d}: {saved_count:,} registros")
                return saved_count
            else:
                print(f"⚠️  Sem dados para {ano}-{mes:02d}")
                return 0
                
        except Exception as e:
            print(f"❌ Erro ao carregar {ano}-{mes:02d}: {e}")
            return 0
    
    def update_new_data(self):
        """ATUALIZAÇÃO PRINCIPAL: busca o próximo mês após o último no banco"""
        print("🔄 Buscando novos dados...")
        
        # Pega o último mês do nosso banco
        last_ano, last_mes = self.get_latest_stored_month()
        
        if not last_ano:
            print("❌ Nenhum dado no banco. Use data_loader.py primeiro.")
            return 0
        
        # Calcula o próximo mês
        next_ano, next_mes = self.get_next_month(last_ano, last_mes)
        
        print(f"🔍 Verificando mês seguinte: {next_ano}-{next_mes:02d}")
        
        # Verifica se existe na API
        if self.check_month_exists_in_api(next_ano, next_mes):
            print(f"📥 Novo mês encontrado: {next_ano}-{next_mes:02d}")
            saved_count = self.fetch_and_save_month(next_ano, next_mes)
            return saved_count
        else:
            print("✅ Nenhum dado novo encontrado")
            return 0
    
    def close_connection(self):
        """Fecha a conexão com o MongoDB"""
        if self.client:
            self.client.close()
            print("🔌 Conexão fechada")

def main():
    updater = CCEEDataUpdater()
    
    print("🔄 ATUALIZADOR DE DADOS CCEE")
    print("💡 Busca apenas o mês SEGUINTE ao último no banco")
    
    try:
        total = updater.update_new_data()
        print(f"\n🎯 ATUALIZAÇÃO CONCLUÍDA: {total} registros")
    except Exception as e:
        print(f"❌ Erro: {e}")
    finally:
        updater.close_connection()

if __name__ == "__main__":
    main()