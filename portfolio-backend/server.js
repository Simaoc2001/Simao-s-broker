const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'simao_broker_super_secret_jwt_key_987';

// Middleware
app.use(cors());
app.use(express.json());

// Configuração do MongoDB
mongoose.set('bufferCommands', false); // Desativar buffering de comandos quando desconectado

const jsonFilePath = path.join(__dirname, 'database-fallback.json');
let useJsonFallback = false;

// --- FUNÇÕES AUXILIARES DE FALLBACK DE BASE DE DADOS MOCK / JSON ---

async function initJsonDatabase() {
  if (!fs.existsSync(jsonFilePath)) {
    console.log('🌱 Inicializando JSON database fallback...');
    const hashedPassword = await bcrypt.hash('simao', 10);
    const defaultUser = {
      _id: 'usr_professor',
      name: 'Professor de PW II',
      age: 45,
      nif: '123456789',
      address: 'Universidade',
      email: 'professor@broker.com',
      password: hashedPassword,
      cash: 13850.00,
      holdings: [
        { ticker: 'BTC', name: 'Bitcoin', quantity: 0.35, avgBuyPrice: 60571.43 },
        { ticker: 'ETH', name: 'Ethereum', quantity: 1.5, avgBuyPrice: 3200.00 },
        { ticker: 'MSFT', name: 'Microsoft Corp', quantity: 15, avgBuyPrice: 320.00 },
        { ticker: 'TSLA', name: 'TESLA Inc', quantity: 25, avgBuyPrice: 220.00 }
      ]
    };

    const defaultOrders = [
      {
        _id: 'ord_init_1',
        userId: 'usr_professor',
        id: 'SL-BTC-INIT',
        ticker: 'BTC',
        type: 'STOP_LOSS',
        quantity: 0.1,
        price: 58000.00,
        status: 'PENDING',
        timestamp: new Date().toISOString()
      },
      {
        _id: 'ord_init_2',
        userId: 'usr_professor',
        id: 'TP-MSFT-INIT',
        ticker: 'MSFT',
        type: 'TAKE_PROFIT',
        quantity: 10,
        price: 350.00,
        status: 'PENDING',
        timestamp: new Date().toISOString()
      }
    ];

    const now = new Date();
    const defaultTransactions = [
      {
        _id: 'tx_init_1',
        userId: 'usr_professor',
        id: 'TX-SELL-ETH',
        timestamp: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
        type: 'SELL',
        ticker: 'ETH',
        quantity: 0.5,
        price: 3500.00,
        totalValue: 1750.00,
        avgBuyPriceAtExecution: 3200.00
      },
      {
        _id: 'tx_init_2',
        userId: 'usr_professor',
        id: 'TX-BUY-TSLA',
        timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
        type: 'BUY',
        ticker: 'TSLA',
        quantity: 25,
        price: 220.00,
        totalValue: 5500.00
      },
      {
        _id: 'tx_init_3',
        userId: 'usr_professor',
        id: 'TX-BUY-MSFT',
        timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
        type: 'BUY',
        ticker: 'MSFT',
        quantity: 15,
        price: 320.00,
        totalValue: 4800.00
      }
    ];

    const defaultData = {
      users: [defaultUser],
      orders: defaultOrders,
      transactions: defaultTransactions
    };

    fs.writeFileSync(jsonFilePath, JSON.stringify(defaultData, null, 2), 'utf8');
    console.log('🌱 Ficheiro database-fallback.json criado e populado com dados iniciais (Seed).');
  }
}

