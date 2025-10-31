// src/utils/energyCalculations.js

// Função para calcular horas em um mês (considerando ano bissexto)
export const getHoursInMonth = (year, month) => {
  const months = {
    '01': { days: 31, name: 'Janeiro' },
    '02': { 
      days: (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 29 : 28, 
      name: 'Fevereiro' 
    },
    '03': { days: 31, name: 'Março' },
    '04': { days: 30, name: 'Abril' },
    '05': { days: 31, name: 'Maio' },
    '06': { days: 30, name: 'Junho' },
    '07': { days: 31, name: 'Julho' },
    '08': { days: 31, name: 'Agosto' },
    '09': { days: 30, name: 'Setembro' },
    '10': { days: 31, name: 'Outubro' },
    '11': { days: 30, name: 'Novembro' },
    '12': { days: 31, name: 'Dezembro' }
  }
  
  const monthData = months[month]
  return monthData ? monthData.days * 24 : 720 // padrão 30 dias
}

// Calcular total de horas em um ano
export const getTotalHoursInYear = (year) => {
  let totalHours = 0
  for (let month = 1; month <= 12; month++) {
    const monthStr = month.toString().padStart(2, '0')
    totalHours += getHoursInMonth(year, monthStr)
  }
  return totalHours
}

// Converter MWh para MWm (Mega Watt médio) para um mês
export const convertToMWm = (mwh, year, month) => {
  const hours = getHoursInMonth(year, month)
  return hours > 0 ? mwh / hours : 0
}

// Calcular MWm para período múltiplo (soma MWh / soma horas)
export const calculateMWmForPeriod = (totalMWh, dataArray) => {
  if (!dataArray || dataArray.length === 0) return 0
  
  const totalHours = dataArray.reduce((sum, item) => {
    const mesStr = item.mes ? item.mes.toString() : (item._id ? item._id.toString() : '')
    const year = mesStr.substring(0, 4)
    const month = mesStr.substring(4, 6)
    return sum + getHoursInMonth(year, month)
  }, 0)
  
  return totalHours > 0 ? totalMWh / totalHours : 0
}

// Processar dados para MWm e calcular Net
export const processEnergyData = (aggregatedData) => {
  if (!aggregatedData || !Array.isArray(aggregatedData)) return []

  return aggregatedData.map(item => {
    const mesStr = item.mes ? item.mes.toString() : (item._id ? item._id.toString() : '')
    const year = mesStr.substring(0, 4)
    const month = mesStr.substring(4, 6)
    
    const compraMWh = item.total_compra || 0
    const vendaMWh = item.total_venda || 0
    
    const compraMWm = convertToMWm(compraMWh, year, month)
    const vendaMWm = convertToMWm(vendaMWh, year, month)
    const netMWm = compraMWm - vendaMWm  // ✅ CORREÇÃO: Net = Compra - Venda
    
    return {
      ...item,
      year,
      month,
      compraMWh,
      vendaMWh,
      compraMWm,
      vendaMWm,
      netMWm,
      horasNoMes: getHoursInMonth(year, month)
    }
  })
}