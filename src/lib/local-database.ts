export interface Boleto {
  id: string
  nome: string
  valor: number
  dataVencimento: string
  pago: boolean
  arquivo?: string
  comprovante?: string
  codigoBarras?: string
  dataCriacao: string
  usuarioId: string
}

export interface Usuario {
  id: string
  username: string
  password: string
  createdAt: string
}

// Função para fazer requisições à API
const apiRequest = async (url: string, options?: RequestInit) => {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Erro na requisição API:', error)
    throw error
  }
}

// Fallback para localStorage quando API não estiver disponível
const getLocalStorageData = (key: string, defaultValue: any = []) => {
  if (typeof window === 'undefined') return defaultValue
  
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : defaultValue
  } catch (error) {
    console.error('Erro ao ler localStorage:', error)
    return defaultValue
  }
}

const setLocalStorageData = (key: string, data: any) => {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.error('Erro ao salvar no localStorage:', error)
  }
}

// Funções para gerenciar boletos
export const boletosService = {
  // Buscar todos os boletos de um usuário
  async buscarBoletos(usuarioId: string): Promise<Boleto[]> {
    try {
      const result = await apiRequest(`/api/database?action=buscarBoletos&usuarioId=${usuarioId}`)
      
      if (result.success) {
        // Sincronizar com localStorage
        setLocalStorageData(`boletos_${usuarioId}`, result.data)
        return result.data
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.warn('API indisponível, usando localStorage:', error)
      // Fallback para localStorage
      const boletos = getLocalStorageData(`boletos_${usuarioId}`, [])
      return boletos.sort((a: Boleto, b: Boleto) => 
        new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime()
      )
    }
  },

  // Adicionar novo boleto
  async adicionarBoleto(boleto: Omit<Boleto, 'id' | 'dataCriacao'>): Promise<Boleto | null> {
    try {
      const result = await apiRequest('/api/database', {
        method: 'POST',
        body: JSON.stringify({ action: 'adicionarBoleto', boleto })
      })
      
      if (result.success) {
        // Atualizar localStorage
        const boletosExistentes = getLocalStorageData(`boletos_${boleto.usuarioId}`, [])
        const boletosAtualizados = [...boletosExistentes, result.data]
        setLocalStorageData(`boletos_${boleto.usuarioId}`, boletosAtualizados)
        
        console.log('✅ Boleto adicionado ao banco local:', result.data.nome)
        return result.data
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.warn('API indisponível, usando localStorage:', error)
      // Fallback para localStorage
      const novoBoleto: Boleto = {
        ...boleto,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        dataCriacao: new Date().toISOString()
      }
      
      const boletosExistentes = getLocalStorageData(`boletos_${boleto.usuarioId}`, [])
      const boletosAtualizados = [...boletosExistentes, novoBoleto]
      setLocalStorageData(`boletos_${boleto.usuarioId}`, boletosAtualizados)
      
      console.log('✅ Boleto adicionado ao localStorage:', novoBoleto.nome)
      return novoBoleto
    }
  },

  // Atualizar boleto
  async atualizarBoleto(id: string, updates: Partial<Omit<Boleto, 'id' | 'dataCriacao' | 'usuarioId'>>): Promise<boolean> {
    try {
      const result = await apiRequest('/api/database', {
        method: 'POST',
        body: JSON.stringify({ action: 'atualizarBoleto', id, updates })
      })
      
      if (result.success) {
        console.log('✅ Boleto atualizado no banco local:', id)
        return true
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.warn('API indisponível, usando localStorage:', error)
      // Fallback para localStorage - precisamos encontrar o usuário do boleto
      const allKeys = Object.keys(localStorage).filter(key => key.startsWith('boletos_'))
      
      for (const key of allKeys) {
        const boletos = getLocalStorageData(key, [])
        const indice = boletos.findIndex((boleto: Boleto) => boleto.id === id)
        
        if (indice !== -1) {
          boletos[indice] = { ...boletos[indice], ...updates }
          setLocalStorageData(key, boletos)
          console.log('✅ Boleto atualizado no localStorage:', id)
          return true
        }
      }
      
      console.error('Boleto não encontrado:', id)
      return false
    }
  },

  // Remover boleto
  async removerBoleto(id: string): Promise<boolean> {
    try {
      const result = await apiRequest('/api/database', {
        method: 'POST',
        body: JSON.stringify({ action: 'removerBoleto', id })
      })
      
      if (result.success) {
        // Atualizar localStorage também
        const allKeys = Object.keys(localStorage).filter(key => key.startsWith('boletos_'))
        
        for (const key of allKeys) {
          const boletos = getLocalStorageData(key, [])
          const boletosAtualizados = boletos.filter((boleto: Boleto) => boleto.id !== id)
          
          if (boletos.length !== boletosAtualizados.length) {
            setLocalStorageData(key, boletosAtualizados)
            break
          }
        }
        
        console.log('✅ Boleto removido do banco local:', id)
        return true
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.warn('API indisponível, usando localStorage:', error)
      // Fallback para localStorage - precisamos encontrar o usuário do boleto
      const allKeys = Object.keys(localStorage).filter(key => key.startsWith('boletos_'))
      
      for (const key of allKeys) {
        const boletos = getLocalStorageData(key, [])
        const boletosAtualizados = boletos.filter((boleto: Boleto) => boleto.id !== id)
        
        if (boletos.length !== boletosAtualizados.length) {
          setLocalStorageData(key, boletosAtualizados)
          console.log('✅ Boleto removido do localStorage:', id)
          return true
        }
      }
      
      console.error('Boleto não encontrado para remoção:', id)
      return false
    }
  }
}

// Funções para gerenciar usuários
export const usuariosService = {
  // Buscar usuário por username
  async buscarUsuario(username: string): Promise<Usuario | null> {
    try {
      const result = await apiRequest(`/api/database?action=buscarUsuario&username=${username}`)
      
      if (result.success) {
        // Sincronizar com localStorage
        if (result.data) {
          setLocalStorageData('usuarios', getLocalStorageData('usuarios', []).concat(result.data))
        }
        return result.data
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.warn('API indisponível, usando localStorage:', error)
      // Fallback para localStorage
      const usuarios = getLocalStorageData('usuarios', [
        { id: '1', username: 'aecreboque', password: '123', createdAt: new Date().toISOString() },
        { id: '2', username: 'gabriel', password: 'laranja42', createdAt: new Date().toISOString() }
      ])
      
      const usuario = usuarios.find((u: Usuario) => u.username === username)
      return usuario || null
    }
  },

  // Criar usuário
  async criarUsuario(username: string, password: string): Promise<Usuario | null> {
    try {
      const result = await apiRequest('/api/database', {
        method: 'POST',
        body: JSON.stringify({ action: 'criarUsuario', username, password })
      })
      
      if (result.success) {
        // Atualizar localStorage
        const usuariosExistentes = getLocalStorageData('usuarios', [])
        const usuariosAtualizados = [...usuariosExistentes, result.data]
        setLocalStorageData('usuarios', usuariosAtualizados)
        
        console.log('✅ Usuário criado no banco local:', username)
        return result.data
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.warn('API indisponível, usando localStorage:', error)
      // Fallback para localStorage
      const novoUsuario: Usuario = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        username,
        password,
        createdAt: new Date().toISOString()
      }
      
      const usuariosExistentes = getLocalStorageData('usuarios', [])
      const usuariosAtualizados = [...usuariosExistentes, novoUsuario]
      setLocalStorageData('usuarios', usuariosAtualizados)
      
      console.log('✅ Usuário criado no localStorage:', username)
      return novoUsuario
    }
  }
}

// Função para salvar arquivo na pasta pdfs
export const salvarArquivoPDF = async (arquivo: File, nomeArquivo: string): Promise<string | null> => {
  try {
    console.log('📄 Salvando arquivo:', nomeArquivo)
    
    // Criar FormData para enviar o arquivo
    const formData = new FormData()
    formData.append('action', 'salvarArquivo')
    formData.append('arquivo', arquivo)
    formData.append('nomeArquivo', nomeArquivo)
    
    const response = await fetch('/api/database', {
      method: 'POST',
      body: formData
    })
    
    const result = await response.json()
    
    if (result.success) {
      console.log('✅ Arquivo salvo com sucesso na pasta pdfs:', nomeArquivo)
      return nomeArquivo
    } else {
      console.error('❌ Erro ao salvar arquivo:', result.error)
      return null
    }
  } catch (error) {
    console.error('❌ Erro ao salvar arquivo:', error)
    return null
  }
}

// Função para salvar comprovante na pasta pdfs
export const salvarComprovante = async (arquivo: File, boletoId: string): Promise<string | null> => {
  try {
    const timestamp = Date.now()
    const extensao = arquivo.name.split('.').pop() || ''
    const nomeArquivo = `comprovante_${boletoId}_${timestamp}.${extensao}`
    
    console.log('📄 Salvando comprovante:', nomeArquivo)
    
    // Criar FormData para enviar o arquivo
    const formData = new FormData()
    formData.append('action', 'salvarArquivo')
    formData.append('arquivo', arquivo)
    formData.append('nomeArquivo', nomeArquivo)
    
    const response = await fetch('/api/database', {
      method: 'POST',
      body: formData
    })
    
    const result = await response.json()
    
    if (result.success) {
      console.log('✅ Comprovante salvo com sucesso na pasta pdfs:', nomeArquivo)
      return nomeArquivo
    } else {
      console.error('❌ Erro ao salvar comprovante:', result.error)
      return null
    }
  } catch (error) {
    console.error('❌ Erro ao salvar comprovante:', error)
    return null
  }
}

// Função para abrir arquivo salvo
export const abrirArquivo = (nomeArquivo: string) => {
  try {
    const url = `/api/database?action=abrirArquivo&arquivo=${encodeURIComponent(nomeArquivo)}`
    window.open(url, '_blank')
    console.log('📂 Abrindo arquivo:', nomeArquivo)
  } catch (error) {
    console.error('❌ Erro ao abrir arquivo:', error)
    alert('Erro ao abrir arquivo. Verifique se o arquivo foi salvo corretamente.')
  }
}

// Função para inicializar o banco de dados local
export const inicializarBanco = async () => {
  try {
    console.log('🔧 Inicializando banco de dados local...')
    
    // Tentar inicializar via API
    try {
      const result = await apiRequest('/api/database?action=inicializar')
      if (result.success) {
        console.log('✅ Banco de dados local inicializado via API!')
        console.log('📁 Pasta data/pdfs criada para salvar arquivos!')
        return
      }
    } catch (error) {
      console.warn('API indisponível, usando localStorage:', error)
    }
    
    // Fallback para localStorage
    const usuarios = getLocalStorageData('usuarios', [])
    
    if (usuarios.length === 0) {
      const usuariosDefault = [
        { id: '1', username: 'aecreboque', password: '123', createdAt: new Date().toISOString() },
        { id: '2', username: 'gabriel', password: 'laranja42', createdAt: new Date().toISOString() }
      ]
      
      setLocalStorageData('usuarios', usuariosDefault)
      console.log('👥 Usuários padrão criados no localStorage')
    }
    
    console.log('✅ Banco de dados local inicializado com localStorage!')
    console.log('💾 Dados salvos no navegador (localStorage)')
    console.log('⚠️ Arquivos não podem ser salvos fisicamente no navegador')
    
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados local:', error)
    throw error
  }
}