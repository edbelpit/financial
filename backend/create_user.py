from pymongo import MongoClient

print("👤 Criando usuário belpit no MongoDB...")

try:
    # Conectar sem autenticação (MongoDB deve estar rodando sem auth)
    client = MongoClient("mongodb://localhost:27017/")
    
    # Acessar o banco admin para criar usuário
    admin_db = client["admin"]
    
    # Verificar se usuário já existe
    try:
        users = admin_db.command("usersInfo")
        existing_users = [user['user'] for user in users['users']]
        
        if 'belpit' in existing_users:
            print("✅ Usuário 'belpit' já existe")
            # Atualizar senha
            admin_db.command("updateUser", "belpit", pwd="Belpit364!")
            print("🔐 Senha atualizada para 'Belpit364!'")
        else:
            # Criar usuário belpit com permissões específicas para ccee_data
            admin_db.command("createUser", "belpit", 
                           pwd="Belpit364!", 
                           roles=[
                               {"role": "readWrite", "db": "ccee_data"},
                               {"role": "dbAdmin", "db": "ccee_data"}
                           ])
            print("✅ Usuário 'belpit' criado com sucesso!")
    
    except Exception as e:
        print(f"❌ Erro ao verificar/criar usuário: {e}")
        # Tentar criar diretamente
        admin_db.command("createUser", "belpit", 
                       pwd="Belpit364!", 
                       roles=[
                           {"role": "readWrite", "db": "ccee_data"},
                           {"role": "dbAdmin", "db": "ccee_data"}
                       ])
        print("✅ Usuário 'belpit' criado com sucesso!")
    
    print("📝 Usuário: belpit")
    print("🔐 Senha: Belpit364!")
    print("🎯 Permissões: readWrite + dbAdmin no banco ccee_data")
    
    # Testar conexão com o novo usuário
    print("\n🧪 Testando conexão com novo usuário...")
    test_client = MongoClient("mongodb://belpit:Belpit364!@localhost:27017/ccee_data")
    test_client.server_info()
    print("✅ Conexão com usuário 'belpit' funcionando!")
    
except Exception as e:
    print(f"❌ Erro: {e}")
    print("💡 Certifique-se que o MongoDB está rodando SEM autenticação")