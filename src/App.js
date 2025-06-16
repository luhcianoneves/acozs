import React, { useState, useEffect, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';

// Define o contexto para Firebase
const FirebaseContext = createContext(null);

const App = () => {
    // Estado para controlar a página atual do aplicativo
    const [currentPage, setCurrentPage] = useState('home');
    // Estados para armazenar instâncias do Firebase
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Estado para controlar se o usuário está logado
    const [isLoggedIn, setIsLoggedIn] = useState(false);


    // Estados para o pop-up de mensagem global
    const [showPopup, setShowPopup] = useState(false);
    const [popupMessage, setPopupMessage] = useState('');
    const [popupType, setPopupType] = useState(''); // 'success' or 'error'

    // Função para exibir o pop-up de mensagem
    const handleShowPopup = (message, type) => {
        setPopupMessage(message);
        setPopupType(type);
        setShowPopup(true);
        setTimeout(() => {
            setShowPopup(false);
            setPopupMessage('');
            setPopupType('');
        }, 3000); // Pop-up desaparece após 3 segundos
    };

    useEffect(() => {
        const initializeFirebase = async () => {
            try {
                // Obter __app_id e __firebase_config do ambiente Canvas
                const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
                const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

                if (Object.keys(firebaseConfig).length === 0) {
                    throw new Error("Firebase config not provided.");
                }

                // Inicializar o Firebase App
                const app = initializeApp(firebaseConfig);
                const firestore = getFirestore(app);
                const firebaseAuth = getAuth(app);

                setDb(firestore);
                setAuth(firebaseAuth);

                // Autenticar o usuário
                const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
                if (initialAuthToken) {
                    await signInWithCustomToken(firebaseAuth, initialAuthToken);
                } else {
                    await signInAnonymously(firebaseAuth);
                }

                // Monitorar o estado de autenticação
                const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
                    if (user) {
                        setUserId(user.uid);
                    } else {
                        // Se o usuário deslogar, ou se não houver token, usa um ID anônimo ou UUID
                        setUserId(crypto.randomUUID());
                    }
                    setIsAuthReady(true);
                    setLoading(false);
                });

                return () => unsubscribe(); // Limpeza do listener
            } catch (err) {
                console.error("Erro ao inicializar Firebase:", err);
                setError("Erro ao carregar o aplicativo. Tente novamente mais tarde.");
                setLoading(false);
            }
        };

        initializeFirebase();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#d5cabd' }}>
                <div className="text-xl font-semibold text-gray-700">Carregando ACOZS...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-red-100 text-red-700 p-4 rounded-lg">
                <p>{error}</p>
            </div>
        );
    }

    return (
        // Fornece o contexto do Firebase para todos os componentes filhos
        <FirebaseContext.Provider value={{ db, auth, userId, isAuthReady, handleShowPopup, isLoggedIn, setIsLoggedIn }}>
            <div className="min-h-screen font-inter text-gray-800 p-4 sm:p-6 lg:p-8" style={{ backgroundColor: '#d5cabd' }}>
                {/* Popup de Mensagem */}
                {showPopup && (
                    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 p-4 rounded-lg shadow-lg text-white font-semibold ${popupType === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                        {popupMessage}
                    </div>
                )}

                {/* Renderiza a página de login se não estiver logado, caso contrário, o restante do aplicativo */}
                {!isLoggedIn ? (
                    <LoginPage />
                ) : (
                    <>
                        {/* Cabeçalho do aplicativo */}
                        <header className="mb-8 text-center">
                            <h1 className="text-4xl sm:text-5xl font-extrabold mb-2" style={{ color: '#000000' }}>ACOZS</h1>
                            <p className="text-xl sm:text-2xl" style={{ color: '#000000' }}>Atendimentos Colaboradores para Obreiros - Zona Sul</p>
                            {/* Exibe o userId para fins de colaboração */}
                            {userId && (
                                <p className="text-sm text-gray-600 mt-2">
                                    ID do Usuário: <span className="font-mono bg-gray-200 px-2 py-1 rounded-md">{userId}</span>
                                </p>
                            )}
                        </header>

                        {/* Renderiza a página atual com base no estado */}
                        {currentPage === 'home' && <Home setCurrentPage={setCurrentPage} />}
                        {currentPage === 'cadastrar' && <CadastrarAtendimento setCurrentPage={setCurrentPage} />}
                        {currentPage === 'atualizar' && <AtualizarAtendimento setCurrentPage={setCurrentPage} />}
                        {currentPage === 'verTodos' && <VerTodos setCurrentPage={setCurrentPage} />}
                        {currentPage === 'excluir' && <ExcluirCadastro setCurrentPage={setCurrentPage} />}
                    </>
                )}
            </div>
        </FirebaseContext.Provider>
    );
};

