import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { 
  setSelectedYear, 
  fetchAnos, 
  fetchData, 
  fetchAggregatedData 
} from '../store/slices/dataSlice'

const YearFilter = () => {
  const dispatch = useDispatch()
  const { anos, selectedYear, selectedEmpresa, loading } = useSelector(state => state.data)

  useEffect(() => {
    dispatch(fetchAnos())
  }, [dispatch])

  const handleYearChange = (year) => {
    dispatch(setSelectedYear(year))
    
    const filters = {}
    if (year) filters.ano = year
    if (selectedEmpresa) filters.empresa = selectedEmpresa
    
    dispatch(fetchData(filters))
    dispatch(fetchAggregatedData({ empresa: selectedEmpresa, ano: year }))
  }

  if (loading) {
    return <div className="loading">Carregando anos...</div>
  }

  return (
    <div className="year-filter">
      <h3>📅 Filtrar por Ano</h3>
      
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
        <div className="selected-info">
          📅 Ano selecionado: <strong>{selectedYear}</strong>
        </div>
      )}
    </div>
  )
}

export default YearFilter