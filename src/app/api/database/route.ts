import { NextRequest, NextResponse } from 'next/server'
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
const PDFS_DIR = path.join(DATA_DIR, 'pdfs')
const USUARIOS_FILE = path.join(DATA_DIR, 'usuarios.json')
const BOLETOS_FILE = path.join(DATA_DIR, 'boletos.json')

// Função para garantir que as pastas existam
const garantirPastas = async () => {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
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

// Inicializar banco de dados
const inicializarBanco = async () => {
  try {
    await garantirPastas()
    
    const usuarios = await lerArquivoJSON(USUARIOS_FILE, [])
    
    if (usuarios.length === 0) {
      const usuariosDefault = [
        {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          username: 'aecreboque',
          password: '123',
          createdAt: new Date().toISOString()
        },
        {
          id: (Date.now() + 1).toString() + Math.random().toString(36).substr(2, 9),
          username: 'gabriel',
          password: 'laranja42',
          createdAt: new Date().toISOString()
        }
      ]

      await escreverArquivoJSON(USUARIOS_FILE, usuariosDefault)
      console.log('👥 Usuários padrão criados no banco local')
    }

    await lerArquivoJSON(BOLETOS_FILE, [])
    console.log('✅ Banco de dados local inicializado com sucesso!')
    
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados local:', error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const usuarioId = searchParams.get('usuarioId')
  const username = searchParams.get('username')

  try {
    await inicializarBanco()

    if (action === 'buscarBoletos' && usuarioId) {
      const boletos = await lerArquivoJSON(BOLETOS_FILE, [])
      const boletosUsuario = boletos
        .filter((boleto: Boleto) => boleto.usuarioId === usuarioId)
        .sort((a: Boleto, b: Boleto) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime())
      
      return NextResponse.json({ success: true, data: boletosUsuario })
    }

    if (action === 'buscarUsuario' && username) {
      const usuarios = await lerArquivoJSON(USUARIOS_FILE, [])
      const usuario = usuarios.find((u: Usuario) => u.username === username)
      
      return NextResponse.json({ success: true, data: usuario || null })
    }

    if (action === 'inicializar') {
      return NextResponse.json({ success: true, message: 'Banco inicializado' })
    }

    return NextResponse.json({ success: false, error: 'Ação não reconhecida' })
  } catch (error) {
    console.error('Erro na API:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    await inicializarBanco()

    if (action === 'adicionarBoleto') {
      const { boleto } = body
      const boletos = await lerArquivoJSON(BOLETOS_FILE, [])
      
      const novoBoleto: Boleto = {
        ...boleto,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        dataCriacao: new Date().toISOString()
      }

      boletos.push(novoBoleto)
      await escreverArquivoJSON(BOLETOS_FILE, boletos)
      
      return NextResponse.json({ success: true, data: novoBoleto })
    }

    if (action === 'atualizarBoleto') {
      const { id, updates } = body
      const boletos = await lerArquivoJSON(BOLETOS_FILE, [])
      const indice = boletos.findIndex((boleto: Boleto) => boleto.id === id)
      
      if (indice === -1) {
        return NextResponse.json({ success: false, error: 'Boleto não encontrado' })
      }

      boletos[indice] = { ...boletos[indice], ...updates }
      await escreverArquivoJSON(BOLETOS_FILE, boletos)
      
      return NextResponse.json({ success: true })
    }

    if (action === 'removerBoleto') {
      const { id } = body
      const boletos = await lerArquivoJSON(BOLETOS_FILE, [])
      const boletosAtualizados = boletos.filter((boleto: Boleto) => boleto.id !== id)
      
      if (boletos.length === boletosAtualizados.length) {
        return NextResponse.json({ success: false, error: 'Boleto não encontrado' })
      }

      await escreverArquivoJSON(BOLETOS_FILE, boletosAtualizados)
      
      return NextResponse.json({ success: true })
    }

    if (action === 'criarUsuario') {
      const { username, password } = body
      const usuarios = await lerArquivoJSON(USUARIOS_FILE, [])
      
      const novoUsuario: Usuario = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        username,
        password,
        createdAt: new Date().toISOString()
      }

      usuarios.push(novoUsuario)
      await escreverArquivoJSON(USUARIOS_FILE, usuarios)
      
      return NextResponse.json({ success: true, data: novoUsuario })
    }

    return NextResponse.json({ success: false, error: 'Ação não reconhecida' })
  } catch (error) {
    console.error('Erro na API POST:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' })
  }
}