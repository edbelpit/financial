import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'axios'

// ✅ Usa variável de ambiente do Vite do frontend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

console.log(`🌐 API URL: ${API_BASE_URL}`)

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
})

// ✅ NOVO: Atualizar dados da CCEE
export const updateCCEEData = createAsyncThunk(
  'data/updateCCEEData',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🔄 Atualizando dados da CCEE...')
      const response = await api.post('/api/update-ccee-data')
      console.log('✅ Atualização CCEE concluída:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Erro ao atualizar dados CCEE:', error)
      return rejectWithValue(
        error.response?.data?.detail || 
        error.message || 
        'Erro ao atualizar dados da CCEE'
      )
    }
  }
)

// Buscar anos disponíveis
export const fetchAnos = createAsyncThunk(
  'data/fetchAnos',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🔄 Buscando anos disponíveis...')
      const response = await api.get('/api/anos')
      const anos = response.data.anos || response.data
      console.log(`✅ Anos recebidos: ${Array.isArray(anos) ? anos.length : 'undefined'} anos`)
      return anos
    } catch (error) {
      console.error('❌ Erro ao buscar anos:', error)
      return rejectWithValue(
        error.response?.data?.detail || 
        error.message || 
        'Erro ao buscar anos disponíveis'
      )
    }
  }
)

// Buscar dados com filtros
export const fetchData = createAsyncThunk(
  'data/fetchData',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams()
      
      if (filters.empresa) params.append('empresa', filters.empresa)
      if (filters.mes) params.append('mes', filters.mes)
      if (filters.ano) params.append('ano', filters.ano)
      
      const url = `/api/dados?${params.toString()}`
      
      console.log('🔄 Buscando dados do MongoDB...', { filters, url })
      const response = await api.get(url)
      const data = response.data.data || response.data
      console.log(`✅ Dados recebidos: ${Array.isArray(data) ? data.length : 'undefined'} registros`)
      return data
    } catch (error) {
      console.error('❌ Erro ao buscar dados:', error)
      return rejectWithValue(
        error.response?.data?.detail || 
        error.message || 
        'Erro ao buscar dados'
      )
    }
  }
)

// Buscar dados agregados
export const fetchAggregatedData = createAsyncThunk(
  'data/fetchAggregatedData',
  async ({ empresa = null, ano = null } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams()
      if (empresa) params.append('empresa', empresa)
      if (ano) params.append('ano', ano)
      
      const url = `/api/dados/agregados?${params.toString()}`
      
      console.log('🔄 Buscando dados agregados...', { empresa, ano, url })
      const response = await api.get(url)
      console.log(`✅ Dados agregados recebidos: ${Array.isArray(response.data) ? response.data.length : 'undefined'} registros`)
      return response.data
    } catch (error) {
      console.error('❌ Erro ao buscar dados agregados:', error)
      return rejectWithValue(
        error.response?.data?.detail || 
        error.message || 
        'Erro ao buscar dados agregados'
      )
    }
  }
)

// Buscar empresas
export const fetchEmpresas = createAsyncThunk(
  'data/fetchEmpresas',
  async (ano = null, { rejectWithValue }) => {
    try {
      const url = ano ? `/api/empresas?ano=${ano}` : '/api/empresas'
      console.log('🔄 Buscando empresas...', { ano, url })
      const response = await api.get(url)
      const empresas = response.data.empresas || response.data
      console.log(`✅ Empresas recebidas: ${Array.isArray(empresas) ? empresas.length : 'undefined'} empresas`)
      return empresas
    } catch (error) {
      console.error('❌ Erro ao buscar empresas:', error)
      return rejectWithValue(
        error.response?.data?.detail || 
        error.message || 
        'Erro ao buscar empresas'
      )
    }
  }
)