function readJsonData() {
  try {
    if (!fs.existsSync(jsonFilePath)) {
      // Criar de forma síncrona se não existir
      const hashedPassword = bcrypt.hashSync('simao', 10);
      const defaultUser = {
        _id: 'usr_professor',
        name: 'Professor de PW II',
        age: 45,
        nif: '123456789',
        address: 'Universidade',
        email: 'professor@broker.com',
        password: hashedPassword,
        cash: 13850.00,
        holdings: [
          { ticker: 'BTC', name: 'Bitcoin', quantity: 0.35, avgBuyPrice: 60571.43 },
          { ticker: 'ETH', name: 'Ethereum', quantity: 1.5, avgBuyPrice: 3200.00 },
          { ticker: 'MSFT', name: 'Microsoft Corp', quantity: 15, avgBuyPrice: 320.00 },
          { ticker: 'TSLA', name: 'TESLA Inc', quantity: 25, avgBuyPrice: 220.00 }
        ]
      };
      const defaultOrders = [
        { _id: 'ord_init_1', userId: 'usr_professor', id: 'SL-BTC-INIT', ticker: 'BTC', type: 'STOP_LOSS', quantity: 0.1, price: 58000.00, status: 'PENDING', timestamp: new Date().toISOString() },
        { _id: 'ord_init_2', userId: 'usr_professor', id: 'TP-MSFT-INIT', ticker: 'MSFT', type: 'TAKE_PROFIT', quantity: 10, price: 350.00, status: 'PENDING', timestamp: new Date().toISOString() }
      ];
      const now = new Date();
      const defaultTransactions = [
        { _id: 'tx_init_1', userId: 'usr_professor', id: 'TX-SELL-ETH', timestamp: new Date(now.getTime() - 60 * 60 * 1000).toISOString(), type: 'SELL', ticker: 'ETH', quantity: 0.5, price: 3500.00, totalValue: 1750.00, avgBuyPriceAtExecution: 3200.00 },
        { _id: 'tx_init_2', userId: 'usr_professor', id: 'TX-BUY-TSLA', timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(), type: 'BUY', ticker: 'TSLA', quantity: 25, price: 220.00, totalValue: 5500.00 },
        { _id: 'tx_init_3', userId: 'usr_professor', id: 'TX-BUY-MSFT', timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(), type: 'BUY', ticker: 'MSFT', quantity: 15, price: 320.00, totalValue: 4800.00 }
      ];
      const defaultData = { users: [defaultUser], orders: defaultOrders, transactions: defaultTransactions };
      fs.writeFileSync(jsonFilePath, JSON.stringify(defaultData, null, 2), 'utf8');
      return defaultData;
    }
    const raw = fs.readFileSync(jsonFilePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('❌ Erro ao ler base de dados JSON fallback:', err);
    return { users: [], orders: [], transactions: [] };
  }
}

function writeJsonData(data) {
  try {
    fs.writeFileSync(jsonFilePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('❌ Erro ao gravar na base de dados JSON fallback:', err);
  }
}

// --- LIGAÇÃO À BASE DE DADOS COM TIMEOUT E FALLBACK JSON ---

let mongoURI = process.env.MONGODB_URI || '';

if (!mongoURI || mongoURI.includes('cluster0.example.mongodb.net')) {
  console.log('⚠️ Detectada URI de exemplo do Atlas ou vazia. A tentar MongoDB local...');
  mongoURI = 'mongodb://127.0.0.1:27017/simao-broker';
}

mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 2000 })
  .then(() => {
    console.log(`🔌 Ligado ao MongoDB com sucesso em: ${mongoURI}`);
    setTimeout(seedDatabaseIfEmpty, 1000);
  })
  .catch(err => {
    console.warn(`❌ Falha ao conectar ao MongoDB especificado (${mongoURI}): ${err.message}`);
    const localFallback = 'mongodb://127.0.0.1:27017/simao-broker';
    console.log(`🔄 A tentar conectar ao MongoDB local: ${localFallback}`);
    
    mongoose.connect(localFallback, { serverSelectionTimeoutMS: 2000 })
      .then(() => {
        console.log('🔌 Ligado ao MongoDB local (Fallback) com sucesso.');
        setTimeout(seedDatabaseIfEmpty, 1000);
      })
      .catch(localErr => {
        console.error('❌ Não foi possível ligar ao MongoDB local nem ao Atlas.');
        console.log('⚠️ A ATIVAR MODO DE FALLBACK: Ficheiro JSON Local (database-fallback.json)');
        useJsonFallback = true;
        initJsonDatabase();
      });
  });

