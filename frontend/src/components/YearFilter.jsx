import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setSelectedYear, fetchData, fetchAggregatedData, fetchEmpresas, fetchMeses } from '../store/slices/dataSlice'

const YearFilter = () => {
  const dispatch = useDispatch()
  const { anos, selectedYear, selectedEmpresa } = useSelector(state => state.data)

  const handleYearChange = (year) => {
    dispatch(setSelectedYear(year))
    
    // Busca dados com os filtros atuais
    const filters = {}
    if (year) filters.ano = year
    if (selectedEmpresa) filters.empresa = selectedEmpresa
    
    dispatch(fetchData(filters))
    dispatch(fetchAggregatedData(selectedEmpresa))
    dispatch(fetchEmpresas(year))
    dispatch(fetchMeses(year))
  }

  return (
    <div className="year-filter">
      <h3>🎯 Filtrar por Ano</h3>
      
      <div className="filter-controls">
        <select
          value={selectedYear || ''}
          onChange={(e) => handleYearChange(e.target.value)}
          className="year-select"
        >
          <option value="">Todos os anos</option>
          {anos.map(ano => (
            <option key={ano} value={ano}>
              {ano}
            </option>
          ))}
        </select>

        {selectedYear && (
          <button
            onClick={() => handleYearChange('')}
            className="clear-filter"
          >
            Limpar Filtro
          </button>
        )}
      </div>

      {selectedYear && (
        <div className="selected-info">
          📊 Mostrando dados do ano: <strong>{selectedYear}</strong>
        </div>
      )}
    </div>
  )
}

export default YearFilter