// Buscar meses
export const fetchMeses = createAsyncThunk(
  'data/fetchMeses',
  async (ano = null, { rejectWithValue }) => {
    try {
      const url = ano ? `/api/meses?ano=${ano}` : '/api/meses'
      console.log('🔄 Buscando meses...', { ano, url })
      const response = await api.get(url)
      const meses = response.data.meses || response.data
      console.log(`✅ Meses recebidos: ${Array.isArray(meses) ? meses.length : 'undefined'} meses`)
      return meses
    } catch (error) {
      console.error('❌ Erro ao buscar meses:', error)
      return rejectWithValue(
        error.response?.data?.detail || 
        error.message || 
        'Erro ao buscar meses'
      )
    }
  }
)

// Buscar estatísticas
export const fetchStats = createAsyncThunk(
  'data/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🔄 Buscando estatísticas...')
      const response = await api.get('/api/stats')
      console.log('✅ Estatísticas recebidas')
      return response.data
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas:', error)
      return rejectWithValue(
        error.response?.data?.detail || 
        error.message || 
        'Erro ao buscar estatísticas'
      )
    }
  }
)

// ✅ CORREÇÃO: Carregar todos os dados iniciais
export const loadInitialData = createAsyncThunk(
  'data/loadInitialData',
  async (ano = null, { rejectWithValue, dispatch }) => {
    try {
      console.log('🔄 Carregando todos os dados iniciais...', { ano })
      
      // ✅ CORREÇÃO: Passa o ano corretamente para fetchAggregatedData
      await dispatch(fetchAggregatedData(ano ? { ano } : {})).unwrap()
      
      // Carrega empresas
      await dispatch(fetchEmpresas(ano)).unwrap()
      
      // Carrega meses
      await dispatch(fetchMeses(ano)).unwrap()
      
      // Carrega anos disponíveis
      await dispatch(fetchAnos()).unwrap()
      
      console.log('✅ Todos os dados iniciais carregados com sucesso')
      return { success: true, message: 'Dados carregados com sucesso' }
    } catch (error) {
      console.error('❌ Erro ao carregar dados iniciais:', error)
      return rejectWithValue(
        error.message || 'Erro ao carregar dados iniciais'
      )
    }
  }
)

