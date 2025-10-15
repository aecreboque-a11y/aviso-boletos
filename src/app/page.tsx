"use client"

import { useState, useEffect } from 'react'
import { Calendar, FileText, Plus, Check, X, AlertCircle, Upload, Trash2, User, LogOut, Home, Settings, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { boletosService, usuariosService, inicializarBanco, salvarArquivoPDF, abrirArquivo, type Boleto, type Usuario } from '@/lib/local-database'

export default function GerenciadorBoletos() {
  const [usuarioLogado, setUsuarioLogado] = useState<Usuario | null>(null)
  const [telaAtual, setTelaAtual] = useState<'home' | 'adicionar' | 'gerenciar'>('home')
  const [credenciais, setCredenciais] = useState({ username: '', password: '' })
  const [boletos, setBoletos] = useState<Boleto[]>([])
  const [carregando, setCarregando] = useState(true)
  
  // Estados para gerenciar boletos
  const [mesAtual, setMesAtual] = useState(new Date().getMonth())
  const [anoAtual, setAnoAtual] = useState(new Date().getFullYear())
  const [diaEscolhido, setDiaEscolhido] = useState<number | null>(null)
  
  // Estados para adicionar boleto
  const [novoBoleto, setNovoBoleto] = useState({
    nome: '',
    valor: '',
    dataVencimento: '',
    arquivo: null as File | null,
    codigoBarras: ''
  })

  // Inicializar banco de dados e carregar dados
  useEffect(() => {
    const inicializar = async () => {
      try {
        await inicializarBanco()
        
        // Verificar se há usuário logado no localStorage
        const usuarioStorage = localStorage.getItem('usuarioLogado')
        if (usuarioStorage) {
          const usuario = await usuariosService.buscarUsuario(usuarioStorage)
          if (usuario) {
            setUsuarioLogado(usuario)
            await carregarBoletos(usuario.id)
          }
        }
      } catch (error) {
        console.error('Erro ao inicializar:', error)
      } finally {
        setCarregando(false)
      }
    }

    inicializar()
  }, [])

  // Carregar boletos do usuário
  const carregarBoletos = async (usuarioId: string) => {
    try {
      const boletosCarregados = await boletosService.buscarBoletos(usuarioId)
      setBoletos(boletosCarregados)
    } catch (error) {
      console.error('Erro ao carregar boletos:', error)
    }
  }

  // Função de login
  const fazerLogin = async () => {
    try {
      const usuario = await usuariosService.buscarUsuario(credenciais.username)
      
      if (usuario && usuario.password === credenciais.password) {
        setUsuarioLogado(usuario)
        localStorage.setItem('usuarioLogado', usuario.username)
        setCredenciais({ username: '', password: '' })
        await carregarBoletos(usuario.id)
      } else {
        alert('Usuário ou senha incorretos!')
      }
    } catch (error) {
      console.error('Erro no login:', error)
      alert('Erro ao fazer login. Tente novamente.')
    }
  }

  // Função de logout
  const fazerLogout = () => {
    setUsuarioLogado(null)
    setBoletos([])
    localStorage.removeItem('usuarioLogado')
    setTelaAtual('home')
  }

  // Adicionar novo boleto
  const adicionarBoleto = async () => {
    if (!novoBoleto.nome || !novoBoleto.valor || !novoBoleto.dataVencimento || !usuarioLogado) {
      alert('Preencha todos os campos obrigatórios')
      return
    }

    try {
      let nomeArquivo = undefined
      
      // Salvar arquivo se fornecido (qualquer tipo de arquivo)
      if (novoBoleto.arquivo) {
        const timestamp = Date.now()
        const extensao = novoBoleto.arquivo.name.split('.').pop() || ''
        const nomeArquivoCompleto = `${timestamp}_${novoBoleto.arquivo.name}`
        const caminhoSalvo = await salvarArquivoPDF(novoBoleto.arquivo, nomeArquivoCompleto)
        if (caminhoSalvo) {
          nomeArquivo = nomeArquivoCompleto
        }
      }

      const novoBoletoDB = await boletosService.adicionarBoleto({
        nome: novoBoleto.nome,
        valor: parseFloat(novoBoleto.valor),
        dataVencimento: novoBoleto.dataVencimento,
        pago: false,
        arquivo: nomeArquivo,
        codigoBarras: novoBoleto.codigoBarras || undefined,
        usuarioId: usuarioLogado.id
      })

      if (novoBoletoDB) {
        setBoletos([...boletos, novoBoletoDB])
        setNovoBoleto({ nome: '', valor: '', dataVencimento: '', arquivo: null, codigoBarras: '' })
        alert('Boleto adicionado com sucesso!')
      } else {
        alert('Erro ao adicionar boleto. Tente novamente.')
      }
    } catch (error) {
      console.error('Erro ao adicionar boleto:', error)
      alert('Erro ao adicionar boleto. Tente novamente.')
    }
  }

  // Marcar como pago/pendente
  const alternarStatusPagamento = async (id: string) => {
    try {
      const boleto = boletos.find(b => b.id === id)
      if (!boleto) return

      const sucesso = await boletosService.atualizarBoleto(id, { pago: !boleto.pago })
      
      if (sucesso) {
        const boletosAtualizados = boletos.map(b => 
          b.id === id ? { ...b, pago: !b.pago } : b
        )
        setBoletos(boletosAtualizados)
      } else {
        alert('Erro ao atualizar status do boleto.')
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      alert('Erro ao atualizar status do boleto.')
    }
  }

  // Remover boleto
  const removerBoleto = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este boleto?')) return

    try {
      const sucesso = await boletosService.removerBoleto(id)
      
      if (sucesso) {
        const boletosAtualizados = boletos.filter(boleto => boleto.id !== id)
        setBoletos(boletosAtualizados)
      } else {
        alert('Erro ao remover boleto.')
      }
    } catch (error) {
      console.error('Erro ao remover boleto:', error)
      alert('Erro ao remover boleto.')
    }
  }

  // Obter nome do mês
  const obterNomeMes = (mes: number) => {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
    return meses[mes]
  }

  // Obter dias do mês
  const obterDiasDoMes = (mes: number, ano: number) => {
    const diasNoMes = new Date(ano, mes + 1, 0).getDate()
    return Array.from({ length: diasNoMes }, (_, i) => i + 1)
  }

  // Obter boletos do dia específico
  const obterBoletosDoDia = (dia: number) => {
    const dataFormatada = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    return boletos.filter(boleto => boleto.dataVencimento === dataFormatada)
  }

  // Verificar se dia tem boletos
  const diaTemBoletos = (dia: number) => {
    return obterBoletosDoDia(dia).length > 0
  }

  // Formatar data para exibição
  const formatarData = (data: string) => {
    return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')
  }

  // Formatar valor
  const formatarValor = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  // Tela de carregamento
  if (carregando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Inicializando banco de dados local...</p>
        </div>
      </div>
    )
  }

  // Tela de Login
  if (!usuarioLogado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="text-blue-600" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Gerenciador de Boletos</h1>
            <p className="text-gray-600 mt-2">Faça login para continuar</p>
            <p className="text-sm text-green-600 mt-2">💾 Banco de dados local ativo</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Usuário</label>
              <input
                type="text"
                value={credenciais.username}
                onChange={(e) => setCredenciais({...credenciais, username: e.target.value})}
                placeholder="Digite seu usuário"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && fazerLogin()}
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Senha</label>
              <input
                type="password"
                value={credenciais.password}
                onChange={(e) => setCredenciais({...credenciais, password: e.target.value})}
                placeholder="Digite sua senha"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && fazerLogin()}
              />
            </div>

            <button
              onClick={fazerLogin}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 font-medium"
            >
              Entrar
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Header comum para todas as telas
  const Header = () => (
    <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <FileText className="text-blue-600" />
            Gerenciador de Boletos
          </h1>
          <p className="text-gray-600 mt-1">Bem-vindo, {usuarioLogado.username}!</p>
          <p className="text-sm text-green-600">💾 Banco de dados local ativo</p>
        </div>
        <button
          onClick={fazerLogout}
          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </div>
  )

  // Navegação
  const Navegacao = () => (
    <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => setTelaAtual('home')}
          className={`px-6 py-3 rounded-lg transition-all duration-300 flex items-center gap-2 ${
            telaAtual === 'home' 
              ? 'bg-blue-500 text-white shadow-lg' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Home size={20} />
          Página Principal
        </button>
        <button
          onClick={() => setTelaAtual('adicionar')}
          className={`px-6 py-3 rounded-lg transition-all duration-300 flex items-center gap-2 ${
            telaAtual === 'adicionar' 
              ? 'bg-blue-500 text-white shadow-lg' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Plus size={20} />
          Adicionar Boletos
        </button>
        <button
          onClick={() => setTelaAtual('gerenciar')}
          className={`px-6 py-3 rounded-lg transition-all duration-300 flex items-center gap-2 ${
            telaAtual === 'gerenciar' 
              ? 'bg-blue-500 text-white shadow-lg' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Settings size={20} />
          Gerenciar Boletos
        </button>
      </div>
    </div>
  )

  // Tela Principal
  if (telaAtual === 'home') {
    const hoje = new Date().toISOString().split('T')[0]
    const boletosHoje = boletos.filter(boleto => 
      boleto.dataVencimento === hoje && !boleto.pago
    )
    const boletosVencidos = boletos.filter(boleto => 
      boleto.dataVencimento < hoje && !boleto.pago
    )

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto">
          <Header />
          <Navegacao />

          {/* Alertas */}
          {boletosVencidos.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-xl">
              <div className="flex items-center">
                <AlertCircle className="text-red-500 mr-3" />
                <div>
                  <h3 className="text-red-800 font-semibold">
                    {boletosVencidos.length} boleto(s) vencido(s)
                  </h3>
                  <p className="text-red-700">Você tem boletos em atraso que precisam ser pagos.</p>
                </div>
              </div>
            </div>
          )}

          {boletosHoje.length > 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 rounded-r-xl">
              <div className="flex items-center">
                <AlertCircle className="text-yellow-500 mr-3" />
                <div>
                  <h3 className="text-yellow-800 font-semibold">
                    {boletosHoje.length} boleto(s) vencem hoje
                  </h3>
                  <p className="text-yellow-700">Não esqueça de pagar os boletos que vencem hoje!</p>
                </div>
              </div>
            </div>
          )}

          {/* Resumo */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Resumo Geral</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <div className="text-2xl font-bold text-blue-600">{boletos.length}</div>
                <div className="text-blue-800">Total de Boletos</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <div className="text-2xl font-bold text-green-600">
                  {boletos.filter(b => b.pago).length}
                </div>
                <div className="text-green-800">Pagos</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-xl">
                <div className="text-2xl font-bold text-yellow-600">{boletosHoje.length}</div>
                <div className="text-yellow-800">Vencem Hoje</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-xl">
                <div className="text-2xl font-bold text-red-600">{boletosVencidos.length}</div>
                <div className="text-red-800">Vencidos</div>
              </div>
            </div>
          </div>

          {/* Ações Rápidas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div 
              onClick={() => setTelaAtual('adicionar')}
              className="bg-white rounded-2xl shadow-lg p-8 cursor-pointer hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-blue-200"
            >
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="text-blue-600" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Adicionar Boletos</h3>
                <p className="text-gray-600">Cadastre novos boletos com data de vencimento</p>
              </div>
            </div>

            <div 
              onClick={() => setTelaAtual('gerenciar')}
              className="bg-white rounded-2xl shadow-lg p-8 cursor-pointer hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-blue-200"
            >
              <div className="text-center">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="text-green-600" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Gerenciar Boletos</h3>
                <p className="text-gray-600">Visualize e organize por mês e dia</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Tela de Adicionar Boletos
  if (telaAtual === 'adicionar') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <Header />
          <Navegacao />

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Adicionar Novo Boleto</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Nome do Boleto *</label>
                <input
                  type="text"
                  value={novoBoleto.nome}
                  onChange={(e) => setNovoBoleto({...novoBoleto, nome: e.target.value})}
                  placeholder="Ex: Conta de Luz, Financiamento..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Valor *</label>
                <input
                  type="number"
                  step="0.01"
                  value={novoBoleto.valor}
                  onChange={(e) => setNovoBoleto({...novoBoleto, valor: e.target.value})}
                  placeholder="0,00"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Data de Vencimento *</label>
                <input
                  type="date"
                  value={novoBoleto.dataVencimento}
                  onChange={(e) => setNovoBoleto({...novoBoleto, dataVencimento: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Código de Barras (opcional)</label>
                <input
                  type="text"
                  value={novoBoleto.codigoBarras}
                  onChange={(e) => setNovoBoleto({...novoBoleto, codigoBarras: e.target.value})}
                  placeholder="Digite o código de barras"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray-700 font-medium mb-2">Arquivo (PDF, PNG, JPG, etc.) - opcional</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
                    onChange={(e) => setNovoBoleto({...novoBoleto, arquivo: e.target.files?.[0] || null})}
                    className="hidden"
                    id="arquivo-upload"
                  />
                  <label htmlFor="arquivo-upload" className="cursor-pointer">
                    <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                    <p className="text-gray-600">
                      {novoBoleto.arquivo ? novoBoleto.arquivo.name : 'Clique para selecionar o arquivo do boleto'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      O arquivo será salvo na pasta 'data/pdfs' do projeto
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Aceita: PDF, PNG, JPG, GIF, WEBP
                    </p>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setNovoBoleto({ nome: '', valor: '', dataVencimento: '', arquivo: null, codigoBarras: '' })}
                className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Limpar Campos
              </button>
              <button
                onClick={adicionarBoleto}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-300"
              >
                Adicionar Boleto
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Tela de Gerenciar Boletos
  if (telaAtual === 'gerenciar') {
    const diasDoMes = obterDiasDoMes(mesAtual, anoAtual)
    const boletosDoDiaEscolhido = diaEscolhido ? obterBoletosDoDia(diaEscolhido) : []

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto">
          <Header />
          <Navegacao />

          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            {/* Navegação de Mês */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => {
                  if (mesAtual === 0) {
                    setMesAtual(11)
                    setAnoAtual(anoAtual - 1)
                  } else {
                    setMesAtual(mesAtual - 1)
                  }
                  setDiaEscolhido(null)
                }}
                className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              
              <h2 className="text-2xl font-bold text-gray-800">
                {obterNomeMes(mesAtual)} {anoAtual}
              </h2>
              
              <button
                onClick={() => {
                  if (mesAtual === 11) {
                    setMesAtual(0)
                    setAnoAtual(anoAtual + 1)
                  } else {
                    setMesAtual(mesAtual + 1)
                  }
                  setDiaEscolhido(null)
                }}
                className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Grade de Dias */}
            <div className="grid grid-cols-7 gap-2 mb-6">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => (
                <div key={dia} className="text-center font-semibold text-gray-600 p-2">
                  {dia}
                </div>
              ))}
              
              {/* Espaços vazios para o primeiro dia do mês */}
              {Array.from({ length: new Date(anoAtual, mesAtual, 1).getDay() }, (_, i) => (
                <div key={`empty-${i}`} className="p-2"></div>
              ))}
              
              {/* Dias do mês */}
              {diasDoMes.map(dia => {
                const temBoletos = diaTemBoletos(dia)
                const isEscolhido = diaEscolhido === dia
                
                return (
                  <button
                    key={dia}
                    onClick={() => setDiaEscolhido(dia)}
                    className={`p-3 rounded-lg transition-all duration-300 ${
                      isEscolhido
                        ? 'bg-blue-500 text-white shadow-lg'
                        : temBoletos
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="text-center">
                      <div className="font-semibold">{dia}</div>
                      {temBoletos && (
                        <div className="text-xs mt-1">
                          {obterBoletosDoDia(dia).length} boleto(s)
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Boletos do Dia Escolhido */}
            {diaEscolhido && (
              <div className="border-t pt-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  Boletos do dia {diaEscolhido} de {obterNomeMes(mesAtual)}
                </h3>
                
                {boletosDoDiaEscolhido.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="mx-auto mb-2" size={48} />
                    <p>Nenhum boleto para este dia</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {boletosDoDiaEscolhido.map(boleto => {
                      const hoje = new Date().toISOString().split('T')[0]
                      const isVencido = boleto.dataVencimento < hoje && !boleto.pago
                      const isHoje = boleto.dataVencimento === hoje && !boleto.pago
                      
                      return (
                        <div
                          key={boleto.id}
                          className={`border rounded-xl p-4 ${
                            boleto.pago 
                              ? 'border-green-200 bg-green-50' 
                              : isVencido 
                                ? 'border-red-200 bg-red-50' 
                                : isHoje 
                                  ? 'border-yellow-200 bg-yellow-50' 
                                  : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className={`text-lg font-semibold ${boleto.pago ? 'text-green-800 line-through' : 'text-gray-800'}`}>
                                  {boleto.nome}
                                </h4>
                                {boleto.pago && (
                                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                                    Pago
                                  </span>
                                )}
                                {isVencido && (
                                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                                    Vencido
                                  </span>
                                )}
                                {isHoje && (
                                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                                    Vence Hoje
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex flex-col sm:flex-row gap-4 text-gray-600 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-lg text-gray-800">
                                    {formatarValor(boleto.valor)}
                                  </span>
                                </div>
                                {boleto.codigoBarras && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                      Código: {boleto.codigoBarras.substring(0, 20)}...
                                    </span>
                                  </div>
                                )}
                                {boleto.arquivo && (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => abrirArquivo(boleto.arquivo!)}
                                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                                    >
                                      <FileText size={14} />
                                      <span className="text-xs underline">{boleto.arquivo}</span>
                                      <ExternalLink size={12} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => alternarStatusPagamento(boleto.id)}
                                className={`px-3 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 text-sm ${
                                  boleto.pago
                                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    : 'bg-green-500 text-white hover:bg-green-600'
                                }`}
                              >
                                <Check size={14} />
                                {boleto.pago ? 'Pendente' : 'Pagar'}
                              </button>
                              
                              <button
                                onClick={() => removerBoleto(boleto.id)}
                                className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 text-sm"
                              >
                                <Trash2 size={14} />
                                Remover
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}