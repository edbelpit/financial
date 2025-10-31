import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { loadInitialData, clearFilters, fetchAggregatedData } from '../store/slices/dataSlice'

const Controls = () => {
  const dispatch = useDispatch()
  const { operationStatus, operationMessage, selectedYear } = useSelector(state => state.data)

  // Carregar dados com filtro de ano
  const handleLoadData = async (ano = selectedYear) => {
    try {
      await dispatch(loadInitialData(ano || null)).unwrap()
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
  }

  // Limpar filtros e recarregar todos os dados
  const handleClearFilters = async () => {
    try {
      console.log('🔄 Iniciando limpeza de filtros...')
      
      // Limpa os filtros no Redux
      dispatch(clearFilters())
      
      console.log('✅ Filtros limpos, recarregando todos os dados...')
      
      // Aguarda um pouco para garantir que o Redux atualizou
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Recarrega todos os dados SEM filtros
      await dispatch(loadInitialData(null)).unwrap()
      
      console.log('✅ Todos os dados recarregados sem filtros')
      
    } catch (error) {
      console.error('❌ Erro ao limpar filtros:', error)
    }
  }

  // Carregar dados com ano atual (ou sem ano se não tiver selecionado)
  const handleNormalLoad = async () => {
    await handleLoadData(selectedYear)
  }

  return (
    <div className="controls">
      <div className="control-group" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button 
          className="button"
          onClick={handleNormalLoad}
          disabled={operationStatus === 'loading'}
          style={{ 
            background: '#27ae60',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            cursor: operationStatus === 'loading' ? 'not-allowed' : 'pointer',
            opacity: operationStatus === 'loading' ? 0.6 : 1
          }}
        >
          🔄 {operationStatus === 'loading' ? 'Carregando Dados...' : 'Atualizar Dados'}
        </button>

        <button 
          className="button"
          onClick={handleClearFilters}
          disabled={operationStatus === 'loading'}
          style={{ 
            background: '#3498db',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            cursor: operationStatus === 'loading' ? 'not-allowed' : 'pointer',
            opacity: operationStatus === 'loading' ? 0.6 : 1
          }}
        >
          🗑️ Limpar Filtros
        </button>
        
        {operationStatus === 'succeeded' && (
          <span style={{ color: '#27ae60', fontWeight: 'bold' }}>✅ {operationMessage}</span>
        )}
        {operationStatus === 'failed' && (
          <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>❌ {operationMessage}</span>
        )}
      </div>
      
      <div style={{ 
        marginTop: '10px', 
        padding: '10px', 
        background: '#e8f4fd', 
        borderRadius: '5px',
        fontSize: '0.9rem',
        color: '#2c3e50'
      }}>
        💡 Dados carregados do banco local
        {selectedYear && ` - Ano: ${selectedYear}`}
        {!selectedYear && ' - Todos os anos'}
      </div>
    </div>
  )
}

export default Controls