// --- ESQUEMAS E MODELOS (PARA MONGODB) ---

const HoldingSchema = new mongoose.Schema({
  ticker: { type: String, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  avgBuyPrice: { type: Number, required: true }
});

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  nif: { type: String, required: true, unique: true },
  address: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  cash: { type: Number, default: 50000.00 },
  holdings: [HoldingSchema]
});

const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  id: { type: String, required: true }, // slug gerado
  ticker: { type: String, required: true },
  type: { type: String, enum: ['BUY', 'SELL', 'STOP_LOSS', 'TAKE_PROFIT'], required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true }, // preço de disparo ou preço de execução
  status: { type: String, enum: ['PENDING', 'EXECUTED', 'CANCELLED'], default: 'PENDING' },
  timestamp: { type: Date, default: Date.now }
});

const TransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  id: { type: String, required: true, unique: true },
  timestamp: { type: Date, default: Date.now },
  type: { type: String, enum: ['BUY', 'SELL', 'STOP_LOSS_TRIGGER', 'TAKE_PROFIT_TRIGGER'], required: true },
  ticker: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  totalValue: { type: Number, required: true },
  avgBuyPriceAtExecution: { type: Number }
});

const User = mongoose.model('User', UserSchema);
const Order = mongoose.model('Order', OrderSchema);
const Transaction = mongoose.model('Transaction', TransactionSchema);

// --- AUXILIAR: LÓGICA DE POPULAÇÃO INICIAL (SEED) DO MONGO ---
async function seedDatabaseIfEmpty() {
  if (useJsonFallback) return;
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('🌱 Base de dados MongoDB vazia. A criar conta do professor (Seed)...');
      
      const hashedPassword = await bcrypt.hash('simao', 10);
      const professor = new User({
        name: 'Professor de PW II',
        age: 45,
        nif: '123456789',
        address: 'Universidade',
        email: 'professor@broker.com',
        password: hashedPassword,
        cash: 13850.00,
        holdings: [
          { ticker: 'BTC', name: 'Bitcoin', quantity: 0.35, avgBuyPrice: 60571.43 },
          { ticker: 'ETH', name: 'Ethereum', quantity: 1.5, avgBuyPrice: 3200.00 },
          { ticker: 'MSFT', name: 'Microsoft Corp', quantity: 15, avgBuyPrice: 320.00 },
          { ticker: 'TSLA', name: 'TESLA Inc', quantity: 25, avgBuyPrice: 220.00 }
        ]
      });
      await professor.save();
      const profId = professor._id;

      // Pré-popular ordens (Seed)
      const defaultOrders = [
        {
          userId: profId,
          id: 'SL-BTC-INIT',
          ticker: 'BTC',
          type: 'STOP_LOSS',
          quantity: 0.1,
          price: 58000.00,
          status: 'PENDING'
        },
        {
          userId: profId,
          id: 'TP-MSFT-INIT',
          ticker: 'MSFT',
          type: 'TAKE_PROFIT',
          quantity: 10,
          price: 350.00,
          status: 'PENDING'
        }
      ];
      await Order.insertMany(defaultOrders);

      // Pré-popular transações (Seed)
      const now = new Date();
      const defaultTransactions = [
        {
          userId: profId,
          id: 'TX-SELL-ETH',
          timestamp: new Date(now.getTime() - 60 * 60 * 1000),
          type: 'SELL',
          ticker: 'ETH',
          quantity: 0.5,
          price: 3500.00,
          totalValue: 1750.00,
          avgBuyPriceAtExecution: 3200.00
        },
        {
          userId: profId,
          id: 'TX-BUY-TSLA',
          timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000),
          type: 'BUY',
          ticker: 'TSLA',
          quantity: 25,
          price: 220.00,
          totalValue: 5500.00
        },
        {
          userId: profId,
          id: 'TX-BUY-MSFT',
          timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000),
          type: 'BUY',
          ticker: 'MSFT',
          quantity: 15,
          price: 320.00,
          totalValue: 4800.00
        }
      ];
      await Transaction.insertMany(defaultTransactions);
      console.log('✅ Dados do professor pré-populados com sucesso no MongoDB.');
    }
  } catch (err) {
    console.error('❌ Erro no seed da base de dados MongoDB:', err);
  }
}

