from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo import MongoClient
from bson import json_util
from typing import List, Dict, Optional
import requests
import json
import traceback
from datetime import datetime
import os
from dotenv import load_dotenv

# ✅ Carregar variáveis de ambiente
load_dotenv()

app = FastAPI(title="CCEE Energy Data API", version="1.0.0")

# ✅ Configurações do .env com autenticação
MONGODB_USER = os.getenv("MONGODB_USER", "belpit")
MONGODB_PASS = os.getenv("MONGODB_PASS", "Belpit364!")
MONGODB_HOST = os.getenv("MONGODB_HOST", "localhost")
MONGODB_PORT = os.getenv("MONGODB_PORT", "27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "ccee_data")
API_PORT = int(os.getenv("API_PORT", "8000"))

# ✅ URI de conexão com autenticação
MONGODB_URI = f"mongodb://{MONGODB_USER}:{MONGODB_PASS}@{MONGODB_HOST}:{MONGODB_PORT}/{DATABASE_NAME}?authSource=admin"

# ✅ CORS a partir do .env
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000")
allowed_origins = [origin.strip() for origin in CORS_ORIGINS.split(",")]

# ✅ Resource IDs da API CCEE
RESOURCE_IDS = {
    "2024": os.getenv("CCEE_RESOURCE_2024", "f6b478a0-bf4d-4d18-8f7f-067d01fefbd0"),
    "2025": os.getenv("CCEE_RESOURCE_2025", "e14c30bf-e02e-40a5-afd2-0491e41e03c7")
}

# ✅ Conexão com MongoDB LOCAL COM autenticação
try:
    client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
    client.server_info()
    db = client[DATABASE_NAME]
    collection = db["energy_contracts"]
    print("✅ Conectado ao MongoDB LOCAL com sucesso! (com autenticação)")
    print(f"💾 Database: {DATABASE_NAME}")
    print(f"👤 Usuário: {MONGODB_USER}")
    print(f"🔗 MongoDB URI: mongodb://{MONGODB_USER}:******@{MONGODB_HOST}:{MONGODB_PORT}/{DATABASE_NAME}")
except Exception as e:
    print(f"❌ Erro ao conectar com MongoDB: {e}")
    print("💡 Verifique se:")
    print("   - MongoDB está rodando")
    print("   - Usuário e senha estão corretos")
    print("   - O usuário tem permissões no database")
    raise Exception("Falha na conexão com MongoDB")

# ✅ CORS configuration a partir do .env
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def parse_json(data):
    return json.loads(json_util.dumps(data))

def safe_float(value):
    if value is None:
        return 0.0
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0

class CCEEDataLoader:
    def __init__(self):
        self.resource_ids = RESOURCE_IDS
    
    def fetch_data_for_month(self, ano, mes):
        """Busca dados de um mês específico da API CCEE"""
        resource_id = self.resource_ids.get(ano)
        if not resource_id:
            print(f"❌ Resource ID não encontrado para o ano {ano}")
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
                print(f"✅ {mes_referencia}: {len(records)} registros")
                return records
            else:
                print(f"❌ Erro na API para {mes_referencia}")
                return None
                
        except Exception as e:
            print(f"❌ Erro ao buscar {mes_referencia}: {e}")
            return None

@app.get("/")
async def root():
    return {
        "message": "CCEE Energy Data API", 
        "version": "1.0.0", 
        "status": "online",
        "data_source": "MongoDB Local",
        "environment": "Development Local",
        "frontend_ports": allowed_origins,
        "backend_port": API_PORT,
        "database": DATABASE_NAME,
        "authentication": "enabled",
        "user": MONGODB_USER
    }

@app.get("/api/health")
async def health_check():
    """Endpoint para verificar saúde da API"""
    try:
        # Testa a conexão com o MongoDB
        client.admin.command('ping')
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "data_source": "MongoDB Local",
        "environment": "Development Local",
        "database": DATABASE_NAME,
        "database_status": db_status,
        "cors_origins": allowed_origins,
        "authentication": "enabled",
        "user": MONGODB_USER
    }

