import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'axios'

// ✅ Usa variável de ambiente do Vite do frontend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

console.log(`🌐 API URL: ${API_BASE_URL}`)

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
})

// ✅ Helper para limpar mensagens após delay
const createAutoClearThunk = (asyncThunk, clearDelay = 5000) => {
  return async (payload, thunkAPI) => {
    const result = await thunkAPI.dispatch(asyncThunk(payload))
    
    // ✅ Limpa a mensagem após o delay
    setTimeout(() => {
      thunkAPI.dispatch(clearMessages())
    }, clearDelay)
    
    return result
  }
}

// ✅ NOVA ACTION para limpar mensagens
export const clearMessages = createAsyncThunk(
  'data/clearMessages',
  async (_, { dispatch }) => {
    // Esta action será chamada automaticamente após o timeout
    return { success: true }
  }
)

// ✅ Atualizar dados da CCEE
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

// ✅ Recarregar dados do frontend (com auto-clear)
export const reloadFrontendData = createAsyncThunk(
  'data/reloadFrontendData',
  async (ano = null, { rejectWithValue, dispatch }) => {
    try {
      console.log('🔄 Recarregando dados do frontend...', { ano })
      
      const params = new URLSearchParams()
      if (ano) params.append('ano', ano)
      
      const url = `/api/dados/agregados?${params.toString()}`
      
      const response = await api.get(url)
      console.log(`✅ Dados agregados recebidos: ${Array.isArray(response.data) ? response.data.length : 'undefined'} registros`)
      
      return {
        success: true, 
        message: 'Dados recarregados com sucesso',
        data: response.data
      }
    } catch (error) {
      console.error('❌ Erro ao recarregar dados do frontend:', error)
      return rejectWithValue(
        error.message || 'Erro ao recarregar dados do frontend'
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

const dataSlice = createSlice({
  name: 'data',
  initialState: {
    // Dados
    rawData: [],
    aggregatedData: [],
    empresas: [],
    anos: [],
    stats: null,
    
    // Estado de carregamento INDIVIDUAL
    loading: false,           // Para fetchAggregatedData (EnergyChart)
    loadingEmpresas: false,
    loadingAnos: false,
    
    // ✅ ESTADOS DE OPERAÇÃO SEPARADOS
    reloadStatus: 'idle',     // Para reloadFrontendData
    reloadMessage: '',
    
    updateStatus: 'idle',     // Para updateCCEEData  
    updateMessage: '',
    
    // ✅ NOVO: Timer IDs para controle dos timeouts
    messageTimers: {
      reload: null,
      update: null
    },
    
    // Filtros ativos
    selectedEmpresa: null,
    selectedYear: null,
    
    // Status e erros
    error: null,
    lastUpdate: null,
    dataLoaded: false,
  },
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    // ✅ NOVO: Limpar mensagens manualmente
    clearReloadMessage: (state) => {
      state.reloadStatus = 'idle'
      state.reloadMessage = ''
      if (state.messageTimers.reload) {
        clearTimeout(state.messageTimers.reload)
        state.messageTimers.reload = null
      }
    },
    clearUpdateMessage: (state) => {
      state.updateStatus = 'idle'
      state.updateMessage = ''
      if (state.messageTimers.update) {
        clearTimeout(state.messageTimers.update)
        state.messageTimers.update = null
      }
    },
    // ✅ NOVO: Limpar todas as mensagens
    clearAllMessages: (state) => {
      state.reloadStatus = 'idle'
      state.reloadMessage = ''
      state.updateStatus = 'idle'
      state.updateMessage = ''
      
      // Limpar todos os timers
      Object.values(state.messageTimers).forEach(timer => {
        if (timer) clearTimeout(timer)
      })
      state.messageTimers = { reload: null, update: null }
    },
    setSelectedEmpresa: (state, action) => {
      state.selectedEmpresa = action.payload
    },
    setSelectedYear: (state, action) => {
      state.selectedYear = action.payload
    },
    clearFilters: (state) => {
      state.selectedEmpresa = null
      state.selectedYear = null
    },
    setLastUpdate: (state, action) => {
      state.lastUpdate = action.payload
    },
    resetData: (state) => {
      state.rawData = []
      state.aggregatedData = []
      state.empresas = []
      state.anos = []
      state.stats = null
      state.selectedEmpresa = null
      state.selectedYear = null
      state.dataLoaded = false
      state.lastUpdate = null
      state.reloadStatus = 'idle'
      state.reloadMessage = ''
      state.updateStatus = 'idle'
      state.updateMessage = ''
      // Limpar timers
      Object.values(state.messageTimers).forEach(timer => {
        if (timer) clearTimeout(timer)
      })
      state.messageTimers = { reload: null, update: null }
    }
  },
  extraReducers: (builder) => {
    builder
      // ✅ UPDATE CCEE Data - COM AUTO-CLEAR
      .addCase(updateCCEEData.pending, (state) => {
        state.updateStatus = 'loading'
        state.updateMessage = 'Verificando atualizações na CCEE...'
        // Limpar timer anterior se existir
        if (state.messageTimers.update) {
          clearTimeout(state.messageTimers.update)
        }
      })
      .addCase(updateCCEEData.fulfilled, (state, action) => {
        if (action.payload.success) {
          if (action.payload.updated) {
            state.updateStatus = 'succeeded'
            state.updateMessage = `✅ Novos dados adicionados ao banco (${action.payload.month_updated}) - ${action.payload.records_updated} registros`
          } else {
            state.updateStatus = 'succeeded'
            state.updateMessage = '✅ Banco já está atualizado'
          }
          
          // ✅ Configurar auto-clear após 5 segundos
          state.messageTimers.update = setTimeout(() => {
            // Esta função será chamada pelo componente via dispatch
          }, 5000)
        } else {
          state.updateStatus = 'failed'
          state.updateMessage = `❌ ${action.payload.message}`
        }
      })
      .addCase(updateCCEEData.rejected, (state, action) => {
        state.updateStatus = 'failed'
        state.updateMessage = `❌ Erro na atualização: ${action.payload}`
      })
      
      // ✅ RELOAD FRONTEND DATA - COM AUTO-CLEAR
      .addCase(reloadFrontendData.pending, (state) => {
        state.reloadStatus = 'loading'
        state.reloadMessage = 'Recarregando dados...'
        // Limpar timer anterior se existir
        if (state.messageTimers.reload) {
          clearTimeout(state.messageTimers.reload)
        }
      })
      .addCase(reloadFrontendData.fulfilled, (state, action) => {
        if (action.payload.success) {
          state.reloadStatus = 'succeeded'
          state.reloadMessage = '✅ Dados recarregados com sucesso'
          state.aggregatedData = action.payload.data
          state.dataLoaded = true
          state.lastUpdate = new Date().toISOString()
          
          // ✅ Configurar auto-clear após 5 segundos
          state.messageTimers.reload = setTimeout(() => {
            // Esta função será chamada pelo componente via dispatch
          }, 5000)
        } else {
          state.reloadStatus = 'failed'
          state.reloadMessage = `❌ ${action.payload.message}`
        }
      })
      .addCase(reloadFrontendData.rejected, (state, action) => {
        state.reloadStatus = 'failed'
        state.reloadMessage = `❌ ${action.payload}`
      })
      
      // ✅ CLEAR MESSAGES ACTION
      .addCase(clearMessages.fulfilled, (state) => {
        // Esta action é chamada pelos timeouts para limpar mensagens
        state.reloadStatus = 'idle'
        state.reloadMessage = ''
        state.updateStatus = 'idle' 
        state.updateMessage = ''
        state.messageTimers = { reload: null, update: null }
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
  }
})

export const { 
  clearError, 
  clearReloadMessage,
  clearUpdateMessage, 
  clearAllMessages,
  setSelectedEmpresa, 
  setSelectedYear,
  clearFilters,
  setLastUpdate,
  resetData
} = dataSlice.actions

export default dataSlice.reducer