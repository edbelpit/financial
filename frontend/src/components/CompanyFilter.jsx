import React, { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { 
  setSelectedEmpresa, 
  fetchEmpresas, 
  fetchData, 
  fetchAggregatedData 
} from '../store/slices/dataSlice'

const CompanyFilter = () => {
  const dispatch = useDispatch()
  const { empresas, loading, selectedEmpresa, selectedYear } = useSelector(state => state.data)
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    dispatch(fetchEmpresas(selectedYear))
  }, [dispatch, selectedYear])

  const filteredEmpresas = useMemo(() => {
    if (!searchTerm) return empresas // REMOVI O .slice(0, 100)
    return empresas.filter(empresa =>
      empresa.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [empresas, searchTerm])

  const handleEmpresaChange = (empresa) => {
    dispatch(setSelectedEmpresa(empresa))
    setShowDropdown(false)
    
    const filters = {}
    if (empresa) filters.empresa = empresa
    if (selectedYear) filters.ano = selectedYear
    
    dispatch(fetchData(filters))
    dispatch(fetchAggregatedData({ empresa: empresa, ano: selectedYear }))
  }

  const clearFilter = () => {
    dispatch(setSelectedEmpresa(''))
    setSearchTerm('')
    setShowDropdown(false)
    
    const filters = {}
    if (selectedYear) filters.ano = selectedYear
    
    dispatch(fetchData(filters))
    dispatch(fetchAggregatedData({ empresa: null, ano: selectedYear }))
  }

  const handleBlur = () => {
    setTimeout(() => setShowDropdown(false), 200)
  }

  if (loading) {
    return <div className="loading">Carregando empresas...</div>
  }

  return (
    <div className="company-filter">
      <h3>🔍 Filtrar por Empresa</h3>
      
      <div className="filter-controls">
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type="text"
            placeholder="Buscar empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            onBlur={handleBlur}
            className="select-control"
            style={{ width: '100%', paddingRight: '40px', background: '#fafafa' }}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: '#718096',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              ×
            </button>
          )}

          {showDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'white',
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              zIndex: 1000,
              maxHeight: '400px', // AUMENTEI A ALTURA MÁXIMA
              overflowY: 'auto'
            }}>
              <div style={{
                padding: '12px 16px',
                background: '#f7fafc',
                borderBottom: '1px solid #e2e8f0',
                fontSize: '12px',
                color: '#718096',
                fontWeight: '500'
              }}>
                {filteredEmpresas.length} empresas encontradas
                {!searchTerm && ` (${empresas.length} no total)`}
              </div>
              
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {filteredEmpresas.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#a0aec0', fontStyle: 'italic' }}>
                    Nenhuma empresa encontrada para "{searchTerm}"
                  </div>
                ) : (
                  filteredEmpresas.map(empresa => (
                    <div
                      key={empresa}
                      style={{
                        padding: '10px 16px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f1f5f9',
                        fontSize: '14px',
                        transition: 'background 0.15s ease',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        backgroundColor: selectedEmpresa === empresa ? '#ebf8ff' : 'transparent',
                        color: selectedEmpresa === empresa ? '#2b6cb0' : 'inherit',
                        fontWeight: selectedEmpresa === empresa ? '500' : 'normal'
                      }}
                      onClick={() => handleEmpresaChange(empresa)}
                      title={empresa}
                    >
                      {empresa}
                    </div>
                  ))
                )}
              </div>

              {!searchTerm && filteredEmpresas.length > 0 && (
                <div style={{
                  padding: '8px 16px',
                  background: '#f7fafc',
                  borderTop: '1px solid #e2e8f0',
                  fontSize: '11px',
                  color: '#a0aec0',
                  textAlign: 'center'
                }}>
                  Use a busca para filtrar {empresas.length} empresas
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {selectedEmpresa && (
            <button onClick={clearFilter} className="button" style={{ background: '#e74c3c', flex: 1 }}>
              Limpar Filtro
            </button>
          )}
          
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="button"
            style={{ background: '#3498db', flex: 1 }}
          >
            {showDropdown ? '▲' : '▼'} Lista
          </button>
        </div>
      </div>

      {selectedEmpresa && (
        <div className="selected-info">
          🏢 Empresa selecionada: <strong>{selectedEmpresa}</strong>
        </div>
      )}

      <div style={{ marginTop: '8px', fontSize: '12px', color: '#718096', textAlign: 'center' }}>
        {searchTerm ? (
          <span>{filteredEmpresas.length} empresas encontradas para "{searchTerm}"</span>
        ) : (
          <span>{empresas.length} empresas disponíveis - use a busca para filtrar</span>
        )}
      </div>
    </div>
  )
}

export default CompanyFilter