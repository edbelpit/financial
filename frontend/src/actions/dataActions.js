import { createAsyncThunk } from '@reduxjs/toolkit';

// ✅ THUNK para atualizar dados da CCEE
export const updateCCEEData = createAsyncThunk(
  'data/updateCCEEData',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('http://localhost:8000/api/update-ccee-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      
      const result = await response.json();
      return result;
      
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);