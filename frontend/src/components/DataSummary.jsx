import React, { useMemo } from 'react'
import { useSelector } from 'react-redux'

const DataSummary = () => {
  const { rawData, aggregatedData } = useSelector(state => state.data)

  const summary = useMemo(() => {
    if (rawData.length === 0) return null

    const empresas = new Set(rawData.map(item => item.NOME_EMPRESARIAL))
    const meses = new Set(rawData.map(item => item.MES_REFERENCIA))

    return {
      totalRegistros: rawData.length,
      totalEmpresas: empresas.size,
      totalMeses: meses.size
    }
  }, [rawData])

  if (!summary) return null

  return (
    <div className="data-summary">
      <h2>Resumo dos Dados</h2>
      <div className="summary-cards">
        <div className="summary-card">
          <h3>Total de Registros</h3>
          <p>{summary.totalRegistros}</p>
        </div>
        <div className="summary-card">
          <h3>Empresas</h3>
          <p>{summary.totalEmpresas}</p>
        </div>
        <div className="summary-card">
          <h3>Meses Analisados</h3>
          <p>{summary.totalMeses}</p>
        </div>
      </div>
    </div>
  )
}

export default DataSummary