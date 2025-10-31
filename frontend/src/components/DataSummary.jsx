import React from 'react'
import { useSelector } from 'react-redux'
import { processEnergyData, calculateMWmForPeriod } from '../utils/energyCalculations'

const DataSummary = () => {
  const { aggregatedData, selectedEmpresa, selectedYear } = useSelector(state => state.data)

  // Processar dados para MWm
  const processedData = React.useMemo(() => {
    return processEnergyData(aggregatedData)
  }, [aggregatedData])

  // Calcular totais e médias CORRETAMENTE
  const stats = React.useMemo(() => {
    if (!processedData || processedData.length === 0) {
      return { 
        totalCompraMWm: 0, 
        totalVendaMWm: 0, 
        meses: 0,
        saldoLiquidoMWm: 0,
        totalCompraMWh: 0,
        totalVendaMWh: 0,
        totalHoras: 0
      }
    }

    const totalCompraMWh = processedData.reduce((sum, item) => sum + (item.compraMWh || 0), 0)
    const totalVendaMWh = processedData.reduce((sum, item) => sum + (item.vendaMWh || 0), 0)
    
    // ✅ CORREÇÃO: Calcular MWm CORRETAMENTE (soma MWh / soma horas)
    const totalCompraMWm = calculateMWmForPeriod(totalCompraMWh, processedData)
    const totalVendaMWm = calculateMWmForPeriod(totalVendaMWh, processedData)
    
    const meses = processedData.length
    const totalHoras = processedData.reduce((sum, item) => sum + (item.horasNoMes || 0), 0)
    
    const saldoLiquidoMWm = totalCompraMWm - totalVendaMWm  // ✅ CORREÇÃO: Net = Compra - Venda

    return {
      totalCompraMWm,
      totalVendaMWm,
      meses,
      saldoLiquidoMWm,
      totalCompraMWh,
      totalVendaMWh,
      totalHoras
    }
  }, [processedData])

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Resumo dos Dados (MWm)</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Compra */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-600">🔽</span>
            <h4 className="font-medium text-blue-800">Compra</h4>
          </div>
          <p className="text-xl font-bold text-blue-900">
            {stats.totalCompraMWm.toFixed(2)} MWm
          </p>
          <p className="text-sm text-blue-700 mt-1">
            {stats.totalCompraMWh.toLocaleString('pt-BR')} MWh
          </p>
          <p className="text-xs text-blue-600 mt-1">
            {stats.meses} meses • {stats.totalHoras.toLocaleString('pt-BR')} horas
          </p>
        </div>

        {/* Total Venda */}
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-600">🔼</span>
            <h4 className="font-medium text-green-800">Venda</h4>
          </div>
          <p className="text-xl font-bold text-green-900">
            {stats.totalVendaMWm.toFixed(2)} MWm
          </p>
          <p className="text-sm text-green-700 mt-1">
            {stats.totalVendaMWh.toLocaleString('pt-BR')} MWh
          </p>
          <p className="text-xs text-green-600 mt-1">
            {stats.meses} meses • {stats.totalHoras.toLocaleString('pt-BR')} horas
          </p>
        </div>

        {/* Saldo Líquido */}
        <div className={`p-4 rounded-lg border ${
          stats.saldoLiquidoMWm >= 0 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={stats.saldoLiquidoMWm >= 0 ? 'text-green-600' : 'text-red-600'}>
              ⚖️
            </span>
            <h4 className={`font-medium ${
              stats.saldoLiquidoMWm >= 0 ? 'text-green-800' : 'text-red-800'
            }`}>
              Saldo Net
            </h4>
          </div>
          <p className={`text-xl font-bold ${
            stats.saldoLiquidoMWm >= 0 ? 'text-green-900' : 'text-red-900'
          }`}>
            {stats.saldoLiquidoMWm.toFixed(2)} MWm
          </p>
          <p className={`text-sm mt-1 ${
            stats.saldoLiquidoMWm >= 0 ? 'text-green-700' : 'text-red-700'
          }`}>
            {stats.saldoLiquidoMWm >= 0 ? 'Superavit' : 'Déficit'}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Compra - Venda
          </p>
        </div>

        {/* Períodos */}
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-purple-600">📅</span>
            <h4 className="font-medium text-purple-800">Períodos</h4>
          </div>
          <p className="text-2xl font-bold text-purple-900">
            {stats.meses}
          </p>
          <p className="text-sm text-purple-700 mt-1">
            {stats.meses === 1 ? 'mês' : 'meses'} analisados
          </p>
          <p className="text-xs text-purple-600 mt-1">
            {stats.totalHoras.toLocaleString('pt-BR')} horas totais
          </p>
        </div>
      </div>

      {/* Filtros Ativos */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-600">
          <strong>Filtros aplicados:</strong>{' '}
          {selectedYear ? `Ano ${selectedYear}` : 'Todos os anos'}
          {selectedEmpresa ? ` - ${selectedEmpresa}` : ' - Todas as empresas'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          MWm = Total MWh / Total Horas • Net = Compra - Venda
        </p>
      </div>
    </div>
  )
}

export default DataSummary