const dataSlice = createSlice({
  name: 'data',
  initialState: {
    // Dados
    rawData: [],
    aggregatedData: [],
    empresas: [],
    meses: [],
    anos: [],
    stats: null,
    
    // Estado de carregamento
    loading: false,
    loadingEmpresas: false,
    loadingMeses: false,
    loadingAnos: false,
    
    // Filtros ativos
    selectedEmpresa: null,
    selectedYear: null,
    selectedMes: null,
    
    // Status e erros
    error: null,
    lastUpdate: null,
    dataLoaded: false,
    
    // Operações
    operationStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    operationMessage: '',
  },
  reducers: {
    clearError: (state) => {
      state.error = null
      state.operationStatus = 'idle'
      state.operationMessage = ''
    },
    setSelectedEmpresa: (state, action) => {
      state.selectedEmpresa = action.payload
    },
    setSelectedYear: (state, action) => {
      state.selectedYear = action.payload
      // ✅ CORREÇÃO: Não recarrega dados automaticamente aqui
      // O useEffect no CompanyFilter vai cuidar disso
    },
    setSelectedMes: (state, action) => {
      state.selectedMes = action.payload
    },
    clearFilters: (state) => {
      state.selectedEmpresa = null
      state.selectedYear = null
      state.selectedMes = null
    },
    setLastUpdate: (state, action) => {
      state.lastUpdate = action.payload
    },
    resetData: (state) => {
      state.rawData = []
      state.aggregatedData = []
      state.empresas = []
      state.meses = []
      state.anos = []
      state.stats = null
      state.selectedEmpresa = null
      state.selectedYear = null
      state.selectedMes = null
      state.dataLoaded = false
      state.lastUpdate = null
    }
  },
  extraReducers: (builder) => {
    builder
      // ✅ NOVO: Update CCEE Data - COM MENSAGENS CLARAS
      .addCase(updateCCEEData.pending, (state) => {
        state.operationStatus = 'loading'
        state.operationMessage = 'Verificando atualizações na CCEE...'
      })
      .addCase(updateCCEEData.fulfilled, (state, action) => {
        if (action.payload.success) {
          if (action.payload.updated) {
            state.operationStatus = 'succeeded'
            // ✅ Mensagem específica para novos dados adicionados
            state.operationMessage = `✅ Novos dados adicionados ao banco (${action.payload.month_updated}) - ${action.payload.records_updated} registros`
          } else {
            state.operationStatus = 'succeeded'
            // ✅ Mensagem específica para banco atualizado
            state.operationMessage = '✅ Banco já está atualizado'
          }
        } else {
          state.operationStatus = 'failed'
          state.operationMessage = `❌ ${action.payload.message}`
        }
      })
      .addCase(updateCCEEData.rejected, (state, action) => {
        state.operationStatus = 'failed'
        state.operationMessage = `❌ Erro na atualização: ${action.payload}`
      })
      
      // Fetch Anos
      .addCase(fetchAnos.pending, (state) => {
        state.loadingAnos = true
        state.error = null
      })
      .addCase(fetchAnos.fulfilled, (state, action) => {
        state.loadingAnos = false
        state.anos = Array.isArray(action.payload) ? action.payload : []
        state.error = null
      })
      .addCase(fetchAnos.rejected, (state, action) => {
        state.loadingAnos = false
        state.error = action.payload
      })
      
      // Fetch Data
      .addCase(fetchData.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchData.fulfilled, (state, action) => {
        state.loading = false
        state.rawData = Array.isArray(action.payload) ? action.payload : []
        state.dataLoaded = true
        state.lastUpdate = new Date().toISOString()
        state.error = null
      })
      .addCase(fetchData.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      
      // Fetch Aggregated Data
      .addCase(fetchAggregatedData.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchAggregatedData.fulfilled, (state, action) => {
        state.loading = false
        state.aggregatedData = Array.isArray(action.payload) ? action.payload : []
        state.dataLoaded = true
        state.lastUpdate = new Date().toISOString()
      })
      .addCase(fetchAggregatedData.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      
      // Fetch Empresas
      .addCase(fetchEmpresas.pending, (state) => {
        state.loadingEmpresas = true
      })
      .addCase(fetchEmpresas.fulfilled, (state, action) => {
        state.loadingEmpresas = false
        state.empresas = Array.isArray(action.payload) ? action.payload : []
      })
      .addCase(fetchEmpresas.rejected, (state, action) => {
        state.loadingEmpresas = false
        state.error = action.payload
      })
      
      // Fetch Meses
      .addCase(fetchMeses.pending, (state) => {
        state.loadingMeses = true
      })
      .addCase(fetchMeses.fulfilled, (state, action) => {
        state.loadingMeses = false
        state.meses = Array.isArray(action.payload) ? action.payload : []
      })
      .addCase(fetchMeses.rejected, (state, action) => {
        state.loadingMeses = false
        state.error = action.payload
      })
      
      // Fetch Stats
      .addCase(fetchStats.fulfilled, (state, action) => {
        state.stats = action.payload
      })
      .addCase(fetchStats.rejected, (state, action) => {
        state.error = action.payload
      })
      
      // Load Initial Data
      .addCase(loadInitialData.pending, (state) => {
        state.operationStatus = 'loading'
        state.operationMessage = 'Carregando dados do banco...'
        state.error = null
      })
      .addCase(loadInitialData.fulfilled, (state, action) => {
        state.operationStatus = 'succeeded'
        state.operationMessage = '✅ Dados carregados com sucesso'
        state.error = null
      })
      .addCase(loadInitialData.rejected, (state, action) => {
        state.operationStatus = 'failed'
        state.operationMessage = `❌ ${action.payload}`
        state.error = action.payload
      })
  }
})

export const { 
  clearError, 
  setSelectedEmpresa, 
  setSelectedYear, 
  setSelectedMes,
  clearFilters,
  setLastUpdate,
  resetData
} = dataSlice.actions

export default dataSlice.reducer