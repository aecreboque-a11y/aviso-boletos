import { supabase } from './supabase'

export interface Boleto {
  id: string
  nome: string
  valor: number
  dataVencimento: string
  pago: boolean
  arquivo?: string
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

// Funções para gerenciar boletos
export const boletosService = {
  // Buscar todos os boletos de um usuário
  async buscarBoletos(usuarioId: string): Promise<Boleto[]> {
    try {
      const { data, error } = await supabase
        .from('boletos')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('data_vencimento', { ascending: true })

      if (error) {
        console.error('Erro ao buscar boletos:', error)
        return []
      }

      return data.map(boleto => ({
        id: boleto.id,
        nome: boleto.nome,
        valor: boleto.valor,
        dataVencimento: boleto.data_vencimento,
        pago: boleto.pago,
        arquivo: boleto.arquivo,
        codigoBarras: boleto.codigo_barras,
        dataCriacao: boleto.data_criacao,
        usuarioId: boleto.usuario_id
      }))
    } catch (error) {
      console.error('Erro ao buscar boletos:', error)
      return []
    }
  },

  // Adicionar novo boleto
  async adicionarBoleto(boleto: Omit<Boleto, 'id' | 'dataCriacao'>): Promise<Boleto | null> {
    try {
      const { data, error } = await supabase
        .from('boletos')
        .insert({
          nome: boleto.nome,
          valor: boleto.valor,
          data_vencimento: boleto.dataVencimento,
          pago: boleto.pago,
          arquivo: boleto.arquivo,
          codigo_barras: boleto.codigoBarras,
          usuario_id: boleto.usuarioId,
          data_criacao: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Erro ao adicionar boleto:', error)
        return null
      }

      return {
        id: data.id,
        nome: data.nome,
        valor: data.valor,
        dataVencimento: data.data_vencimento,
        pago: data.pago,
        arquivo: data.arquivo,
        codigoBarras: data.codigo_barras,
        dataCriacao: data.data_criacao,
        usuarioId: data.usuario_id
      }
    } catch (error) {
      console.error('Erro ao adicionar boleto:', error)
      return null
    }
  },

  // Atualizar boleto
  async atualizarBoleto(id: string, updates: Partial<Omit<Boleto, 'id' | 'dataCriacao' | 'usuarioId'>>): Promise<boolean> {
    try {
      const updateData: any = {}
      
      if (updates.nome !== undefined) updateData.nome = updates.nome
      if (updates.valor !== undefined) updateData.valor = updates.valor
      if (updates.dataVencimento !== undefined) updateData.data_vencimento = updates.dataVencimento
      if (updates.pago !== undefined) updateData.pago = updates.pago
      if (updates.arquivo !== undefined) updateData.arquivo = updates.arquivo
      if (updates.codigoBarras !== undefined) updateData.codigo_barras = updates.codigoBarras

      const { error } = await supabase
        .from('boletos')
        .update(updateData)
        .eq('id', id)

      if (error) {
        console.error('Erro ao atualizar boleto:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Erro ao atualizar boleto:', error)
      return false
    }
  },

  // Remover boleto
  async removerBoleto(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('boletos')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Erro ao remover boleto:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Erro ao remover boleto:', error)
      return false
    }
  }
}

// Funções para gerenciar usuários
export const usuariosService = {
  // Buscar usuário por username
  async buscarUsuario(username: string): Promise<Usuario | null> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('username', username)
        .single()

      if (error) {
        console.error('Erro ao buscar usuário:', error)
        return null
      }

      return {
        id: data.id,
        username: data.username,
        password: data.password,
        createdAt: data.created_at
      }
    } catch (error) {
      console.error('Erro ao buscar usuário:', error)
      return null
    }
  },

  // Criar usuário
  async criarUsuario(username: string, password: string): Promise<Usuario | null> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .insert({
          username,
          password,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Erro ao criar usuário:', error)
        return null
      }

      return {
        id: data.id,
        username: data.username,
        password: data.password,
        createdAt: data.created_at
      }
    } catch (error) {
      console.error('Erro ao criar usuário:', error)
      return null
    }
  }
}

// Função para inicializar o banco de dados (criar tabelas se não existirem)
export const inicializarBanco = async () => {
  try {
    // Criar tabela de usuários
    await supabase.rpc('create_usuarios_table_if_not_exists')
    
    // Criar tabela de boletos
    await supabase.rpc('create_boletos_table_if_not_exists')
    
    // Inserir usuários padrão se não existirem
    const usuariosDefault = [
      { username: 'aecreboque', password: '123' },
      { username: 'gabriel', password: 'laranja42' }
    ]

    for (const usuario of usuariosDefault) {
      const usuarioExistente = await usuariosService.buscarUsuario(usuario.username)
      if (!usuarioExistente) {
        await usuariosService.criarUsuario(usuario.username, usuario.password)
      }
    }

    console.log('Banco de dados inicializado com sucesso!')
  } catch (error) {
    console.error('Erro ao inicializar banco de dados:', error)
  }
}