// --- ADAPTADORES DE OPERAÇÕES DE BASE DE DADOS NO BACKEND ---

async function getUserData(userId) {
  if (useJsonFallback) {
    const db = readJsonData();
    const user = (db.users || []).find(u => u._id === userId);
    if (!user) return null;
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      cash: user.cash,
      holdings: user.holdings || [],
      save: async function() {
        const fullDb = readJsonData();
        const index = fullDb.users.findIndex(u => u._id === this._id);
        if (index > -1) {
          fullDb.users[index].cash = this.cash;
          fullDb.users[index].holdings = this.holdings;
          writeJsonData(fullDb);
        }
      }
    };
  } else {
    return await User.findById(userId);
  }
}

async function getOrdersList(userId) {
  if (useJsonFallback) {
    const db = readJsonData();
    return (db.orders || [])
      .filter(o => o.userId === userId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } else {
    return await Order.find({ userId }).sort({ timestamp: -1 });
  }
}

async function getTransactionsList(userId) {
  if (useJsonFallback) {
    const db = readJsonData();
    return (db.transactions || [])
      .filter(t => t.userId === userId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } else {
    return await Transaction.find({ userId }).sort({ timestamp: -1 });
  }
}

async function createOrder(orderData) {
  if (useJsonFallback) {
    const db = readJsonData();
    const newOrder = {
      _id: 'ord_' + Math.random().toString(36).substring(2, 9),
      userId: orderData.userId,
      id: orderData.id,
      ticker: orderData.ticker,
      type: orderData.type,
      quantity: orderData.quantity,
      price: orderData.price,
      status: orderData.status || 'PENDING',
      timestamp: new Date().toISOString()
    };
    if (!db.orders) db.orders = [];
    db.orders.push(newOrder);
    writeJsonData(db);
    return newOrder;
  } else {
    const newOrder = new Order(orderData);
    await newOrder.save();
    return newOrder;
  }
}

async function updateOrderStatus(userId, orderId, status) {
  if (useJsonFallback) {
    const db = readJsonData();
    const index = db.orders.findIndex(o => o.id === orderId && o.userId === userId);
    if (index > -1) {
      db.orders[index].status = status;
      writeJsonData(db);
    }
  } else {
    await Order.findOneAndUpdate({ id: orderId, userId }, { status });
  }
}

async function createTransaction(txData) {
  if (useJsonFallback) {
    const db = readJsonData();
    const newTx = {
      _id: 'tx_' + Math.random().toString(36).substring(2, 9),
      userId: txData.userId,
      id: txData.id,
      timestamp: txData.timestamp || new Date().toISOString(),
      type: txData.type,
      ticker: txData.ticker,
      quantity: txData.quantity,
      price: txData.price,
      totalValue: txData.totalValue,
      avgBuyPriceAtExecution: txData.avgBuyPriceAtExecution
    };
    if (!db.transactions) db.transactions = [];
    db.transactions.push(newTx);
    writeJsonData(db);
    return newTx;
  } else {
    const newTx = new Transaction(txData);
    await newTx.save();
    return newTx;
  }
}

async function clearUserData(userId) {
  if (useJsonFallback) {
    const db = readJsonData();
    db.orders = (db.orders || []).filter(o => o.userId !== userId);
    db.transactions = (db.transactions || []).filter(t => t.userId !== userId);
    const userIndex = db.users.findIndex(u => u._id === userId);
    if (userIndex > -1) {
      db.users[userIndex].cash = 50000.00;
      db.users[userIndex].holdings = [];
    }
    writeJsonData(db);
  } else {
    await Order.deleteMany({ userId });
    await Transaction.deleteMany({ userId });
    await User.findByIdAndUpdate(userId, { cash: 50000.00, holdings: [] });
  }
}

// --- MIDDLEWARE DE AUTENTICAÇÃO ---

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token de autenticação em falta.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido ou expirado.' });
    }
    req.user = user;
    next();
  });
}

