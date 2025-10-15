"use client"

import { promises as fs } from 'fs'
import path from 'path'

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

// Caminhos dos arquivos de dados
const DATA_DIR = path.join(process.cwd(), 'data')
const BOLETOS_DIR = path.join(DATA_DIR, 'boletos')
const PDFS_DIR = path.join(DATA_DIR, 'pdfs')
const USUARIOS_FILE = path.join(DATA_DIR, 'usuarios.json')
const BOLETOS_FILE = path.join(DATA_DIR, 'boletos.json')

// Função para garantir que as pastas existam
const garantirPastas = async () => {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.mkdir(BOLETOS_DIR, { recursive: true })
    await fs.mkdir(PDFS_DIR, { recursive: true })
    console.log('📁 Pastas de dados criadas/verificadas com sucesso!')
  } catch (error) {
    console.error('Erro ao criar pastas:', error)
  }
}

// Função para ler arquivo JSON
const lerArquivoJSON = async (caminho: string, valorPadrao: any = []) => {
  try {
    const dados = await fs.readFile(caminho, 'utf-8')
    return JSON.parse(dados)
  } catch (error) {
    // Se o arquivo não existir, retorna o valor padrão
    return valorPadrao
  }
}

// Função para escrever arquivo JSON
const escreverArquivoJSON = async (caminho: string, dados: any) => {
  try {
    await fs.writeFile(caminho, JSON.stringify(dados, null, 2), 'utf-8')
  } catch (error) {
    console.error('Erro ao escrever arquivo:', error)
    throw error
  }
}

// Funções para gerenciar boletos
export const boletosService = {
  // Buscar todos os boletos de um usuário
  async buscarBoletos(usuarioId: string): Promise<Boleto[]> {
    try {
      const boletos = await lerArquivoJSON(BOLETOS_FILE, [])
      return boletos
        .filter((boleto: Boleto) => boleto.usuarioId === usuarioId)
        .sort((a: Boleto, b: Boleto) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime())
    } catch (error) {
      console.error('Erro ao buscar boletos:', error)
      return []
    }
  },

  // Adicionar novo boleto
  async adicionarBoleto(boleto: Omit<Boleto, 'id' | 'dataCriacao'>): Promise<Boleto | null> {
    try {
      const boletos = await lerArquivoJSON(BOLETOS_FILE, [])
      
      const novoBoleto: Boleto = {
        ...boleto,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        dataCriacao: new Date().toISOString()
      }

      boletos.push(novoBoleto)
      await escreverArquivoJSON(BOLETOS_FILE, boletos)
      
      console.log('✅ Boleto adicionado ao banco local:', novoBoleto.nome)
      return novoBoleto
    } catch (error) {
      console.error('Erro ao adicionar boleto:', error)
      return null
    }
  },

  // Atualizar boleto
  async atualizarBoleto(id: string, updates: Partial<Omit<Boleto, 'id' | 'dataCriacao' | 'usuarioId'>>): Promise<boolean> {
    try {
      const boletos = await lerArquivoJSON(BOLETOS_FILE, [])
      const indice = boletos.findIndex((boleto: Boleto) => boleto.id === id)
      
      if (indice === -1) {
        console.error('Boleto não encontrado:', id)
        return false
      }

      boletos[indice] = { ...boletos[indice], ...updates }
      await escreverArquivoJSON(BOLETOS_FILE, boletos)
      
      console.log('✅ Boleto atualizado no banco local:', id)
      return true
    } catch (error) {
      console.error('Erro ao atualizar boleto:', error)
      return false
    }
  },

  // Remover boleto
  async removerBoleto(id: string): Promise<boolean> {
    try {
      const boletos = await lerArquivoJSON(BOLETOS_FILE, [])
      const boletosAtualizados = boletos.filter((boleto: Boleto) => boleto.id !== id)
      
      if (boletos.length === boletosAtualizados.length) {
        console.error('Boleto não encontrado para remoção:', id)
        return false
      }

      await escreverArquivoJSON(BOLETOS_FILE, boletosAtualizados)
      
      console.log('✅ Boleto removido do banco local:', id)
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
      const usuarios = await lerArquivoJSON(USUARIOS_FILE, [])
      const usuario = usuarios.find((u: Usuario) => u.username === username)
      return usuario || null
    } catch (error) {
      console.error('Erro ao buscar usuário:', error)
      return null
    }
  },

  // Criar usuário
  async criarUsuario(username: string, password: string): Promise<Usuario | null> {
    try {
      const usuarios = await lerArquivoJSON(USUARIOS_FILE, [])
      
      const novoUsuario: Usuario = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        username,
        password,
        createdAt: new Date().toISOString()
      }

      usuarios.push(novoUsuario)
      await escreverArquivoJSON(USUARIOS_FILE, usuarios)
      
      console.log('✅ Usuário criado no banco local:', username)
      return novoUsuario
    } catch (error) {
      console.error('Erro ao criar usuário:', error)
      return null
    }
  }
}

// Função para salvar arquivo PDF
export const salvarArquivoPDF = async (arquivo: File, nomeArquivo: string): Promise<string | null> => {
  try {
    await garantirPastas()
    
    const buffer = await arquivo.arrayBuffer()
    const caminhoArquivo = path.join(PDFS_DIR, nomeArquivo)
    
    await fs.writeFile(caminhoArquivo, Buffer.from(buffer))
    
    console.log('📄 PDF salvo com sucesso:', nomeArquivo)
    return caminhoArquivo
  } catch (error) {
    console.error('Erro ao salvar PDF:', error)
    return null
  }
}

// Função para inicializar o banco de dados local
export const inicializarBanco = async () => {
  try {
    console.log('🔧 Inicializando banco de dados local...')
    
    // Garantir que as pastas existam
    await garantirPastas()
    
    // Verificar se o arquivo de usuários existe, se não, criar com usuários padrão
    const usuarios = await lerArquivoJSON(USUARIOS_FILE, [])
    
    if (usuarios.length === 0) {
      const usuariosDefault = [
        { username: 'aecreboque', password: '123' },
        { username: 'gabriel', password: 'laranja42' }
      ]

      for (const usuario of usuariosDefault) {
        await usuariosService.criarUsuario(usuario.username, usuario.password)
      }
      
      console.log('👥 Usuários padrão criados no banco local')
    }

    // Verificar se o arquivo de boletos existe
    await lerArquivoJSON(BOLETOS_FILE, [])
    
    console.log('✅ Banco de dados local inicializado com sucesso!')
    console.log('📁 Dados salvos em:', DATA_DIR)
    console.log('📄 PDFs salvos em:', PDFS_DIR)
    
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados local:', error)
    throw error
  }
}