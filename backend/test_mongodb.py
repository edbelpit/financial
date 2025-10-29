from pymongo import MongoClient

print("🧪 Testando conexão MongoDB...")

try:
    # Conexão SEM autenticação
    client = MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=5000)
    client.server_info()
    print("✅ MongoDB está RODANDO e acessível!")
    
    # Listar bancos
    dbs = client.list_database_names()
    print(f"📊 Bancos: {dbs}")
    
    # Verificar/ criar banco ccee_data
    db = client["ccee_data"]
    collections = db.list_collection_names()
    print(f"📁 Collections em ccee_data: {collections}")
    
    if 'energy_contracts' in collections:
        count = db.energy_contracts.count_documents({})
        print(f"📈 Registros em energy_contracts: {count}")
    else:
        print("ℹ️  Collection energy_contracts não existe (vamos criar)")
        
except Exception as e:
    print(f"❌ Erro: {e}")