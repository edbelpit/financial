import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { loadInitialData } from '../store/slices/dataSlice'

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

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex flex-wrap items-center gap-3">
        <button 
          onClick={handleNormalLoad}
          disabled={operationStatus === 'loading'}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:cursor-not-allowed"
        >
          🔄 {operationStatus === 'loading' ? 'Carregando Dados...' : 'Atualizar Dados'}
        </button>
        
        {operationStatus === 'succeeded' && (
          <span className="text-green-600 font-bold">✅ {operationMessage}</span>
        )}
        {operationStatus === 'failed' && (
          <span className="text-red-600 font-bold">❌ {operationMessage}</span>
        )}
      </div>
      
      <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
        💡 Dados carregados do banco local
        {selectedYear && ` - Ano: ${selectedYear}`}
        {!selectedYear && ' - Todos os anos'}
      </div>
    </div>
  )
}

export default Controls