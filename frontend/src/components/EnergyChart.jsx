import React, { useMemo, useRef } from 'react'
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
import { Bar, getElementAtEvent } from 'react-chartjs-2'
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
  const chartRef = useRef()

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

  // ✅ FUNÇÃO PARA DOWNLOAD PNG
  const downloadPNG = () => {
    if (!chartRef.current) {
      alert('Gráfico não disponível para download.')
      return
    }

    try {
      const chart = chartRef.current
      const image = chart.toBase64Image('image/png', 1.0)
      
      const link = document.createElement('a')
      link.href = image
      link.download = `grafico_energia_${selectedEmpresa || 'todas_empresas'}_${selectedYear || 'todos_anos'}.png`
      link.click()
      
      console.log('✅ Download PNG realizado com sucesso')
    } catch (error) {
      console.error('❌ Erro ao baixar PNG:', error)
      alert('Erro ao baixar imagem do gráfico.')
    }
  }

  // ✅ FUNÇÃO PARA DOWNLOAD CSV
  const downloadCSV = () => {
    if (!processedData || processedData.length === 0) {
      alert('Nenhum dado disponível para exportar.')
      return
    }

    try {
      // Cabeçalhos do CSV
      const headers = [
        'Mês/Ano',
        'Mês Referência',
        'Compra (MWh)',
        'Venda (MWh)',
        'Net (MWh)',
        'Compra (MWm)',
        'Venda (MWm)',
        'Net (MWm)',
        'Horas no Mês'
      ]

      // Preparar dados
      const csvData = processedData.map(item => {
        const mesStr = item.mes ? item.mes.toString() : (item._id ? item._id.toString() : '')
        const ano = mesStr.substring(0, 4)
        const mesNum = mesStr.substring(4, 6)
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
                      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
        
        return [
          `${meses[parseInt(mesNum) - 1]}/${ano}`,
          mesStr,
          (item.compraMWh || 0).toString().replace('.', ','),
          (item.vendaMWh || 0).toString().replace('.', ','),
          ((item.compraMWh || 0) - (item.vendaMWh || 0)).toString().replace('.', ','),
          (item.compraMWm || 0).toString().replace('.', ','),
          (item.vendaMWm || 0).toString().replace('.', ','),
          (item.netMWm || 0).toString().replace('.', ','),
          (item.horasNoMes || 0).toString()
        ]
      })

      // Adicionar linha de totais
      csvData.push([
        'TOTAL',
        '',
        chartStats.totalCompraMWh.toString().replace('.', ','),
        chartStats.totalVendaMWh.toString().replace('.', ','),
        (chartStats.totalCompraMWh - chartStats.totalVendaMWh).toString().replace('.', ','),
        chartStats.totalCompraMWm.toString().replace('.', ','),
        chartStats.totalVendaMWm.toString().replace('.', ','),
        chartStats.totalNetMWm.toString().replace('.', ','),
        chartStats.totalHoras.toString()
      ])

      // Adicionar metadados
      const metadata = [
        [''],
        ['METADADOS:'],
        [`Empresa: ${selectedEmpresa || 'Todas as empresas'}`],
        [`Ano: ${selectedYear || 'Todos os anos'}`],
        [`Período: ${chartStats.meses} meses`],
        [`Total de horas: ${chartStats.totalHoras.toLocaleString('pt-BR')}`],
        [`Data de exportação: ${new Date().toLocaleString('pt-BR')}`],
        [''],
        [headers.join(';')]
      ]

      // Combinar todos os dados
      const allData = [...metadata, ...csvData.map(row => row.join(';'))]

      // Criar arquivo CSV
      const csvContent = allData.join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `dados_energia_${selectedEmpresa || 'todas_empresas'}_${selectedYear || 'todos_anos'}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
      
      console.log('✅ Download CSV realizado com sucesso')
    } catch (error) {
      console.error('❌ Erro ao baixar CSV:', error)
      alert('Erro ao gerar arquivo CSV.')
    }
  }

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
      {/* ✅ CABEÇALHO COM BOTÕES DE DOWNLOAD */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">📈 Gráfico de Contratação (MWm)</h3>
        
        {/* BOTÕES DE DOWNLOAD */}
        <div className="flex gap-2">
          <button
            onClick={downloadPNG}
            disabled={!chartData}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <span>📷</span>
            PNG
          </button>
          
          <button
            onClick={downloadCSV}
            disabled={!processedData || processedData.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <span>📊</span>
            CSV
          </button>
        </div>
      </div>

      {/* GRÁFICO */}
      <div className="h-96">
        <Bar 
          ref={chartRef}
          data={chartData} 
          options={chartOptions} 
        />
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