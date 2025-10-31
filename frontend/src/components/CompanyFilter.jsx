import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { 
  setSelectedEmpresa, 
  setSelectedYear, 
  setSelectedMes, 
  fetchEmpresas, 
  fetchMeses, 
  fetchAnos,
  fetchAggregatedData
} from '../store/slices/dataSlice'

const CompanyFilter = () => {
  const dispatch = useDispatch()
  const { empresas, meses, anos, selectedEmpresa, selectedYear, selectedMes, loadingEmpresas, loadingMeses } = useSelector(state => state.data)
  
  // Estado para o buscador de empresas
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [showTraditionalSelect, setShowTraditionalSelect] = useState(false)

  // Filtrar empresas baseado no search term
  const filteredEmpresas = empresas.filter(empresa =>
    empresa.toLowerCase().includes(searchTerm.toLowerCase())
  )

  useEffect(() => {
    dispatch(fetchAnos())
  }, [dispatch])

  // ✅ CORREÇÃO: Função para recarregar dados com filtros atuais
  const reloadDataWithFilters = () => {
    const filters = {}
    if (selectedYear) filters.ano = selectedYear
    if (selectedEmpresa) filters.empresa = selectedEmpresa
    
    console.log('🔄 Recarregando dados com filtros:', filters)
    dispatch(fetchAggregatedData(filters))
  }

  useEffect(() => {
    if (selectedYear) {
      dispatch(fetchEmpresas(selectedYear))
      dispatch(fetchMeses(selectedYear))
    } else {
      dispatch(fetchEmpresas())
      dispatch(fetchMeses())
    }
    
    // ✅ CORREÇÃO: Sempre recarrega dados quando ano muda
    reloadDataWithFilters()
  }, [selectedYear, dispatch])

  const handleEmpresaSelect = (empresa) => {
    dispatch(setSelectedEmpresa(empresa))
    setSearchTerm(empresa)
    setShowDropdown(false)
    
    // ✅ CORREÇÃO: Recarrega dados com empresa E ano
    const filters = { empresa }
    if (selectedYear) filters.ano = selectedYear
    console.log('🏢 Selecionando empresa:', empresa, 'com filtros:', filters)
    dispatch(fetchAggregatedData(filters))
  }

  const handleTraditionalSelect = (empresa) => {
    dispatch(setSelectedEmpresa(empresa))
    setSearchTerm(empresa)
    
    const filters = { empresa }
    if (selectedYear) filters.ano = selectedYear
    console.log('🏢 Selecionando empresa (select):', empresa, 'com filtros:', filters)
    dispatch(fetchAggregatedData(filters))
  }

  const handleClearEmpresa = () => {
    dispatch(setSelectedEmpresa(null))
    setSearchTerm('')
    setShowDropdown(false)
    
    // ✅ CORREÇÃO: Recarrega dados apenas com ano (se houver)
    const filters = {}
    if (selectedYear) filters.ano = selectedYear
    console.log('🗑️ Limpando empresa, filtros:', filters)
    dispatch(fetchAggregatedData(filters))
  }

  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearchTerm(value)
    setShowDropdown(true)
    
    // Se limpar o campo, remove o filtro
    if (value === '') {
      handleClearEmpresa()
    }
  }

  // ✅ CORREÇÃO: Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = () => {
      setShowDropdown(false)
    }
    
    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [])

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">🔧 Filtros</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Filtro Ano */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📅 Ano
          </label>
          <select 
            value={selectedYear || ''}
            onChange={(e) => {
              const newYear = e.target.value || null
              dispatch(setSelectedYear(newYear))
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todos os anos</option>
            {anos.map((ano) => (
              <option key={ano} value={ano}>
                {ano}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro Empresa COM DUAS OPÇÕES */}
        <div className="relative">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              🏢 Empresa
            </label>
            <button
              onClick={() => setShowTraditionalSelect(!showTraditionalSelect)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              {showTraditionalSelect ? '↩️ Voltar ao buscador' : '📋 Usar lista completa'}
            </button>
          </div>

          {showTraditionalSelect ? (
            // ✅ SELETOR TRADICIONAL
            <div>
              <select 
                value={selectedEmpresa || ''}
                onChange={(e) => handleTraditionalSelect(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todas as empresas</option>
                {empresas.map((empresa) => (
                  <option key={empresa} value={empresa}>
                    {empresa}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {empresas.length} empresas disponíveis
              </p>
            </div>
          ) : (
            // ✅ BUSCADOR AVANÇADO
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => setShowDropdown(true)}
                placeholder="Digite para buscar empresa..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {selectedEmpresa && (
                <button
                  onClick={handleClearEmpresa}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* Dropdown de empresas (apenas no modo buscador) */}
          {!showTraditionalSelect && showDropdown && searchTerm && filteredEmpresas.length > 0 && (
            <div 
              className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {filteredEmpresas.slice(0, 10).map((empresa) => (
                <div
                  key={empresa}
                  onClick={() => handleEmpresaSelect(empresa)}
                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150"
                >
                  <div className="text-sm text-gray-700 truncate">{empresa}</div>
                </div>
              ))}
              {filteredEmpresas.length > 10 && (
                <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50">
                  + {filteredEmpresas.length - 10} empresas...
                </div>
              )}
            </div>
          )}

          {loadingEmpresas && (
            <p className="text-xs text-gray-500 mt-1">Carregando empresas...</p>
          )}
          
          {/* Empresa selecionada */}
          {selectedEmpresa && !showDropdown && (
            <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-800 font-medium truncate" title={selectedEmpresa}>
                  ✅ {selectedEmpresa}
                </span>
                <button
                  onClick={handleClearEmpresa}
                  className="text-green-600 hover:text-green-800 text-xs font-medium"
                >
                  Remover
                </button>
              </div>
            </div>
          )}

          {/* Mensagem quando não encontra resultados */}
          {!showTraditionalSelect && showDropdown && searchTerm && filteredEmpresas.length === 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
              <div className="px-3 py-2 text-sm text-gray-500">
                Nenhuma empresa encontrada para "{searchTerm}"
              </div>
            </div>
          )}
        </div>

        {/* Filtro Mês */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📋 Mês
          </label>
          <select 
            value={selectedMes || ''}
            onChange={(e) => dispatch(setSelectedMes(e.target.value || null))}
            disabled={loadingMeses}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Todos os meses</option>
            {meses.map((mes) => (
              <option key={mes} value={mes}>
                {mes}
              </option>
            ))}
          </select>
          {loadingMeses && (
            <p className="text-xs text-gray-500 mt-1">Carregando meses...</p>
          )}
        </div>
      </div>

      {/* Status dos Filtros Ativos */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Filtros Ativos:</h4>
        <div className="flex flex-wrap gap-2">
          {selectedYear && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Ano: {selectedYear}
            </span>
          )}
          {selectedEmpresa && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Empresa: {selectedEmpresa}
            </span>
          )}
          {selectedMes && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Mês: {selectedMes}
            </span>
          )}
          {!selectedYear && !selectedEmpresa && !selectedMes && (
            <span className="text-sm text-gray-600">Nenhum filtro aplicado</span>
          )}
        </div>
      </div>

      {/* Botão Limpar Todos os Filtros */}
      {(selectedYear || selectedEmpresa || selectedMes) && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => {
              dispatch(setSelectedYear(null))
              dispatch(setSelectedEmpresa(null))
              dispatch(setSelectedMes(null))
              setSearchTerm('')
              setShowDropdown(false)
              setShowTraditionalSelect(false)
              console.log('🗑️ Limpando todos os filtros')
              dispatch(fetchAggregatedData({}))
            }}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-md transition-colors duration-200"
          >
            🗑️ Limpar Todos os Filtros
          </button>
        </div>
      )}
    </div>
  )
}

export default CompanyFilter