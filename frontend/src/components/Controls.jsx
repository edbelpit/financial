import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { loadData, clearFilters } from '../store/slices/dataSlice'

const Controls = () => {
  const dispatch = useDispatch()
  const { operationStatus, operationMessage } = useSelector(state => state.data)

  const handleBackup = async () => {
    try {
      // Exemplo: carregar dados de 2024
      await dispatch(loadData({ ano: 2024 })).unwrap()
    } catch (error) {
      console.error('Erro no backup:', error)
    }
  }

  const handleClearFilters = () => {
    dispatch(clearFilters())
  }

  return (
    <div className="controls">
      <div className="control-group" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button 
          className="button"
          onClick={handleBackup}
          disabled={operationStatus === 'loading'}
          style={{ 
            background: '#27ae60',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          💾 {operationStatus === 'loading' ? 'Processando...' : 'Buscar Novos Dados CCEE'}
        </button>

        <button 
          className="button"
          onClick={handleClearFilters}
          style={{ 
            background: '#3498db',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
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
        💡 Dados carregados diretamente da API CCEE
      </div>
    </div>
  )
}

export default Controls