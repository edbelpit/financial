import React, { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { loadInitialData } from './store/slices/dataSlice'
import Controls from './components/Controls'
import CompanyFilter from './components/CompanyFilter'
import EnergyChart from './components/EnergyChart'
import DataSummary from './components/DataSummary'  // ✅ Use o DataSummary que você já tem

function App() {
  const dispatch = useDispatch()

  useEffect(() => {
    // Carrega dados iniciais
    dispatch(loadInitialData(null))
  }, [dispatch])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                📊 CCEE Energy Dashboard
              </h1>
              <p className="text-sm text-gray-600">
                Monitoramento de Contratação de Energia
              </p>
            </div>
            <div className="text-sm text-gray-500">
              v{import.meta.env.VITE_APP_VERSION}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls */}
        <Controls />

        {/* CompanyFilter */}
        <CompanyFilter />

        {/* DataSummary (estatísticas) */}
        <div className="mb-6">
          <DataSummary />
        </div>

        {/* Gráfico */}
        <EnergyChart />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center text-sm text-gray-500">
            © 2024 CCEE Energy Dashboard - Desenvolvido com React & Tailwind CSS
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App