import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setSelectedEmpresa, fetchEmpresas, fetchData, fetchAggregatedData } from '../store/slices/dataSlice'

const CompanyFilter = () => {
  const dispatch = useDispatch()
  const { empresas, loading, selectedEmpresa, selectedYear } = useSelector(state => state.data)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    dispatch(fetchEmpresas(selectedYear))
  }, [dispatch, selectedYear])

  const handleEmpresaChange = (empresa) => {
    dispatch(setSelectedEmpresa(empresa))
    
    // Busca dados com os filtros atuais
    const filters = {}
    if (empresa) filters.empresa = empresa
    if (selectedYear) filters.ano = selectedYear
    
    dispatch(fetchData(filters))
    dispatch(fetchAggregatedData(empresa))
  }

  const filteredEmpresas = empresas.filter(empresa =>
    empresa.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 20)

  if (loading) {
    return <div>Carregando empresas...</div>
  }

  return (
    <div className="company-filter">
      <h3>🔍 Filtrar por Empresa</h3>
      
      <div className="filter-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Buscar empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <select
          value={selectedEmpresa || ''}
          onChange={(e) => handleEmpresaChange(e.target.value)}
          className="company-select"
        >
          <option value="">Todas as empresas</option>
          {filteredEmpresas.map(empresa => (
            <option key={empresa} value={empresa}>
              {empresa}
            </option>
          ))}
        </select>

        {selectedEmpresa && (
          <button
            onClick={() => handleEmpresaChange('')}
            className="clear-filter"
          >
            Limpar Filtro
          </button>
        )}
      </div>

      {selectedEmpresa && (
        <div className="selected-info">
          🏢 Empresa selecionada: <strong>{selectedEmpresa}</strong>
        </div>
      )}

      {searchTerm && filteredEmpresas.length === 0 && (
        <div className="no-results">
          Nenhuma empresa encontrada para "{searchTerm}"
        </div>
      )}
    </div>
  )
}

export default CompanyFilter