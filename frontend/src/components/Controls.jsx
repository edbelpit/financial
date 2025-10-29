import React from 'react'

const Controls = ({ onBackup, backupStatus }) => {
  return (
    <div className="controls">
      <div className="control-group">
        <button 
          className="button backup-button"
          onClick={onBackup}
          disabled={backupStatus === 'loading'}
        >
          {backupStatus === 'loading' ? 'Fazendo Backup...' : '💾 Fazer Backup MongoDB'}
        </button>
        
        {backupStatus === 'succeeded' && (
          <span className="success-message">Backup realizado com sucesso!</span>
        )}
        {backupStatus === 'failed' && (
          <span className="error-message">Erro no backup</span>
        )}
      </div>
      
      <div className="info-message">
        💡 Dados carregados diretamente da API CCEE
      </div>
    </div>
  )
}

export default Controls