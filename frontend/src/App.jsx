import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { 
  fetchData, 
  fetchAggregatedData, 
  fetchEmpresas, 
  fetchMeses,
  fetchAnos,
  clearError 
} from './store/slices/dataSlice'
import EnergyChart from './components/EnergyChart'
import DataSummary from './components/DataSummary'
import CompanyFilter from './components/CompanyFilter'
import YearFilter from './components/YearFilter'
import Controls from './components/Controls'
import './App.css'

function App() {
  const dispatch = useDispatch()
  const { loading, error, lastUpdate, selectedEmpresa } = useSelector(state => state.data)

  useEffect(() => {
    dispatch(clearError())
    loadInitialData()
  }, [dispatch])

  const loadInitialData = () => {
    // Carrega anos disponíveis primeiro
    dispatch(fetchAnos())
    dispatch(fetchEmpresas())
    dispatch(fetchMeses())
    dispatch(fetchData())
    dispatch(fetchAggregatedData())
  }

  const handleRetry = () => {
    dispatch(clearError())
    loadInitialData()
  }

  if (loading) {
    return (
      <div className="loading">
        <div>📡 Carregando dados do MongoDB...</div>
        <div style={{ fontSize: '0.8rem', marginTop: '10px' }}>
          Conectando ao banco de dados
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error">
        <div>❌ Erro: {error}</div>
        <button 
          onClick={handleRetry}
          className="retry-button"
        >
          Tentar Novamente
        </button>
        <div style={{ fontSize: '0.8rem', marginTop: '10px' }}>
          Verifique se o MongoDB está rodando na porta 27017
        </div>
      </div>
    )
  }

  return (
    <div className="App">
      <header className="app-header">
        <h1>Dashboard CCEE - Contratação de Energia</h1>
        <p>Dados históricos de 2024 e 2025</p>
        
        <div className="header-info">
          {lastUpdate && (
            <div className="last-update">
              📅 Última atualização: {new Date(lastUpdate).toLocaleString()}
            </div>
          )}
          <div className="data-source">
            🗄️ Fonte: MongoDB Local
          </div>
        </div>
      </header>
      
      <main className="app-main">
        <Controls />
        <div className="filters-container">
          <YearFilter />
          <CompanyFilter />
        </div>
        <DataSummary />
        <EnergyChart />
      </main>
    </div>
  )
}

export default App