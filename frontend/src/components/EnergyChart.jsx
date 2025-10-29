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
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

const EnergyChart = () => {
  const { aggregatedData, selectedEmpresa, selectedYear } = useSelector(state => state.data)

  console.log('📊 Dados agregados para gráfico:', aggregatedData)
  console.log('🏢 Empresa selecionada:', selectedEmpresa)
  console.log('📅 Ano selecionado:', selectedYear)

  // FILTRO POR ANO NO FRONTEND (caso a API não filtre)
  const filteredData = useMemo(() => {
    if (!aggregatedData || !Array.isArray(aggregatedData)) return []
    
    if (selectedYear) {
      return aggregatedData.filter(item => {
        const mes = item._id?.mes || item.mesReferencia || item.MES_REFERENCIA || ''
        const anoDoMes = mes.split('-')[0]
        return anoDoMes === selectedYear.toString()
      })
    }
    
    return aggregatedData
  }, [aggregatedData, selectedYear])

  const chartData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) {
      console.log('❌ Nenhum dado filtrado disponível')
      return null
    }

    console.log('🔍 Analisando estrutura dos dados:', filteredData[0])

    let labels = []
    let compraData = []
    let vendaData = []

    // Estratégia 1: Dados já agregados por mês
    if (filteredData[0]._id && filteredData[0]._id.mes) {
      console.log('📅 Estrutura: Dados agregados por mês')
      
      const sortedData = [...filteredData].sort((a, b) => {
        const mesA = a._id.mes
        const mesB = b._id.mes
        return mesA.localeCompare(mesB)
      })

      labels = sortedData.map(item => item._id.mes)
      compraData = sortedData.map(item => item.total_compra || 0)
      vendaData = sortedData.map(item => item.total_venda || 0)
    }
    // Estratégia 2: Dados brutos
    else if (filteredData[0].mesReferencia) {
      console.log('📅 Estrutura: Dados brutos por mês')
      
      const monthlyData = {}
      filteredData.forEach(item => {
        const mes = item.mesReferencia
        if (!monthlyData[mes]) {
          monthlyData[mes] = { compra: 0, venda: 0 }
        }
        monthlyData[mes].compra += item.quantidadeCompra || 0
        monthlyData[mes].venda += item.quantidadeVenda || 0
      })

      const sortedMonths = Object.keys(monthlyData).sort()
      labels = sortedMonths
      compraData = sortedMonths.map(mes => monthlyData[mes].compra)
      vendaData = sortedMonths.map(mes => monthlyData[mes].venda)
    }
    // Estratégia 3: Outra estrutura
    else {
      console.log('⚠️ Estrutura desconhecida, tentando adaptar...')
      
      filteredData.forEach((item, index) => {
        const possibleMonth = item.mes || item.month || item.mesReferencia || item.MES_REFERENCIA || `Mês ${index + 1}`
        const possibleCompra = item.compra || item.quantidadeCompra || item.total_compra || item.value || 0
        const possibleVenda = item.venda || item.quantidadeVenda || item.total_venda || 0
        
        labels.push(possibleMonth)
        compraData.push(possibleCompra)
        vendaData.push(possibleVenda)
      })
    }

    if (labels.length === 0) {
      console.log('❌ Não foi possível extrair dados do formato atual')
      return null
    }

    console.log('✅ Dados extraídos:', { labels, compraData, vendaData })

    return {
      labels,
      datasets: [
        {
          label: 'Contratação Compra (MWh)',
          data: compraData,
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
        {
          label: 'Contratação Venda (MWh)',
          data: vendaData,
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
        },
      ],
    }
  }, [filteredData])

  const chartOptions = {
    responsive: true,
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
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} MWh`
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
        title: {
          display: true,
          text: 'Valor de Contratação (MWh)'
        },
        beginAtZero: true
      }
    }
  }

  if (!chartData) {
    return (
      <div className="chart-wrapper">
        <h3>📈 Gráfico de Contratação</h3>
        <div className="no-data">
          <p>Nenhum dado disponível para exibir o gráfico.</p>
          <p style={{ fontSize: '0.9rem', color: '#666' }}>
            {aggregatedData && aggregatedData.length > 0 
              ? `Filtro ativo: ${selectedYear ? `Ano ${selectedYear}` : ''} ${selectedEmpresa ? `- ${selectedEmpresa}` : ''}`
              : 'Selecione uma empresa ou verifique se os dados foram carregados.'
            }
          </p>
          <div style={{ 
            marginTop: '10px', 
            padding: '10px', 
            background: '#f5f5f5', 
            borderRadius: '5px',
            fontSize: '0.8rem' 
          }}>
            <strong>Debug Info:</strong><br />
            - Dados agregados: {aggregatedData ? aggregatedData.length : 0} registros<br />
            - Dados filtrados: {filteredData.length} registros<br />
            - Empresa: {selectedEmpresa || 'Nenhuma'}<br />
            - Ano: {selectedYear || 'Todos'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="chart-wrapper">
      <h3>📈 Gráfico de Contratação</h3>
      <div style={{ height: '400px' }}>
        <Bar data={chartData} options={chartOptions} />
      </div>
      
      <div style={{ 
        fontSize: '0.8rem', 
        color: '#666', 
        marginTop: '10px',
        padding: '10px',
        background: '#f5f5f5',
        borderRadius: '5px'
      }}>
        <strong>Dados do Gráfico:</strong><br />
        - Filtro: {selectedYear ? `Ano ${selectedYear}` : 'Todos os anos'} {selectedEmpresa ? `- ${selectedEmpresa}` : ''}<br />
        - Meses: {chartData.labels.join(', ')}<br />
        - Períodos: {chartData.labels.length} meses
      </div>
    </div>
  )
}

export default EnergyChart