// --- ROTAS DE AUTENTICAÇÃO API REST ---

// 1. Registo de utilizador
app.post('/api/auth/register', async (req, res) => {
  const { name, age, nif, address, email, password } = req.body;
  if (!name || !age || !nif || !address || !email || !password) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios para o registo.' });
  }

  try {
    const emailLower = email.toLowerCase();
    let userExists = false;

    if (useJsonFallback) {
      const db = readJsonData();
      userExists = (db.users || []).some(u => u.email.toLowerCase() === emailLower || u.nif === nif);
    } else {
      const existing = await User.findOne({ $or: [{ email: emailLower }, { nif }] });
      if (existing) userExists = true;
    }

    if (userExists) {
      return res.status(400).json({ error: 'Já existe um utilizador registado com este Email ou NIF.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUserObj = {
      name,
      age: Number(age),
      nif,
      address,
      email: emailLower,
      password: hashedPassword,
      cash: 50000.00,
      holdings: []
    };

    if (useJsonFallback) {
      const db = readJsonData();
      newUserObj._id = 'usr_' + Math.random().toString(36).substring(2, 9);
      if (!db.users) db.users = [];
      db.users.push(newUserObj);
      writeJsonData(db);
    } else {
      const userDoc = new User(newUserObj);
      await userDoc.save();
    }

    res.status(201).json({ success: true, message: 'Utilizador registado com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Login de utilizador
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e palavra-passe obrigatórios.' });
  }

  try {
    const emailLower = email.toLowerCase();
    let user = null;

    if (useJsonFallback) {
      const db = readJsonData();
      user = (db.users || []).find(u => u.email.toLowerCase() === emailLower);
    } else {
      user = await User.findOne({ email: emailLower });
    }

    if (!user) {
      return res.status(401).json({ error: 'Credenciais de login inválidas.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciais de login inválidas.' });
    }

    const userId = useJsonFallback ? user._id : user._id.toString();
    const token = jwt.sign({ userId, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      user: {
        name: user.name,
        email: user.email,
        cash: user.cash,
        holdings: user.holdings || []
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Obter Perfil do Utilizador Autenticado
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await getUserData(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'Utilizador não encontrado.' });
    }
    res.json({
      name: user.name,
      email: user.email,
      cash: user.cash,
      holdings: user.holdings
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ROTAS API REST (AUTENTICADAS) ---

// 1. Obter estado atual da carteira (saldo, posições)
app.get('/api/wallet', authenticateToken, async (req, res) => {
  try {
    const user = await getUserData(req.user.userId);
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' });
    res.json({
      cash: user.cash,
      holdings: user.holdings
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Obter histórico de transações confirmadas
app.get('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const txs = await getTransactionsList(req.user.userId);
    res.json(txs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Obter todas as ordens (histórico completo de ordens)
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const orders = await getOrdersList(req.user.userId);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Executar transação de COMPRA
app.post('/api/wallet/buy', authenticateToken, async (req, res) => {
  const { ticker, name, quantity, price, sl, tp } = req.body;
  if (!ticker || !name || !quantity || !price) {
    return res.status(400).json({ error: 'Parâmetros inválidos para compra.' });
  }

  const cost = quantity * price;
  const userId = req.user.userId;

  try {
    const user = await getUserData(userId);
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' });

    if (user.cash < cost) {
      return res.status(400).json({ error: 'Saldo de caixa insuficiente.' });
    }

    // Dedução de caixa
    user.cash = Number((user.cash - cost).toFixed(2));

    // Atualização de holdings
    const holdingIndex = user.holdings.findIndex(h => h.ticker === ticker);
    if (holdingIndex > -1) {
      const existing = user.holdings[holdingIndex];
      const totalQty = existing.quantity + quantity;
      const totalCost = (existing.quantity * existing.avgBuyPrice) + cost;
      existing.avgBuyPrice = Number((totalCost / totalQty).toFixed(2));
      existing.quantity = totalQty;
    } else {
      user.holdings.push({
        ticker,
        name,
        quantity,
        avgBuyPrice: price
      });
    }

    await user.save();

    // Criar registo de Ordem executada (BUY)
    const orderId = 'ORD-B-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    await createOrder({
      userId,
      id: orderId,
      ticker,
      type: 'BUY',
      quantity,
      price,
      status: 'EXECUTED'
    });

    // Criar registo de Transação confirmada
    const txId = 'TX-B-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    await createTransaction({
      userId,
      id: txId,
      type: 'BUY',
      ticker,
      quantity,
      price,
      totalValue: cost
    });

    // Criar ordens limites se fornecidas
    if (sl && sl > 0) {
      const slOrderId = 'ORD-SL-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      await createOrder({
        userId,
        id: slOrderId,
        ticker,
        type: 'STOP_LOSS',
        quantity,
        price: sl,
        status: 'PENDING'
      });
    }
    if (tp && tp > 0) {
      const tpOrderId = 'ORD-TP-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      await createOrder({
        userId,
        id: tpOrderId,
        ticker,
        type: 'TAKE_PROFIT',
        quantity,
        price: tp,
        status: 'PENDING'
      });
    }

    res.json({ cash: user.cash, holdings: user.holdings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Executar transação de VENDA
app.post('/api/wallet/sell', authenticateToken, async (req, res) => {
  const { ticker, quantity, price } = req.body;
  if (!ticker || !quantity || !price) {
    return res.status(400).json({ error: 'Parâmetros inválidos para venda.' });
  }

  const revenue = quantity * price;
  const userId = req.user.userId;

  try {
    const user = await getUserData(userId);
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' });

    const holdingIndex = user.holdings.findIndex(h => h.ticker === ticker);
    if (holdingIndex === -1 || user.holdings[holdingIndex].quantity < quantity) {
      return res.status(400).json({ error: 'Quantidade insuficiente para venda.' });
    }

    const existing = user.holdings[holdingIndex];
    const avgBuyPriceAtExecution = existing.avgBuyPrice;

    // Atualizar saldo e quantidade
    user.cash = Number((user.cash + revenue).toFixed(2));
    existing.quantity = Number((existing.quantity - quantity).toFixed(4));

    if (existing.quantity <= 0) {
      user.holdings.splice(holdingIndex, 1);
      
      // Cancelar ordens limites pendentes deste ticker
      if (useJsonFallback) {
        const db = readJsonData();
        db.orders.forEach(o => {
          if (o.userId === userId && o.ticker === ticker && o.status === 'PENDING') {
            o.status = 'CANCELLED';
          }
        });
        writeJsonData(db);
      } else {
        await Order.updateMany(
          { userId, ticker, status: 'PENDING' },
          { status: 'CANCELLED' }
        );
      }
    } else {
      // Cancelar ordens pendentes cujo volume ultrapasse a quantidade restante
      const orders = await getOrdersList(userId);
      const pendingOrders = orders.filter(o => o.ticker === ticker && o.status === 'PENDING');
      const totalOrderedQty = pendingOrders.reduce((sum, o) => sum + o.quantity, 0);

      if (totalOrderedQty > existing.quantity) {
        if (useJsonFallback) {
          const db = readJsonData();
          db.orders.forEach(o => {
            if (o.userId === userId && o.ticker === ticker && o.status === 'PENDING') {
              o.status = 'CANCELLED';
            }
          });
          writeJsonData(db);
        } else {
          await Order.updateMany(
            { userId, ticker, status: 'PENDING' },
            { status: 'CANCELLED' }
          );
        }
      }
    }

    await user.save();

    // Criar registo de Ordem executada (SELL)
    const orderId = 'ORD-S-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    await createOrder({
      userId,
      id: orderId,
      ticker,
      type: 'SELL',
      quantity,
      price,
      status: 'EXECUTED'
    });

    // Registar transação no histórico
    const txId = 'TX-S-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    await createTransaction({
      userId,
      id: txId,
      type: 'SELL',
      ticker,
      quantity,
      price,
      totalValue: revenue,
      avgBuyPriceAtExecution
    });

    res.json({ cash: user.cash, holdings: user.holdings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Ativação automática de limites (Stop Loss / Take Profit)
app.post('/api/wallet/orders/trigger', authenticateToken, async (req, res) => {
  const { orderId, executionPrice } = req.body;
  if (!orderId || !executionPrice) {
    return res.status(400).json({ error: 'Parâmetros de disparo inválidos.' });
  }

  const userId = req.user.userId;

  try {
    const user = await getUserData(userId);
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' });

    const orders = await getOrdersList(userId);
    const order = orders.find(o => o.id === orderId && o.status === 'PENDING');
    if (!order) {
      return res.status(404).json({ error: 'Ordem limite pendente não encontrada.' });
    }

    const holdingIndex = user.holdings.findIndex(h => h.ticker === order.ticker);

    if (holdingIndex > -1 && user.holdings[holdingIndex].quantity >= order.quantity) {
      const holding = user.holdings[holdingIndex];
      const revenue = order.quantity * executionPrice;
      const avgBuyPriceAtExecution = holding.avgBuyPrice;

      // Atualizar saldo e quantidade
      user.cash = Number((user.cash + revenue).toFixed(2));
      holding.quantity = Number((holding.quantity - order.quantity).toFixed(4));

      // Limpar holding se quantidade chegar a zero
      if (holding.quantity <= 0) {
        user.holdings.splice(holdingIndex, 1);
        // Cancelar as restantes ordens deste ticker
        if (useJsonFallback) {
          const db = readJsonData();
          db.orders.forEach(o => {
            if (o.userId === userId && o.ticker === order.ticker && o.status === 'PENDING') {
              o.status = 'CANCELLED';
            }
          });
          writeJsonData(db);
        } else {
          await Order.updateMany(
            { userId, ticker: order.ticker, status: 'PENDING' },
            { status: 'CANCELLED' }
          );
        }
      }

      await user.save();

      // Atualizar estado da Ordem Limite para executada
      await updateOrderStatus(userId, orderId, 'EXECUTED');

      // Registar transação automática no histórico
      const txId = 'TX-T-' + Math.random().toString(36).substring(2, 9).toUpperCase();
      await createTransaction({
        userId,
        id: txId,
        type: order.type === 'STOP_LOSS' ? 'STOP_LOSS_TRIGGER' : 'TAKE_PROFIT_TRIGGER',
        ticker: order.ticker,
        quantity: order.quantity,
        price: executionPrice,
        totalValue: revenue,
        avgBuyPriceAtExecution
      });

      res.json({ cash: user.cash, holdings: user.holdings });
    } else {
      // Cancelar ordem por insuficiência de ativos
      await updateOrderStatus(userId, orderId, 'CANCELLED');
      res.json({ cash: user.cash, holdings: user.holdings });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Cancelar ordem limite
app.post('/api/wallet/orders/cancel', authenticateToken, async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'ID da ordem em falta.' });

  try {
    await updateOrderStatus(req.user.userId, id, 'CANCELLED');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Reiniciar base de dados do utilizador
app.post('/api/wallet/reset', authenticateToken, async (req, res) => {
  try {
    await clearUserData(req.user.userId);
    res.json({ success: true, cash: 50000.00, holdings: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Iniciar servidor Express
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend a correr em http://localhost:${PORT}`);
});
