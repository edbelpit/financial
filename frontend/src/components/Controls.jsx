import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { reloadFrontendData, updateCCEEData, clearReloadMessage, clearUpdateMessage } from '../store/slices/dataSlice'

const Controls = () => {
  const dispatch = useDispatch()
  const { 
    reloadStatus, 
    reloadMessage, 
    updateStatus,
    updateMessage,
    selectedYear 
  } = useSelector(state => state.data)

  // ✅ EFFECT para limpar mensagem de reload após 5 segundos
  useEffect(() => {
    if (reloadStatus === 'succeeded' || reloadStatus === 'failed') {
      const timer = setTimeout(() => {
        dispatch(clearReloadMessage())
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [reloadStatus, dispatch])

  // ✅ EFFECT para limpar mensagem de update após 5 segundos
  useEffect(() => {
    if (updateStatus === 'succeeded' || updateStatus === 'failed') {
      const timer = setTimeout(() => {
        dispatch(clearUpdateMessage())
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [updateStatus, dispatch])

  // ✅ Recarregar dados do frontend (manual)
  const handleReloadData = async (ano = selectedYear) => {
    try {
      await dispatch(reloadFrontendData(ano || null)).unwrap()
    } catch (error) {
      console.error('Erro ao recarregar dados:', error)
    }
  }

  // ✅ Atualizar banco com dados da CCEE
  const handleUpdateDatabase = async () => {
    try {
      await dispatch(updateCCEEData()).unwrap()
    } catch (error) {
      console.error('Erro ao atualizar banco:', error)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex flex-wrap items-center gap-3">
        {/* ✅ BOTÃO ATUALIZAR DADOS - usa reloadStatus */}
        <button 
          onClick={() => handleReloadData(selectedYear)}
          disabled={reloadStatus === 'loading'}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:cursor-not-allowed"
        >
          {reloadStatus === 'loading' ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Recarregando Dados...
            </>
          ) : (
            <>
              🔄 Atualizar Dados
            </>
          )}
        </button>

        {/* ✅ BOTÃO ATUALIZAR BANCO - usa updateStatus */}
        <button 
          onClick={handleUpdateDatabase}
          disabled={updateStatus === 'loading'}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:cursor-not-allowed"
        >
          {updateStatus === 'loading' ? (
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
        
        {/* ✅ MENSAGENS QUE VÃO SUMIR APÓS 5s */}
        {(reloadStatus === 'succeeded' || reloadStatus === 'failed') && (
          <span className={`text-sm font-bold ${
            reloadStatus === 'succeeded' ? 'text-green-600' : 'text-red-600'
          }`}>
            {reloadMessage}
          </span>
        )}
        
        {(updateStatus === 'succeeded' || updateStatus === 'failed') && (
          <span className={`text-sm font-bold ${
            updateStatus === 'succeeded' ? 'text-green-600' : 'text-red-600'
          }`}>
            {updateMessage}
          </span>
        )}
      </div>
      
      <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
        💡 <strong>Atualizar Dados:</strong> Recarrega dados do MongoDB no frontend (após atualizar banco)
        <br />
        💡 <strong>Atualizar Banco:</strong> Busca dados novos da API CCEE e salva no MongoDB
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