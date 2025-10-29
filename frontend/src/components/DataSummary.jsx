import React, { useMemo } from 'react'
import { useSelector } from 'react-redux'

const DataSummary = () => {
  const { rawData, aggregatedData, empresas, meses, anos } = useSelector(state => state.data)

  const summary = useMemo(() => {
    // Se não há dados brutos, tenta usar outras fontes
    if (!rawData || rawData.length === 0) {
      return {
        totalRegistros: 0,
        totalEmpresas: empresas?.length || 0,
        totalMeses: meses?.length || 0,
        totalAnos: anos?.length || 0,
        hasData: false
      }
    }

    try {
      const empresasSet = new Set()
      const mesesSet = new Set()
      const anosSet = new Set()

      rawData.forEach(item => {
        // Tenta diferentes nomes de campos possíveis
        const empresa = item.NOME_EMPRESARIAL || item.empresa || item.nomeEmpresa
        const mes = item.MES_REFERENCIA || item.mesReferencia || item.mes
        const ano = item.ANO_REFERENCIA || item.anoReferencia || item.ano

        if (empresa) empresasSet.add(empresa)
        if (mes) mesesSet.add(mes)
        if (ano) anosSet.add(ano)
      })

      return {
        totalRegistros: rawData.length,
        totalEmpresas: empresasSet.size,
        totalMeses: mesesSet.size,
        totalAnos: anosSet.size,
        hasData: true
      }
    } catch (error) {
      console.error('Erro ao calcular resumo:', error)
      return {
        totalRegistros: 0,
        totalEmpresas: 0,
        totalMeses: 0,
        totalAnos: 0,
        hasData: false
      }
    }
  }, [rawData, empresas, meses, anos])

  // Não mostra se não há dados
  if (!summary.hasData && summary.totalRegistros === 0) {
    return (
      <div className="data-summary">
        <h2>Resumo dos Dados</h2>
        <div className="no-data">
          <p>Nenhum dado disponível para exibir o resumo</p>
          <p style={{ fontSize: '0.9rem', color: '#666' }}>
            Use o botão "Fazer Backup MongoDB" para carregar dados
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="data-summary">
      <h2>Resumo dos Dados</h2>
      <div className="summary-cards">
        <div className="summary-card">
          <h3>Total de Registros</h3>
          <p>{summary.totalRegistros.toLocaleString()}</p>
          {!summary.hasData && <small style={{ opacity: 0.7 }}>Estimado</small>}
        </div>
        
        <div className="summary-card">
          <h3>Empresas Únicas</h3>
          <p>{summary.totalEmpresas.toLocaleString()}</p>
          {!summary.hasData && <small style={{ opacity: 0.7 }}>Da lista</small>}
        </div>
        
        <div className="summary-card">
          <h3>Meses Analisados</h3>
          <p>{summary.totalMeses}</p>
          {!summary.hasData && <small style={{ opacity: 0.7 }}>Da lista</small>}
        </div>

        <div className="summary-card">
          <h3>Anos Disponíveis</h3>
          <p>{summary.totalAnos}</p>
          {summary.totalAnos > 0 && (
            <small style={{ opacity: 0.7 }}>
              {anos?.join(', ')}
            </small>
          )}
        </div>
      </div>

      {/* Status dos dados */}
      <div style={{ 
        marginTop: '15px', 
        padding: '10px', 
        background: summary.hasData ? '#e8f6f3' : '#fff3cd',
        border: `1px solid ${summary.hasData ? '#27ae60' : '#ffc107'}`,
        borderRadius: '5px',
        fontSize: '0.9rem'
      }}>
        {summary.hasData ? (
          <>✅ <strong>Dados carregados:</strong> {summary.totalRegistros} registros do MongoDB</>
        ) : (
          <>⚠️ <strong>Dados estimados:</strong> Baseado nas listas disponíveis</>
        )}
      </div>
    </div>
  )
}

export default DataSummary