@app.post("/api/load-data")
async def load_data(
    ano: str,
    meses: Optional[List[int]] = None
):
    """Carrega dados específicos no MongoDB"""
    try:
        if meses is None:
            meses = list(range(1, 13))
        
        loader = CCEEDataLoader()
        total_records = 0
        months_processed = 0
        
        for mes in meses:
            mes_referencia = f"{ano}{mes:02d}"
            
            # Verifica se já existe
            existing_count = collection.count_documents({"MES_REFERENCIA": mes_referencia})
            if existing_count > 0:
                print(f"⏭️  {mes_referencia} já existe ({existing_count} registros), pulando...")
                continue
            
            # Busca dados
            records = loader.fetch_data_for_month(ano, mes)
            
            if records:
                # Remove _ids para evitar conflitos
                for record in records:
                    if '_id' in record:
                        del record['_id']
                
                # Insere no MongoDB
                result = collection.insert_many(records)
                total_records += len(result.inserted_ids)
                months_processed += 1
                print(f"💾 {mes_referencia} salvo no MongoDB")
            else:
                print(f"⚠️  Nenhum dado encontrado para {mes_referencia}")
        
        # Cria índices se necessário
        if total_records > 0:
            try:
                collection.create_index("NOME_EMPRESARIAL")
                collection.create_index("MES_REFERENCIA")
                collection.create_index([("NOME_EMPRESARIAL", 1), ("MES_REFERENCIA", 1)])
                print("📊 Índices criados/atualizados")
            except Exception as e:
                print(f"⚠️  Erro ao criar índices: {e}")
        
        return {
            "message": f"Dados carregados com sucesso!",
            "ano": ano,
            "meses_processados": months_processed,
            "registros_inseridos": total_records,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Erro ao carregar dados: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao carregar dados: {str(e)}")

@app.get("/api/dados")
async def get_dados(
    empresa: Optional[str] = Query(None),
    mes: Optional[str] = Query(None),
    ano: Optional[str] = Query(None),
    limit: int = Query(1000, ge=1, le=10000),
    skip: int = Query(0, ge=0)
):
    """Retorna dados do MongoDB com paginação"""
    try:
        query = {}
        if empresa:
            query["NOME_EMPRESARIAL"] = {"$regex": empresa, "$options": "i"}  # Busca case-insensitive
        if mes:
            query["MES_REFERENCIA"] = mes
        if ano:
            query["MES_REFERENCIA"] = {"$regex": f"^{ano}"}
        
        # Conta total de documentos
        total_count = collection.count_documents(query)
        
        # Busca dados com paginação
        dados = list(collection.find(query, {
            '_id': 0,
            'NOME_EMPRESARIAL': 1,
            'MES_REFERENCIA': 1,
            'CONTRATACAO_VENDA': 1,
            'CONTRATACAO_COMPRA': 1,
            'SIGLA_PERFIL_AGENTE': 1,
            'CNPJ': 1
        }).skip(skip).limit(limit))
        
        print(f"📊 Retornando {len(dados)} registros (total: {total_count})")
        
        return JSONResponse(content={
            "data": parse_json(dados),
            "pagination": {
                "total": total_count,
                "limit": limit,
                "skip": skip,
                "has_more": (skip + limit) < total_count
            }
        })
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao buscar dados: {str(e)}")

@app.get("/api/dados/agregados")
async def get_dados_agregados(
    empresa: Optional[str] = Query(None),
    ano: Optional[str] = Query(None),
    group_by: str = Query("mes", regex="^(mes|empresa|ano)$")
):
    """Retorna dados agregados por mês, empresa ou ano"""
    try:
        pipeline = []
        
        match_stage = {}
        if empresa:
            match_stage["NOME_EMPRESARIAL"] = {"$regex": empresa, "$options": "i"}
        if ano:
            match_stage["MES_REFERENCIA"] = {"$regex": f"^{ano}"}
        
        if match_stage:
            pipeline.append({"$match": match_stage})
        
        # Define agrupamento baseado no parâmetro
        if group_by == "empresa":
            group_id = "$NOME_EMPRESARIAL"
        elif group_by == "ano":
            group_id = {"$substr": ["$MES_REFERENCIA", 0, 4]}
        else:  # mes (default)
            group_id = "$MES_REFERENCIA"
        
        pipeline.extend([
            {
                "$group": {
                    "_id": group_id,
                    "total_venda": {"$sum": {"$toDouble": "$CONTRATACAO_VENDA"}},
                    "total_compra": {"$sum": {"$toDouble": "$CONTRATACAO_COMPRA"}},
                    "quantidade_registros": {"$sum": 1},
                    "empresas_unicas": {"$addToSet": "$NOME_EMPRESARIAL"}
                }
            },
            {
                "$project": {
                    group_by: "$_id",
                    "total_venda": 1,
                    "total_compra": 1,
                    "quantidade_registros": 1,
                    "quantidade_empresas": {"$size": "$empresas_unicas"},
                    "saldo_liquido": {"$subtract": ["$total_venda", "$total_compra"]},
                    "_id": 0
                }
            },
            {
                "$sort": {group_by: 1}
            }
        ])
        
        dados_agregados = list(collection.aggregate(pipeline))
        print(f"📈 Retornando {len(dados_agregados)} registros agregados por {group_by}")
        return JSONResponse(content=parse_json(dados_agregados))
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao buscar dados agregados: {str(e)}")

@app.get("/api/empresas")
async def get_empresas(ano: Optional[str] = Query(None)):
    """Retorna lista de empresas"""
    try:
        query = {}
        if ano:
            query["MES_REFERENCIA"] = {"$regex": f"^{ano}"}
            
        empresas = collection.distinct("NOME_EMPRESARIAL", query)
        empresas.sort()
        return {
            "empresas": empresas,
            "quantidade": len(empresas)
        }
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        return {"empresas": [], "quantidade": 0}

@app.get("/api/meses")
async def get_meses(ano: Optional[str] = Query(None)):
    """Retorna lista de meses"""
    try:
        query = {}
        if ano:
            query["MES_REFERENCIA"] = {"$regex": f"^{ano}"}
            
        meses = collection.distinct("MES_REFERENCIA", query)
        meses.sort()
        return {
            "meses": meses,
            "quantidade": len(meses)
        }
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        return {"meses": [], "quantidade": 0}

@app.get("/api/anos")
async def get_anos():
    """Retorna lista de anos"""
    try:
        meses = collection.distinct("MES_REFERENCIA")
        anos = list(set(mes[:4] for mes in meses))
        anos.sort(reverse=True)
        return {
            "anos": anos,
            "quantidade": len(anos)
        }
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        return {"anos": [], "quantidade": 0}

@app.get("/api/stats")
async def get_stats():
    """Retorna estatísticas completas"""
    try:
        total_records = collection.count_documents({})
        empresas_count = len(collection.distinct("NOME_EMPRESARIAL"))
        meses = collection.distinct("MES_REFERENCIA")
        anos = list(set(mes[:4] for mes in meses))
        
        # Estatísticas por mês
        pipeline_mes = [
            {
                "$group": {
                    "_id": "$MES_REFERENCIA",
                    "registros": {"$sum": 1},
                    "empresas_distintas": {"$addToSet": "$NOME_EMPRESARIAL"},
                    "total_venda": {"$sum": {"$toDouble": "$CONTRATACAO_VENDA"}},
                    "total_compra": {"$sum": {"$toDouble": "$CONTRATACAO_COMPRA"}}
                }
            },
            {
                "$project": {
                    "mes": "$_id",
                    "registros": 1,
                    "quantidade_empresas": {"$size": "$empresas_distintas"},
                    "total_venda": 1,
                    "total_compra": 1,
                    "saldo_liquido": {"$subtract": ["$total_venda", "$total_compra"]},
                    "_id": 0
                }
            },
            {
                "$sort": {"mes": 1}
            }
        ]
        
        stats_mes = list(collection.aggregate(pipeline_mes))
        
        # Top empresas
        pipeline_empresas = [
            {
                "$group": {
                    "_id": "$NOME_EMPRESARIAL",
                    "total_venda": {"$sum": {"$toDouble": "$CONTRATACAO_VENDA"}},
                    "total_compra": {"$sum": {"$toDouble": "$CONTRATACAO_COMPRA"}},
                    "meses_ativos": {"$addToSet": "$MES_REFERENCIA"}
                }
            },
            {
                "$project": {
                    "empresa": "$_id",
                    "total_venda": 1,
                    "total_compra": 1,
                    "saldo_liquido": {"$subtract": ["$total_venda", "$total_compra"]},
                    "meses_ativos": {"$size": "$meses_ativos"},
                    "_id": 0
                }
            },
            {
                "$sort": {"saldo_liquido": -1}
            },
            {
                "$limit": 10
            }
        ]
        
        top_empresas = list(collection.aggregate(pipeline_empresas))
        
        return {
            "total_registros": total_records,
            "quantidade_empresas": empresas_count,
            "anos": anos,
            "meses": meses,
            "estatisticas_por_mes": stats_mes,
            "top_empresas": top_empresas,
            "timestamp": datetime.now().isoformat(),
            "environment": "Local Development",
            "database": DATABASE_NAME,
            "authentication": "enabled",
            "user": MONGODB_USER
        }
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")

@app.delete("/api/clear-data")
async def clear_data():
    """Limpa todos os dados (apenas desenvolvimento)"""
    try:
        result = collection.delete_many({})
        return {
            "message": "Dados removidos com sucesso",
            "deleted_count": result.deleted_count,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")

@app.get("/api/config")
async def get_config():
    """Retorna configurações atuais (apenas desenvolvimento)"""
    return {
        "mongodb_uri": f"mongodb://{MONGODB_USER}:******@{MONGODB_HOST}:{MONGODB_PORT}/{DATABASE_NAME}",
        "database_name": DATABASE_NAME,
        "api_port": API_PORT,
        "cors_origins": allowed_origins,
        "resource_ids": RESOURCE_IDS,
        "environment": "Development Local",
        "authentication": "enabled",
        "user": MONGODB_USER
    }

if __name__ == "__main__":
    import uvicorn
    print("🚀 Iniciando servidor FastAPI - Ambiente Local")
    print(f"🌐 Backend: http://localhost:{API_PORT}")
    print(f"🎯 Frontend URLs: {allowed_origins}")
    print(f"💾 Database: {DATABASE_NAME}")
    print(f"👤 Usuário MongoDB: {MONGODB_USER}")
    print(f"🔐 Autenticação: HABILITADA")
    print(f"🔧 CORS configurado para: {len(allowed_origins)} origens")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=API_PORT, log_level="info")