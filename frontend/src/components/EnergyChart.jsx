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
  console.log('🔍 Estrutura completa:', JSON.stringify(aggregatedData, null, 2))

  // FILTRO E PROCESSAMENTO DOS DADOS
  const chartData = useMemo(() => {
    if (!aggregatedData || !Array.isArray(aggregatedData) || aggregatedData.length === 0) {
      console.log('❌ Nenhum dado disponível')
      return null
    }

    console.log('🔍 Primeiro item da estrutura:', aggregatedData[0])

    let labels = []
    let compraData = []
    let vendaData = []

    // Estratégia 1: Dados da API com filtro por ano (estrutura mais comum)
    if (aggregatedData[0].mesReferencia) {
      console.log('📅 Estrutura: Dados por mêsReferencia')
      
      // Ordenar por mês
      const sortedData = [...aggregatedData].sort((a, b) => {
        return a.mesReferencia.localeCompare(b.mesReferencia)
      })

      labels = sortedData.map(item => {
        // Formatar label para exibição (ex: "2025-01" → "Jan/2025")
        const [ano, mes] = item.mesReferencia.split('-')
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
        return `${meses[parseInt(mes) - 1]}/${ano}`
      })
      
      compraData = sortedData.map(item => item.quantidadeCompra || item.compra || 0)
      vendaData = sortedData.map(item => item.quantidadeVenda || item.venda || 0)
    }
    // Estrutura 2: Dados agregados com _id
    else if (aggregatedData[0]._id) {
      console.log('📅 Estrutura: Dados agregados com _id')
      
      const sortedData = [...aggregatedData].sort((a, b) => {
        const mesA = a._id.mes || a._id.mesReferencia || ''
        const mesB = b._id.mes || b._id.mesReferencia || ''
        return mesA.localeCompare(mesB)
      })

      labels = sortedData.map(item => {
        const mes = item._id.mes || item._id.mesReferencia
        const [ano, mesNum] = mes.split('-')
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
        return `${meses[parseInt(mesNum) - 1]}/${ano}`
      })
      
      compraData = sortedData.map(item => item.total_compra || item.quantidadeCompra || 0)
      vendaData = sortedData.map(item => item.total_venda || item.quantidadeVenda || 0)
    }
    // Estrutura 3: Tentativa de adaptação automática
    else {
      console.log('⚠️ Estrutura desconhecida, tentando adaptar...')
      
      // Encontrar campos automaticamente
      const firstItem = aggregatedData[0]
      const monthKey = Object.keys(firstItem).find(key => 
        key.toLowerCase().includes('mes') || key.toLowerCase().includes('month')
      )
      const compraKey = Object.keys(firstItem).find(key => 
        key.toLowerCase().includes('compra') || key.toLowerCase().includes('buy')
      )
      const vendaKey = Object.keys(firstItem).find(key => 
        key.toLowerCase().includes('venda') || key.toLowerCase().includes('sell')
      )

      console.log('🔍 Chaves encontradas:', { monthKey, compraKey, vendaKey })

      const sortedData = [...aggregatedData].sort((a, b) => {
        const valA = monthKey ? (a[monthKey] || '') : ''
        const valB = monthKey ? (b[monthKey] || '') : ''
        return valA.localeCompare(valB)
      })

      labels = sortedData.map(item => 
        monthKey ? item[monthKey] : `Item ${sortedData.indexOf(item) + 1}`
      )
      compraData = sortedData.map(item => 
        compraKey ? (item[compraKey] || 0) : 0
      )
      vendaData = sortedData.map(item => 
        vendaKey ? (item[vendaKey] || 0) : 0
      )
    }

    if (labels.length === 0 || (compraData.every(val => val === 0) && vendaData.every(val => val === 0))) {
      console.log('❌ Dados insuficientes ou todos zeros')
      return null
    }

    console.log('✅ Dados processados:', { 
      labels, 
      compraData, 
      vendaData,
      totalCompra: compraData.reduce((a, b) => a + b, 0),
      totalVenda: vendaData.reduce((a, b) => a + b, 0)
    })

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
  }, [aggregatedData]) // Removi selectedYear da dependência se a API já filtra

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
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
              ? `Dados recebidos mas não puderam ser processados. Verifique o console.`
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
            - Dados recebidos: {aggregatedData ? aggregatedData.length : 0} registros<br />
            - Empresa: {selectedEmpresa || 'Nenhuma'}<br />
            - Ano: {selectedYear || 'Todos'}<br />
            - Estrutura: {aggregatedData && aggregatedData[0] ? JSON.stringify(Object.keys(aggregatedData[0])) : 'N/A'}
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
        <strong>Resumo dos Dados:</strong><br />
        - Filtro: {selectedYear ? `Ano ${selectedYear}` : 'Todos os anos'} {selectedEmpresa ? `- ${selectedEmpresa}` : ''}<br />
        - Total Compra: {chartData.datasets[0].data.reduce((a, b) => a + b, 0).toFixed(2)} MWh<br />
        - Total Venda: {chartData.datasets[1].data.reduce((a, b) => a + b, 0).toFixed(2)} MWh<br />
        - Períodos: {chartData.labels.length} meses
      </div>
    </div>
  )
}

export default EnergyChart