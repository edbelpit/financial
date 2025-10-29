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
  const { aggregatedData } = useSelector(state => state.data)

  console.log('📊 Dados agregados para gráfico:', aggregatedData)

  const chartData = useMemo(() => {
    if (!aggregatedData || !Array.isArray(aggregatedData) || aggregatedData.length === 0) {
      console.log('❌ Nenhum dado agregado disponível ou array vazio')
      return []
    }

    // Agrupa dados por empresa
    const empresasMap = new Map()
    
    aggregatedData.forEach(item => {
      if (!item || !item._id) {
        console.warn('⚠️ Item inválido no aggregatedData:', item)
        return
      }

      const empresa = item._id.empresa
      const mes = item._id.mes
      
      if (!empresa || !mes) {
        console.warn('⚠️ Empresa ou mês inválido:', item)
        return
      }
      
      if (!empresasMap.has(empresa)) {
        empresasMap.set(empresa, {
          labels: [],
          compra: [],
          venda: []
        })
      }
      
      const empresaData = empresasMap.get(empresa)
      
      // Adiciona dados do mês (evita duplicatas)
      if (!empresaData.labels.includes(mes)) {
        empresaData.labels.push(mes)
        empresaData.compra.push(item.total_compra || 0)
        empresaData.venda.push(item.total_venda || 0)
      }
    })

    // Cria gráfico para cada empresa (limita a 5 empresas para não sobrecarregar)
    const empresasArray = Array.from(empresasMap.entries()).slice(0, 5)
    
    console.log(`🏢 Criando gráficos para ${empresasArray.length} empresas`)

    return empresasArray.map(([empresa, data]) => ({
      empresa,
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Contratação Compra (MWh)',
            data: data.compra,
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          },
          {
            label: 'Contratação Venda (MWh)',
            data: data.venda,
            backgroundColor: 'rgba(255, 99, 132, 0.6)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: `Empresa: ${empresa}`,
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
    }))
  }, [aggregatedData])

  if (chartData.length === 0) {
    return (
      <div className="no-data">
        <h3>📈 Gráficos de Contratação</h3>
        <p>Nenhum dado disponível para exibir os gráficos.</p>
        <p style={{ fontSize: '0.9rem', color: '#666' }}>
          Verifique se os dados foram carregados corretamente.
        </p>
      </div>
    )
  }

  return (
    <div className="charts-container">
      <h3>📈 Gráficos de Contratação por Empresa</h3>
      <p style={{ marginBottom: '2rem', color: '#666' }}>
        Mostrando as primeiras {chartData.length} empresas
      </p>
      
      {chartData.map((chart, index) => (
        <div key={index} className="chart-wrapper">
          <Bar data={chart.data} options={chart.options} />
        </div>
      ))}
    </div>
  )
}

export default EnergyChart