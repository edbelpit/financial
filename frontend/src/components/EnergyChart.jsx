import React, { useMemo } from 'react'
import { useSelector } from 'react-redux'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { processEnergyData, calculateMWmForPeriod } from '../utils/energyCalculations'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement
)

const EnergyChart = () => {
  const { aggregatedData, selectedEmpresa, selectedYear, loading } = useSelector(state => state.data)

  const processedData = useMemo(() => {
    return processEnergyData(aggregatedData)
  }, [aggregatedData])

  // ✅ CORREÇÃO: Calcular totais CORRETAMENTE
  const chartStats = useMemo(() => {
    if (!processedData || processedData.length === 0) {
      return {
        totalCompraMWh: 0,
        totalVendaMWh: 0,
        totalCompraMWm: 0,
        totalVendaMWm: 0,
        totalNetMWm: 0,
        totalHoras: 0,
        meses: 0
      }
    }

    const totalCompraMWh = processedData.reduce((sum, item) => sum + (item.compraMWh || 0), 0)
    const totalVendaMWh = processedData.reduce((sum, item) => sum + (item.vendaMWh || 0), 0)
    
    const totalCompraMWm = calculateMWmForPeriod(totalCompraMWh, processedData)
    const totalVendaMWm = calculateMWmForPeriod(totalVendaMWh, processedData)
    const totalNetMWm = totalCompraMWm - totalVendaMWm
    
    const totalHoras = processedData.reduce((sum, item) => sum + (item.horasNoMes || 0), 0)
    const meses = processedData.length

    return {
      totalCompraMWh,
      totalVendaMWh,
      totalCompraMWm,
      totalVendaMWm,
      totalNetMWm,
      totalHoras,
      meses
    }
  }, [processedData])

  const chartData = useMemo(() => {
    if (!processedData || processedData.length === 0) {
      return null
    }

    const sortedData = [...processedData].sort((a, b) => {
      const mesA = a.mes ? a.mes.toString() : (a._id ? a._id.toString() : '')
      const mesB = b.mes ? b.mes.toString() : (b._id ? b._id.toString() : '')
      return mesA.localeCompare(mesB)
    })

    const labels = sortedData.map(item => {
      const mesStr = item.mes ? item.mes.toString() : (item._id ? item._id.toString() : '')
      const ano = mesStr.substring(0, 4)
      const mesNum = mesStr.substring(4, 6)
      const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dec']
      return `${meses[parseInt(mesNum) - 1]}-${ano.substring(2)}`
    })

    const compraData = sortedData.map(item => item.compraMWm || 0)
    const vendaData = sortedData.map(item => item.vendaMWm || 0)
    const netData = sortedData.map(item => item.netMWm || 0)

    if (labels.length === 0) {
      return null
    }

    return {
      labels,
      datasets: [
        {
          label: 'Compra (MWm)',
          data: compraData,
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
          yAxisID: 'y',
        },
        {
          label: 'Venda (MWm)',
          data: vendaData,
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
          yAxisID: 'y',
        },
        {
          label: 'Net (Compra - Venda)',
          data: netData,
          type: 'line',
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(75, 192, 192, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 1,
          pointRadius: 4,
          yAxisID: 'y1',
        },
      ],
    }
  }, [processedData])

  // ✅ RANGE OTIMIZADO para valores pequenos
  const getNetAxisRange = useMemo(() => {
    if (!processedData || processedData.length === 0) {
      return { min: -0.1, max: 0.1 }
    }
    
    const netValues = processedData.map(item => item.netMWm || 0)
    const maxNet = Math.max(...netValues)
    const minNet = Math.min(...netValues)
    
    // ✅ ESTRATÉGIA: Se os valores são muito pequenos, usar range fixo
    const absMax = Math.max(Math.abs(minNet), Math.abs(maxNet))
    
    if (absMax < 0.01) {
      // Valores muito pequenos: usar range simétrico
      const range = Math.max(0.0001, absMax * 2) // Garante um range mínimo visível
      return {
        min: -range,
        max: range
      }
    } else if (absMax < 0.1) {
      // Valores pequenos: adicionar margem de 50%
      return {
        min: minNet * 1.5,
        max: maxNet * 1.5
      }
    } else {
      // Valores normais: usar mínimo e máximo
      return {
        min: minNet,
        max: maxNet
      }
    }
  }, [processedData])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: selectedEmpresa 
          ? `Contratação de Energia - ${selectedEmpresa} ${selectedYear ? `(${selectedYear})` : ''}`
          : `Contratação de Energia ${selectedYear ? `- ${selectedYear}` : ''}`,
        font: {
          size: 16
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || ''
            if (label) {
              label += ': '
            }
            if (context.parsed.y !== null) {
              // ✅ 6 CASAS DECIMAIS para todos os valores
              label += `${context.parsed.y.toFixed(6)} MWm`
            }
            return label
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Mês de Referência'
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Compra/Venda (MWm)'
        },
        beginAtZero: true,
        ticks: {
          // ✅ 6 CASAS DECIMAIS no eixo Y
          callback: function(value) {
            return value.toFixed(6) + ' MWm'
          }
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Net (MWm)'
        },
        // ✅ RANGE OTIMIZADO
        min: getNetAxisRange.min,
        max: getNetAxisRange.max,
        ticks: {
          // ✅ 6 CASAS DECIMAIS no eixo Y1
          callback: function(value) {
            return value.toFixed(6) + ' MWm'
          },
          maxTicksLimit: 6,
          precision: 6
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          📈 Gráfico de Contratação (MWm)
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-800"></div>
            Carregando...
          </span>
        </h3>
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando dados do gráfico...</p>
            <p className="text-sm text-gray-500 mt-1">
              {selectedYear && `Filtrando por: ${selectedYear}`}
              {selectedEmpresa && ` - ${selectedEmpresa}`}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!chartData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">📈 Gráfico de Contratação (MWm)</h3>
        <div className="text-center py-8">
          <p className="text-gray-600 mb-2">Nenhum dado disponível para exibir o gráfico.</p>
          <p className="text-sm text-gray-500">
            {aggregatedData && aggregatedData.length > 0 
              ? `Dados recebidos mas não puderam ser processados. Verifique o console.`
              : 'Selecione uma empresa ou verifique se os dados foram carregados.'
            }
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">📈 Gráfico de Contratação (MWm)</h3>
      <div className="h-96">
        <Bar data={chartData} options={chartOptions} />
      </div>
      
      {/* ✅ INFO COM 6 CASAS DECIMAIS */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
        <strong>Resumo do Período (Cálculo Correto):</strong><br />
        - Filtro: {selectedYear ? `Ano ${selectedYear}` : 'Todos os anos'} {selectedEmpresa ? `- ${selectedEmpresa}` : ''}<br />
        - Compra: {chartStats.totalCompraMWm.toFixed(6)} MWm ({chartStats.totalCompraMWh.toLocaleString('pt-BR')} MWh)<br />
        - Venda: {chartStats.totalVendaMWm.toFixed(6)} MWm ({chartStats.totalVendaMWh.toLocaleString('pt-BR')} MWh)<br />
        - Net: {chartStats.totalNetMWm.toFixed(6)} MWm (Compra - Venda)<br />
        - Período: {chartStats.meses} meses • {chartStats.totalHoras.toLocaleString('pt-BR')} horas totais<br />
        - <em>MWm = ΣMWh / ΣHoras</em>
      </div>
    </div>
  )
}

export default EnergyChart