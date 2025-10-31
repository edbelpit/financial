import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { loadInitialData, updateCCEEData } from '../store/slices/dataSlice'

const Controls = () => {
  const dispatch = useDispatch()
  const { operationStatus, operationMessage, selectedYear } = useSelector(state => state.data)

  const handleLoadData = async (ano = selectedYear) => {
    try {
      await dispatch(loadInitialData(ano || null)).unwrap()
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
  }

  const handleNormalLoad = async () => {
    await handleLoadData(selectedYear)
  }

  // ✅ FUNÇÃO: Só atualiza o banco quando o usuário clicar
  const handleUpdateDatabase = async () => {
    try {
      await dispatch(updateCCEEData()).unwrap()
      // Não recarrega automaticamente - mantém o fluxo atual
    } catch (error) {
      console.error('Erro ao atualizar banco:', error)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex flex-wrap items-center gap-3">
        {/* ✅ BOTÃO ATUALIZAR DADOS (original) */}
        <button 
          onClick={handleNormalLoad}
          disabled={operationStatus === 'loading'}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:cursor-not-allowed"
        >
          {operationStatus === 'loading' && operationMessage.includes('Carregando dados') ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Carregando Dados...
            </>
          ) : (
            <>
              🔄 Atualizar Dados
            </>
          )}
        </button>

        {/* ✅ BOTÃO ATUALIZAR BANCO (novo) */}
        <button 
          onClick={handleUpdateDatabase}
          disabled={operationStatus === 'loading'}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:cursor-not-allowed"
        >
          {operationStatus === 'loading' && operationMessage.includes('Verificando atualizações') ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Verificando Atualizações...
            </>
          ) : (
            <>
              📥 Atualizar Banco
            </>
          )}
        </button>
        
        {/* ✅ MENSAGENS DE STATUS */}
        {operationStatus === 'succeeded' && (
          <span className="text-green-600 font-bold">{operationMessage}</span>
        )}
        {operationStatus === 'failed' && (
          <span className="text-red-600 font-bold">{operationMessage}</span>
        )}
      </div>
      
      <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
        💡 <strong>Atualizar Dados:</strong> Recarrega dados do banco local
        <br />
        💡 <strong>Atualizar Banco:</strong> Busca dados novos da API CCEE
        {selectedYear && (
          <>
            <br />
            🗓️ <strong>Filtro ativo:</strong> Ano {selectedYear}
          </>
        )}
      </div>
    </div>
  )
}

export default Controls