// Componente da Tela de Login
const LoginPage = () => {
    const { setIsLoggedIn, handleShowPopup } = useContext(FirebaseContext);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    // Usuários autorizados
    const authorizedUsers = {
        luhcianoneves: 'luciano8840',
        leticiamoreira: 'leticia8841',
        sarahcastro: 'sarah3108',
        thainarodrigues: 'thaina2850'
    };

    const handleLogin = (e) => {
        e.preventDefault(); // Previne o comportamento padrão do formulário
        setLoginError(''); // Limpa mensagens de erro anteriores

        if (authorizedUsers[username] === password) {
            setIsLoggedIn(true);
            handleShowPopup('Login bem-sucedido!', 'success');
        } else {
            setLoginError('Usuário não identificado.');
            handleShowPopup('Usuário não identificado.', 'error');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen -mt-16"> {/* -mt-16 para centralizar na tela removendo o header invisível */}
            <div className="p-8 rounded-2xl shadow-xl border border-gray-200 w-full max-w-sm" style={{ backgroundColor: '#d5cabd' }}>
                <h2 className="text-3xl font-bold text-center mb-8" style={{ color: '#4e8397' }}>Login ACOZS</h2>
                <form onSubmit={handleLogin}>
                    <div className="mb-4">
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Login:</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Senha:</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                            required
                        />
                    </div>
                    {loginError && (
                        <div className="p-3 mb-4 rounded-lg text-center bg-red-100 text-red-700">
                            {loginError}
                        </div>
                    )}
                    <button
                        type="submit"
                        className="w-full text-white font-semibold py-3 px-6 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-75"
                        style={{ backgroundColor: '#845ec2', '--tw-ring-color': '#845ec2' }}
                    >
                        Entrar
                    </button>
                </form>
            </div>
        </div>
    );
};

// Componente da Tela Inicial
const Home = ({ setCurrentPage }) => {
    return (
        <div className="flex flex-col items-center justify-center p-4">
            <div className="p-8 rounded-2xl shadow-xl border border-gray-200 w-full max-w-md" style={{ backgroundColor: '#d5cabd' }}>
                <h2 className="text-3xl font-bold text-center mb-8" style={{ color: '#4e8397' }}>Menu Principal</h2>
                <div className="space-y-4">
                    {/* Botão Cadastrar Atendimento */}
                    <button
                        onClick={() => setCurrentPage('cadastrar')}
                        className="w-full text-white font-semibold py-3 px-6 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-75"
                        style={{ backgroundColor: '#845ec2', '--tw-ring-color': '#845ec2' }}
                    >
                        Cadastrar Atendimento
                    </button>
                    {/* Botão Atualizar Atendimento */}
                    <button
                        onClick={() => setCurrentPage('atualizar')}
                        className="w-full text-white font-semibold py-3 px-6 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-75"
                        style={{ backgroundColor: '#845ec2', '--tw-ring-color': '#845ec2' }}
                    >
                        Atualizar Atendimento - Setor
                    </button>
                    {/* Botão Ver Todos */}
                    <button
                        onClick={() => setCurrentPage('verTodos')}
                        className="w-full text-white font-semibold py-3 px-6 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-75"
                        style={{ backgroundColor: '#845ec2', '--tw-ring-color': '#845ec2' }}
                    >
                        Ver Todos
                    </button>
                    {/* Novo Botão Excluir Cadastro */}
                    <button
                        onClick={() => setCurrentPage('excluir')}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
                    >
                        Excluir Cadastro
                    </button>
                </div>
            </div>
        </div>
    );
};

// Componente para a tela de Cadastro de Atendimento
const CadastrarAtendimento = ({ setCurrentPage }) => {
    // Acesso ao contexto do Firebase e função de pop-up
    const { db, userId, isAuthReady, handleShowPopup } = useContext(FirebaseContext);

    // Estados para os campos do formulário
    const [nome, setNome] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [dataNascimento, setDataNascimento] = useState('');
    const [cpf, setCpf] = useState('');
    const [estadoCivil, setEstadoCivil] = useState('Solteiro(a)');
    const [sedeRegional, setSedeRegional] = useState('João Dias'); // Atualizado com a nova opção
    const [igreja, setIgreja] = useState('');
    const [declaracaoMenor, setDeclaracaoMenor] = useState('Não precisa - Maior de Idade');
    const [anexos, setAnexos] = useState('Ok');
    const [dataAtendimento, setDataAtendimento] = useState('');
    const [observacoes, setObservacoes] = useState('');
    const [message, setMessage] = useState(''); // Para exibir mensagens de sucesso/erro
    const [messageType, setMessageType] = useState(''); // 'success' or 'error'

    // Opções para os campos de seleção
    const estadoCivilOptions = ["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viuvo(a)", "Em processo de Divórcio"];
    const sedeRegionalOptions = [
        "João Dias", "Bonfiglioli", "Campo Limpo", "Capão Redondo", "Céu Azul", "Cidade Ademar", "Diadema",
        "Embu das Artes", "Grajau", "Itaim Bibi", "Itapecerica", "Jardim Capela", "Jardim Thomaz",
        "Paraisopolis", "Parelheiros", "Pq. Sto. Antônio", "Pedreira", "Pirajussara", "Promotor",
        "Rio Bonito", "Taboão da Serra", "Valo Velho", "Vila das Mercês", "Vila Misisonária", "Vila São José"
    ];
    const declaracaoMenorOptions = ["Entregue", "Não precisa - Maior de Idade"];
    const anexosOptions = ["Ok", "Falta regularizar"];

    // Função para calcular a idade
    const calcularIdade = (dataNasc) => {
        if (!dataNasc) return 0;
        const hoje = new Date();
        const nasc = new Date(dataNasc);
        let idade = hoje.getFullYear() - nasc.getFullYear();
        const mes = hoje.getMonth() - nasc.getMonth();
        if (mes < 0 || (mes === 0 && hoje.getDate() < nasc.getDate())) {
            idade--;
        }
        return idade;
    };

    // Função para limpar o formulário
    const resetForm = () => {
        setNome('');
        setWhatsapp('');
        setDataNascimento('');
        setCpf('');
        setEstadoCivil('Solteiro(a)');
        setSedeRegional('João Dias');
        setIgreja('');
        setDeclaracaoMenor('Não precisa - Maior de Idade');
        setAnexos('Ok');
        setDataAtendimento('');
        setObservacoes('');
    };

    // Função para salvar o atendimento no Firestore
    const handleSaveAtendimento = async () => {
        if (!isAuthReady || !db) {
            setMessage('Firebase não está pronto. Por favor, aguarde.');
            setMessageType('error');
            return;
        }

        // Validação básica dos campos
        if (!nome || !whatsapp || !dataNascimento || !cpf || !dataAtendimento) {
            setMessage('Por favor, preencha todos os campos obrigatórios.');
            setMessageType('error');
            return;
        }

        const idadeCalculada = calcularIdade(dataNascimento);

        try {
            // Caminho da coleção (dados públicos dentro do aplicativo)
            const atendimentosCollectionRef = collection(db, `artifacts/${__app_id}/public/data/atendimentos`);

            await addDoc(atendimentosCollectionRef, {
                nome,
                whatsapp,
                dataNascimento,
                idade: idadeCalculada,
                cpf,
                estadoCivil,
                sedeRegional,
                igreja,
                declaracaoMenor,
                anexos,
                dataAtendimento,
                observacoesCadastro: observacoes,
                atendimentoRealizado: 'Não informado', // Valor inicial para Atualizar Atendimento
                situacao: 'Não informado', // Valor inicial para Atualizar Atendimento
                observacoesAtendimento: '', // Valor inicial para Atualizar Atendimento
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: userId // Registra quem criou o atendimento
            });

            handleShowPopup('Cadastro criado com Sucesso!', 'success');
            resetForm(); // Limpa o formulário após o sucesso
            setCurrentPage('home'); // Redireciona para a tela inicial
        } catch (e) {
            console.error("Erro ao adicionar documento: ", e);
            setMessage(`Erro ao cadastrar atendimento: ${e.message}`);
            setMessageType('error');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-4">
            <div className="p-8 rounded-2xl shadow-xl border border-gray-200 w-full max-w-2xl" style={{ backgroundColor: '#d5cabd' }}>
                <h2 className="text-3xl font-bold text-center mb-8" style={{ color: '#4e8397' }}>Cadastrar Atendimento</h2>

                {/* Mensagens de feedback */}
                {message && (
                    <div className={`p-3 mb-4 rounded-lg text-center ${messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message}
                    </div>
                )}

                {/* Campos do formulário */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">Nome:</label>
                        <input
                            type="text"
                            id="nome"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                            placeholder="Nome completo do atendido"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 mb-1">WhatsApp:</label>
                        <input
                            type="number"
                            id="whatsapp"
                            value={whatsapp}
                            onChange={(e) => setWhatsapp(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                            placeholder="Ex: 5511999999999"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="dataNascimento" className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento:</label>
                        <input
                            type="date"
                            id="dataNascimento"
                            value={dataNascimento}
                            onChange={(e) => setDataNascimento(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                            required
                        />
                        {dataNascimento && (
                            <p className="mt-1 text-sm text-gray-600">Idade: {calcularIdade(dataNascimento)} anos</p>
                        )}
                    </div>
                    <div>
                        <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-1">CPF:</label>
                        <input
                            type="number"
                            id="cpf"
                            value={cpf}
                            onChange={(e) => setCpf(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                            placeholder="Somente números"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="estadoCivil" className="block text-sm font-medium text-gray-700 mb-1">Estado Civil:</label>
                        <select
                            id="estadoCivil"
                            value={estadoCivil}
                            onChange={(e) => setEstadoCivil(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 shadow-sm bg-white"
                        >
                            {estadoCivilOptions.map(option => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="sedeRegional" className="block text-sm font-medium text-gray-700 mb-1">Sede Regional:</label>
                        <select
                            id="sedeRegional"
                            value={sedeRegional}
                            onChange={(e) => setSedeRegional(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 shadow-sm bg-white"
                        >
                            {sedeRegionalOptions.map(option => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="igreja" className="block text-sm font-medium text-gray-700 mb-1">Igreja:</label>
                        <input
                            type="text"
                            id="igreja"
                            value={igreja}
                            onChange={(e) => setIgreja(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                            placeholder="Nome da igreja ou congregação"
                        />
                    </div>
                    <div>
                        <label htmlFor="declaracaoMenor" className="block text-sm font-medium text-gray-700 mb-1">Declaração de Menor:</label>
                        <select
                            id="declaracaoMenor"
                            value={declaracaoMenor}
                            onChange={(e) => setDeclaracaoMenor(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 shadow-sm bg-white"
                        >
                            {declaracaoMenorOptions.map(option => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="anexos" className="block text-sm font-medium text-gray-700 mb-1">Anexos:</label>
                        <select
                            id="anexos"
                            value={anexos}
                            onChange={(e) => setAnexos(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 shadow-sm bg-white"
                        >
                            {anexosOptions.map(option => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="dataAtendimento" className="block text-sm font-medium text-gray-700 mb-1">Data em que será atendido:</label>
                        <input
                            type="date"
                            id="dataAtendimento"
                            value={dataAtendimento}
                            onChange={(e) => setDataAtendimento(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                            required
                        />
                    </div>
                </div>
                <div className="mb-6">
                    <label htmlFor="observacoes" className="block text-sm font-medium text-gray-700 mb-1">Observações (máx. 500 caracteres):</label>
                    <textarea
                        id="observacoes"
                        value={observacoes}
                        onChange={(e) => setObservacoes(e.target.value)}
                        maxLength="500"
                        rows="4"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 shadow-sm resize-y"
                        placeholder="Informações adicionais sobre o atendimento..."
                    ></textarea>
                    <p className="text-right text-sm text-gray-500">{observacoes.length}/500</p>
                </div>

                {/* Botões de ação */}
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <button
                        onClick={handleSaveAtendimento}
                        className="text-white font-semibold py-3 px-8 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-75"
                        style={{ backgroundColor: '#845ec2', '--tw-ring-color': '#845ec2' }}
                    >
                        Salvar
                    </button>
                    <button
                        onClick={() => setCurrentPage('home')}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-8 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75"
                    >
                        Voltar
                    </button>
                </div>
            </div>
        </div>
    );
};

// Componente para a tela de Atualização de Atendimento
const AtualizarAtendimento = ({ setCurrentPage }) => {
    // Acesso ao contexto do Firebase e função de pop-up
    const { db, isAuthReady, handleShowPopup } = useContext(FirebaseContext);

    // Estados para os atendimentos e o atendimento selecionado
    const [atendimentos, setAtendimentos] = useState([]);
    const [selectedAtendimentoId, setSelectedAtendimentoId] = useState('');
    const [selectedAtendimento, setSelectedAtendimento] = useState(null);

    // Estados para os campos de atualização
    const [atendimentoRealizado, setAtendimentoRealizado] = useState('');
    const [situacao, setSituacao] = useState('');
    const [observacoesAtendimento, setObservacoesAtendimento] = useState('');
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    // Opções para os campos de seleção
    const atendimentoRealizadoOptions = ["Sim", "Precisa Remarcar", "Cancelado"];
    const situacaoOptions = ["Aprovado", "Reprovado", "Aguardando Resposta"];

    // Efeito para carregar todos os atendimentos ao montar o componente
    useEffect(() => {
        if (!isAuthReady || !db) return;

        const atendimentosCollectionRef = collection(db, `artifacts/${__app_id}/public/data/atendimentos`);
        const q = query(atendimentosCollectionRef); // Não usa orderBy aqui para evitar erros de índice

        // Listener em tempo real para os atendimentos
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedAtendimentos = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Ordenar atendimentos em memória
            fetchedAtendimentos.sort((a, b) => {
                const sedeComparison = a.sedeRegional.localeCompare(b.sedeRegional);
                if (sedeComparison !== 0) return sedeComparison;
                return a.nome.localeCompare(b.nome);
            });

            setAtendimentos(fetchedAtendimentos);
        }, (error) => {
            console.error("Erro ao buscar atendimentos:", error);
            setMessage('Erro ao carregar atendimentos.');
            setMessageType('error');
        });

        return () => unsubscribe(); // Limpeza do listener
    }, [db, isAuthReady]);

    // Efeito para carregar os dados do atendimento selecionado
    useEffect(() => {
        if (selectedAtendimentoId) {
            const atendimento = atendimentos.find(att => att.id === selectedAtendimentoId);
            setSelectedAtendimento(atendimento);
            if (atendimento) {
                // Preencher os campos de atualização com os valores existentes (se houver)
                setAtendimentoRealizado(atendimento.atendimentoRealizado || '');
                setSituacao(atendimento.situacao || '');
                setObservacoesAtendimento(atendimento.observacoesAtendimento || '');
            }
        } else {
            setSelectedAtendimento(null);
            setAtendimentoRealizado('');
            setSituacao('');
            setObservacoesAtendimento('');
        }
    }, [selectedAtendimentoId, atendimentos]);

    // Função para atualizar o atendimento no Firestore
    const handleUpdateAtendimento = async () => {
        if (!selectedAtendimentoId) {
            setMessage('Por favor, selecione um atendimento para atualizar.');
            setMessageType('error');
            return;
        }

        if (!isAuthReady || !db) {
            setMessage('Firebase não está pronto. Por favor, aguarde.');
            setMessageType('error');
            return;
        }

        try {
            const atendimentoRef = doc(db, `artifacts/${__app_id}/public/data/atendimentos`, selectedAtendimentoId);
            await updateDoc(atendimentoRef, {
                atendimentoRealizado,
                situacao,
                observacoesAtendimento,
                updatedAt: new Date()
            });

            handleShowPopup('Cadastro atualizado com Sucesso!', 'success');
            setCurrentPage('home'); // Redireciona para a tela inicial
        } catch (e) {
            console.error("Erro ao atualizar documento: ", e);
            setMessage(`Erro ao atualizar atendimento: ${e.message}`);
            setMessageType('error');
        }
    };

    const calcularIdade = (dataNasc) => {
        if (!dataNasc) return 'N/A';
        const hoje = new Date();
        const nasc = new Date(dataNasc);
        let idade = hoje.getFullYear() - nasc.getFullYear();
        const mes = hoje.getMonth() - nasc.getMonth();
        if (mes < 0 || (mes === 0 && hoje.getDate() < nasc.getDate())) {
            idade--;
        }
        return idade;
    };

    return (
        <div className="flex flex-col items-center justify-center p-4">
            <div className="p-8 rounded-2xl shadow-xl border border-gray-200 w-full max-w-2xl" style={{ backgroundColor: '#d5cabd' }}>
                <h2 className="text-3xl font-bold text-center mb-8" style={{ color: '#4e8397' }}>Atualizar Atendimento - Setor</h2>

                {/* Mensagens de feedback */}
                {message && (
                    <div className={`p-3 mb-4 rounded-lg text-center ${messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message}
                    </div>
                )}

                {/* Campo de seleção de atendimento */}
                <div className="mb-6">
                    <label htmlFor="selectAtendimento" className="block text-sm font-medium text-gray-700 mb-1">
                        Selecionar Atendimento:
                    </label>
                    <select
                        id="selectAtendimento"
                        value={selectedAtendimentoId}
                        onChange={(e) => setSelectedAtendimentoId(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm bg-white"
                    >
                        <option value="">-- Selecione um atendimento --</option>
                        {atendimentos.map(att => (
                            <option key={att.id} value={att.id}>
                                {att.nome} ({att.sedeRegional})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Exibição dos dados do atendimento selecionado (somente leitura) */}
                {selectedAtendimento && (
                    <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200 shadow-inner">
                        <h3 className="text-xl font-semibold text-gray-800 mb-4">Dados da Ficha:</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            <p><strong className="text-gray-700">Nome:</strong> {selectedAtendimento.nome}</p>
                            <p><strong className="text-gray-700">WhatsApp:</strong> {selectedAtendimento.whatsapp}</p>
                            <p><strong className="text-gray-700">Nascimento:</strong> {selectedAtendimento.dataNascimento} (Idade: {calcularIdade(selectedAtendimento.dataNascimento)})</p>
                            <p><strong className="text-gray-700">CPF:</strong> {selectedAtendimento.cpf}</p>
                            <p><strong className="text-gray-700">Estado Civil:</strong> {selectedAtendimento.estadoCivil}</p>
                            <p><strong className="text-gray-700">Sede Regional:</strong> {selectedAtendimento.sedeRegional}</p>
                            <p><strong className="text-gray-700">Igreja:</strong> {selectedAtendimento.igreja}</p>
                            <p><strong className="text-gray-700">Declaração de Menor:</strong> {selectedAtendimento.declaracaoMenor}</p>
                            <p><strong className="text-gray-700">Anexos:</strong> {selectedAtendimento.anexos}</p>
                            <p><strong className="text-gray-700">Data Atendimento:</strong> {selectedAtendimento.dataAtendimento}</p>
                            <div className="col-span-1 sm:col-span-2">
                                <p className="text-gray-700 font-medium mt-2">Observações de Cadastro:</p>
                                <p className="text-gray-600 bg-gray-100 p-2 rounded-md border border-gray-200">{selectedAtendimento.observacoesCadastro || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Campos de atualização */}
                {selectedAtendimento && (
                    <>
                        <div className="mb-6">
                            <label htmlFor="atendimentoRealizado" className="block text-sm font-medium text-gray-700 mb-1">
                                O atendimento já foi realizado?
                            </label>
                            <select
                                id="atendimentoRealizado"
                                value={atendimentoRealizado}
                                onChange={(e) => setAtendimentoRealizado(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm bg-white"
                            >
                                <option value="">-- Selecione --</option>
                                {atendimentoRealizadoOptions.map(option => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>
                        <div className="mb-6">
                            <label htmlFor="situacao" className="block text-sm font-medium text-gray-700 mb-1">Situação:</label>
                            <select
                                id="situacao"
                                value={situacao}
                                onChange={(e) => setSituacao(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm bg-white"
                            >
                                <option value="">-- Selecione --</option>
                                {situacaoOptions.map(option => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>
                        <div className="mb-6">
                            <label htmlFor="observacoesAtendimento" className="block text-sm font-medium text-gray-700 mb-1">
                                Observações descritas do Atendimento (máx. 500 caracteres):
                            </label>
                            <textarea
                                id="observacoesAtendimento"
                                value={observacoesAtendimento}
                                onChange={(e) => setObservacoesAtendimento(e.target.value)}
                                maxLength="500"
                                rows="4"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm resize-y"
                                placeholder="Descreva o resultado do atendimento..."
                            ></textarea>
                            <p className="text-right text-sm text-gray-500">{observacoesAtendimento.length}/500</p>
                        </div>

                        {/* Botões de ação */}
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <button
                                onClick={handleUpdateAtendimento}
                                className="text-white font-semibold py-3 px-8 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-75"
                                style={{ backgroundColor: '#4e8397', '--tw-ring-color': '#4e8397' }}
                            >
                                Salvar Atualização
                            </button>
                            <button
                                onClick={() => setCurrentPage('home')}
                                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-8 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75"
                            >
                                Voltar
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// Componente para a tela "Ver Todos" e exportação para PDF
const VerTodos = ({ setCurrentPage }) => {
    // Acesso ao contexto do Firebase
    const { db, isAuthReady } = useContext(FirebaseContext);
    const [atendimentos, setAtendimentos] = useState([]);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    // Efeito para carregar todos os atendimentos ao montar o componente
    useEffect(() => {
        if (!isAuthReady || !db) return;

        const atendimentosCollectionRef = collection(db, `artifacts/${__app_id}/public/data/atendimentos`);
        const q = query(atendimentosCollectionRef);

        // Listener em tempo real para os atendimentos
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedAtendimentos = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Ordenar atendimentos em memória: primeiro por Sede Regional, depois por Nome
            fetchedAtendimentos.sort((a, b) => {
                const sedeComparison = a.sedeRegional.localeCompare(b.sedeRegional);
                if (sedeComparison !== 0) return sedeComparison;
                return a.nome.localeCompare(b.nome);
            });

            setAtendimentos(fetchedAtendimentos);
        }, (error) => {
            console.error("Erro ao buscar atendimentos:", error);
            setMessage('Erro ao carregar atendimentos.');
            setMessageType('error');
        });

        return () => unsubscribe();
    }, [db, isAuthReady]);

    // Função para calcular a idade
    const calcularIdade = (dataNasc) => {
        if (!dataNasc) return 'N/A';
        const hoje = new Date();
        const nasc = new Date(dataNasc);
        let idade = hoje.getFullYear() - nasc.getFullYear();
        const mes = hoje.getMonth() - nasc.getMonth();
        if (mes < 0 || (mes === 0 && hoje.getDate() < nasc.getDate())) {
            idade--;
        }
        return idade;
    };

    // Função para exportar para PDF
    const exportToPdf = () => {
        if (atendimentos.length === 0) {
            setMessage('Não há atendimentos para exportar.');
            setMessageType('error');
            return;
        }

        // Importar jsPDF e jspdf-autotable dinamicamente
        const scriptJsPDF = document.createElement('script');
        scriptJsPDF.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        scriptJsPDF.onload = () => {
            const scriptAutoTable = document.createElement('script');
            scriptAutoTable.src = "https://unpkg.com/jspdf-autotable@3.5.23/dist/jspdf.plugin.autotable.js";
            scriptAutoTable.onload = () => {
                const { jsPDF } = window.jspdf;
                // Definindo a orientação para 'landscape' (paisagem)
                const doc = new jsPDF('l', 'mm', 'a4');

                const headers = [
                    ['Nome', 'Sede Regional', 'WhatsApp', 'Nasc. (Idade)', 'CPF', 'Estado Civil', 'Igreja',
                     'Decl. Menor', 'Anexos', 'Data Atendimento', 'Status', 'Situação', 'Obs. Atendimento']
                ];

                const data = atendimentos.map(att => [
                    att.nome,
                    att.sedeRegional,
                    att.whatsapp,
                    `${att.dataNascimento} (${calcularIdade(att.dataNascimento)})`,
                    att.cpf,
                    att.estadoCivil,
                    att.igreja,
                    att.declaracaoMenor,
                    att.anexos,
                    att.dataAtendimento,
                    att.atendimentoRealizado || 'N/A',
                    att.situacao || 'N/A',
                    att.observacoesAtendimento || 'N/A'
                ]);

                // Adiciona o cabeçalho e informações gerais
                doc.setFontSize(18);
                doc.text("Relatório de Atendimentos ACOZS", 14, 20);
                doc.setFontSize(10);
                doc.text(`Data de Geração: ${new Date().toLocaleDateString()}`, 14, 28);
                doc.text(`Total de Atendimentos: ${atendimentos.length}`, 14, 34);

                // Adiciona a tabela
                doc.autoTable({
                    startY: 40,
                    head: headers,
                    body: data,
                    theme: 'striped', // Estilo da tabela
                    headStyles: { fillColor: [67, 56, 202], textColor: [255, 255, 255], fontStyle: 'bold' }, // Estilo do cabeçalho
                    styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak' }, // Reduz o tamanho da fonte e o padding para caber mais
                    columnStyles: {
                        0: { cellWidth: 20 }, // Nome
                        1: { cellWidth: 20 }, // Sede Regional
                        2: { cellWidth: 20 }, // WhatsApp
                        3: { cellWidth: 20 }, // Nascimento (Idade)
                        4: { cellWidth: 15 }, // CPF
                        5: { cellWidth: 18 }, // Estado Civil
                        6: { cellWidth: 20 }, // Igreja
                        7: { cellWidth: 18 }, // Decl. Menor
                        8: { cellWidth: 12 }, // Anexos
                        9: { cellWidth: 20 }, // Data Atendimento
                        10: { cellWidth: 15 }, // Status
                        11: { cellWidth: 15 }, // Situação
                        12: { cellWidth: 40 }  // Obs. Atendimento
                    },
                    margin: { top: 10, right: 10, bottom: 10, left: 10 },
                    didParseCell: function (data) {
                        // Centraliza o texto nas colunas específicas
                        if ([1, 3, 4, 5, 6, 7, 8, 9, 10, 11].includes(data.column.index)) {
                            data.cell.styles.halign = 'center';
                        }
                    }
                });

                doc.save('relatorio_atendimentos_acozs.pdf');
                setMessage('PDF exportado com sucesso!');
                setMessageType('success');
            };
            document.body.appendChild(scriptAutoTable);
        };
        document.body.appendChild(scriptJsPDF);
    };

    return (
        <div className="flex flex-col items-center p-4">
            <div className="p-8 rounded-2xl shadow-xl border border-gray-200 w-full max-w-4xl" style={{ backgroundColor: '#d5cabd' }}>
                <h2 className="text-3xl font-bold text-center mb-8" style={{ color: '#4e8397' }}>Todos os Atendimentos</h2>

                {/* Mensagens de feedback */}
                {message && (
                    <div className={`p-3 mb-4 rounded-lg text-center ${messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message}
                    </div>
                )}

                {/* Tabela de atendimentos */}
                {atendimentos.length === 0 ? (
                    <p className="text-center text-gray-600">Nenhum atendimento cadastrado ainda.</p>
                ) : (
                    <div className="overflow-x-auto rounded-lg shadow-md mb-6 border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="text-white" style={{ backgroundColor: '#845ec2' }}>
                                <tr>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Nome</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Sede Regional</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">WhatsApp</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Nascimento (Idade)</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">CPF</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Estado Civil</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Igreja</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Decl. Menor</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Anexos</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Data Atendimento</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Atend. Realizado</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Situação</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Obs. Atendimento</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {atendimentos.map(att => (
                                    <tr key={att.id}>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{att.nome}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{att.sedeRegional}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{att.whatsapp}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                            {att.dataNascimento} ({calcularIdade(att.dataNascimento)})
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{att.cpf}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{att.estadoCivil}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{att.igreja}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{att.declaracaoMenor}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{att.anexos}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{att.dataAtendimento}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{att.atendimentoRealizado || 'N/A'}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{att.situacao || 'N/A'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">{att.observacoesAtendimento || 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Botões de ação */}
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <button
                        onClick={() => setCurrentPage('home')}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-8 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75"
                    >
                        Voltar para Tela Inicial
                    </button>
                    <button
                        onClick={exportToPdf}
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75"
                    >
                        Exportar para PDF
                    </button>
                </div>
            </div>
        </div>
    );
};

// Componente para a tela de Excluir Cadastro
const ExcluirCadastro = ({ setCurrentPage }) => {
    const { db, isAuthReady, handleShowPopup } = useContext(FirebaseContext);
    const [atendimentos, setAtendimentos] = useState([]);
    const [selectedAtendimentoId, setSelectedAtendimentoId] = useState('');
    const [selectedAtendimento, setSelectedAtendimento] = useState(null);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    useEffect(() => {
        if (!isAuthReady || !db) return;

        const atendimentosCollectionRef = collection(db, `artifacts/${__app_id}/public/data/atendimentos`);
        const q = query(atendimentosCollectionRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedAtendimentos = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            fetchedAtendimentos.sort((a, b) => {
                const sedeComparison = a.sedeRegional.localeCompare(b.sedeRegional);
                if (sedeComparison !== 0) return sedeComparison;
                return a.nome.localeCompare(b.nome);
            });
            setAtendimentos(fetchedAtendimentos);
        }, (error) => {
            console.error("Erro ao buscar atendimentos:", error);
            setMessage('Erro ao carregar atendimentos.');
            setMessageType('error');
        });

        return () => unsubscribe();
    }, [db, isAuthReady]);

    useEffect(() => {
        if (selectedAtendimentoId) {
            const atendimento = atendimentos.find(att => att.id === selectedAtendimentoId);
            setSelectedAtendimento(atendimento);
        } else {
            setSelectedAtendimento(null);
        }
    }, [selectedAtendimentoId, atendimentos]);

    const calcularIdade = (dataNasc) => {
        if (!dataNasc) return 'N/A';
        const hoje = new Date();
        const nasc = new Date(dataNasc);
        let idade = hoje.getFullYear() - nasc.getFullYear();
        const mes = hoje.getMonth() - nasc.getMonth();
        if (mes < 0 || (mes === 0 && hoje.getDate() < nasc.getDate())) {
            idade--;
        }
        return idade;
    };

    const handleDeleteAtendimento = async () => {
        if (!selectedAtendimentoId) {
            setMessage('Por favor, selecione um atendimento para excluir.');
            setMessageType('error');
            return;
        }

        if (!isAuthReady || !db) {
            setMessage('Firebase não está pronto. Por favor, aguarde.');
            setMessageType('error');
            return;
        }

        try {
            const atendimentoRef = doc(db, `artifacts/${__app_id}/public/data/atendimentos`, selectedAtendimentoId);
            await deleteDoc(atendimentoRef);

            handleShowPopup('Cadastro excluído com Sucesso!', 'success');
            setSelectedAtendimentoId(''); // Limpa a seleção
            setSelectedAtendimento(null); // Limpa os dados exibidos
            setCurrentPage('home'); // Redireciona para a tela inicial
        } catch (e) {
            console.error("Erro ao excluir documento: ", e);
            setMessage(`Erro ao excluir atendimento: ${e.message}`);
            setMessageType('error');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-4">
            <div className="p-8 rounded-2xl shadow-xl border border-gray-200 w-full max-w-2xl" style={{ backgroundColor: '#d5cabd' }}>
                <h2 className="text-3xl font-bold text-center mb-8" style={{ color: '#4e8397' }}>Excluir Cadastro</h2>

                {message && (
                    <div className={`p-3 mb-4 rounded-lg text-center ${messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message}
                    </div>
                )}

                <div className="mb-6">
                    <label htmlFor="selectAtendimentoExcluir" className="block text-sm font-medium text-gray-700 mb-1">
                        Selecionar Atendimento para Excluir:
                    </label>
                    <select
                        id="selectAtendimentoExcluir"
                        value={selectedAtendimentoId}
                        onChange={(e) => setSelectedAtendimentoId(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 shadow-sm bg-white"
                    >
                        <option value="">-- Selecione um atendimento --</option>
                        {atendimentos.map(att => (
                            <option key={att.id} value={att.id}>
                                {att.nome} ({att.sedeRegional})
                            </option>
                        ))}
                    </select>
                </div>

                {selectedAtendimento && (
                    <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200 shadow-inner">
                        <h3 className="text-xl font-semibold text-gray-800 mb-4">Dados da Ficha:</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            <p><strong className="text-gray-700">Nome:</strong> {selectedAtendimento.nome}</p>
                            <p><strong className="text-gray-700">WhatsApp:</strong> {selectedAtendimento.whatsapp}</p>
                            <p><strong className="text-gray-700">Nascimento:</strong> {selectedAtendimento.dataNascimento} (Idade: {calcularIdade(selectedAtendimento.dataNascimento)})</p>
                            <p><strong className="text-gray-700">CPF:</strong> {selectedAtendimento.cpf}</p>
                            <p><strong className="text-gray-700">Estado Civil:</strong> {selectedAtendimento.estadoCivil}</p>
                            <p><strong className="text-gray-700">Sede Regional:</strong> {selectedAtendimento.sedeRegional}</p>
                            <p><strong className="text-gray-700">Igreja:</strong> {selectedAtendimento.igreja}</p>
                            <p><strong className="text-gray-700">Declaração de Menor:</strong> {selectedAtendimento.declaracaoMenor}</p>
                            <p><strong className="text-gray-700">Anexos:</strong> {selectedAtendimento.anexos}</p>
                            <p><strong className="text-gray-700">Data Atendimento:</strong> {selectedAtendimento.dataAtendimento}</p>
                            <div className="col-span-1 sm:col-span-2">
                                <p className="text-gray-700 font-medium mt-2">Observações de Cadastro:</p>
                                <p className="text-gray-600 bg-gray-100 p-2 rounded-md border border-gray-200">{selectedAtendimento.observacoesCadastro || 'N/A'}</p>
                            </div>
                            <div className="col-span-1 sm:col-span-2">
                                <p className="text-gray-700 font-medium mt-2">Status do Atendimento:</p>
                                <p className="text-gray-600 bg-gray-100 p-2 rounded-md border border-gray-200">
                                    Realizado: {selectedAtendimento.atendimentoRealizado || 'N/A'},
                                    Situação: {selectedAtendimento.situacao || 'N/A'}
                                </p>
                                <p className="text-gray-700 font-medium mt-2">Observações do Atendimento:</p>
                                <p className="text-gray-600 bg-gray-100 p-2 rounded-md border border-gray-200">{selectedAtendimento.observacoesAtendimento || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="flex justify-center mt-6">
                            <button
                                onClick={handleDeleteAtendimento}
                                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-8 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm2 3a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zm0 3a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z" clipRule="evenodd" />
                                </svg>
                                <span>Excluir</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Botão Voltar para Tela Inicial */}
                <div className="flex justify-center mt-6">
                    <button
                        onClick={() => setCurrentPage('home')}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-8 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75"
                    >
                        Voltar para Tela Inicial
                    </button>
                </div>
            </div>
        </div>
    );
};

export default App;
