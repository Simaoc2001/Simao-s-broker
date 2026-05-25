import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { LiveMarketService, MarketAsset } from './live-market.service';

export interface Holding {
  ticker: string;
  name: string;
  quantity: number;
  avgBuyPrice: number; // Preço médio de compra
}

export interface Transaction {
  id: string;
  timestamp: string; // ISO String
  type: 'BUY' | 'SELL' | 'STOP_LOSS_TRIGGER' | 'TAKE_PROFIT_TRIGGER';
  ticker: string;
  quantity: number;
  price: number;
  totalValue: number;
  avgBuyPriceAtExecution?: number;
}

export interface ActiveOrder {
  id: string;
  ticker: string;
  type: 'STOP_LOSS' | 'TAKE_PROFIT';
  thresholdPrice: number;
  quantity: number;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'info';
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class WalletStateService {
  private readonly marketService = inject(LiveMarketService);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api';
  private readonly tokenKey = 'simao_broker_token';

  // Estado da Carteira
  private cash = 50000.00;
  private holdings: Record<string, Holding> = {};
  private transactions: Transaction[] = [];
  private activeOrders: ActiveOrder[] = [];

  // Behavior Subjects para fluxos de dados de estado
  private readonly cash$ = new BehaviorSubject<number>(this.cash);
  private readonly holdings$ = new BehaviorSubject<Holding[]>([]);
  private readonly transactions$ = new BehaviorSubject<Transaction[]>([]);
  private readonly activeOrders$ = new BehaviorSubject<ActiveOrder[]>([]);
  private readonly toasts$ = new BehaviorSubject<ToastMessage[]>([]);
  
  // Estado de Autenticação e Multi-Utilizador
  private readonly currentUser$ = new BehaviorSubject<any | null>(null);
  private readonly orders$ = new BehaviorSubject<any[]>([]);

  constructor() {
    this.loadState();

    // Subscrever ticks de mercado ao vivo para verificar gatilhos de SL/TP
    this.marketService.getAssets().subscribe(assets => {
      if (this.currentUser$.value) {
        this.checkActiveOrders(assets);
        this.updateHoldingsStream();
      }
    });
  }

  // --- Métodos de Autenticação ---

  private getHeaders() {
    const token = localStorage.getItem(this.tokenKey);
    return {
      headers: {
        'Authorization': `Bearer ${token || ''}`,
        'Content-Type': 'application/json'
      }
    };
  }

  getCurrentUser(): Observable<any | null> {
    return this.currentUser$.asObservable();
  }

  getOrders(): Observable<any[]> {
    return this.orders$.asObservable();
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register`, userData);
  }

  login(credentials: { email: string, password: string }): Observable<any> {
    return new Observable(observer => {
      this.http.post<{ token: string, user: any }>(`${this.apiUrl}/auth/login`, credentials).subscribe({
        next: (res) => {
          localStorage.setItem(this.tokenKey, res.token);
          this.currentUser$.next(res.user);
          this.cash = res.user.cash;
          this.cash$.next(this.cash);
          
          this.holdings = {};
          if (Array.isArray(res.user.holdings)) {
            res.user.holdings.forEach((h: any) => {
              this.holdings[h.ticker] = h;
            });
          }
          this.updateHoldingsStream();
          this.loadOrders();
          this.loadTransactions();
          
          observer.next(res);
          observer.complete();
        },
        error: (err) => {
          observer.error(err);
        }
      });
    });
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    this.currentUser$.next(null);
    this.cash = 50000;
    this.cash$.next(this.cash);
    this.holdings = {};
    this.updateHoldingsStream();
    this.transactions = [];
    this.transactions$.next([]);
    this.activeOrders = [];
    this.activeOrders$.next([]);
    this.orders$.next([]);
  }

  // --- Métodos de Leitura (Getters) ---

  getCash(): Observable<number> {
    return this.cash$.asObservable();
  }

  getHoldings(): Observable<Holding[]> {
    return this.holdings$.asObservable();
  }

  getTransactions(): Observable<Transaction[]> {
    return this.transactions$.asObservable();
  }

  getActiveOrders(): Observable<ActiveOrder[]> {
    return this.activeOrders$.asObservable();
  }

  getToasts(): Observable<ToastMessage[]> {
    return this.toasts$.asObservable();
  }

  // --- Carregamento de Dados ---

  loadOrders() {
    this.http.get<any[]>(`${this.apiUrl}/orders`, this.getHeaders()).subscribe({
      next: (orders) => {
        this.orders$.next(orders);
        // Mapear para activeOrders (STOP_LOSS ou TAKE_PROFIT com estado PENDING)
        const mapped = orders
          .filter(o => o.status === 'PENDING' && (o.type === 'STOP_LOSS' || o.type === 'TAKE_PROFIT'))
          .map(o => ({
            id: o.id,
            ticker: o.ticker,
            type: o.type as 'STOP_LOSS' | 'TAKE_PROFIT',
            thresholdPrice: o.price,
            quantity: o.quantity
          }));
        this.activeOrders = mapped;
        this.activeOrders$.next(this.activeOrders);
      },
      error: (err) => {
        console.error('Erro ao carregar ordens do servidor:', err);
      }
    });
  }

  loadTransactions() {
    this.http.get<Transaction[]>(`${this.apiUrl}/transactions`, this.getHeaders())
      .subscribe({
        next: (txs) => {
          this.transactions = Array.isArray(txs) ? txs : [];
          this.transactions$.next(this.transactions);
        },
        error: (err) => {
          console.error('Erro ao carregar transações do servidor:', err);
        }
      });
  }

  private loadState() {
    const token = localStorage.getItem(this.tokenKey);
    if (token) {
      this.http.get<any>(`${this.apiUrl}/auth/me`, this.getHeaders()).subscribe({
        next: (user) => {
          this.currentUser$.next(user);
          this.cash = user.cash;
          this.cash$.next(this.cash);
          
          this.holdings = {};
          if (Array.isArray(user.holdings)) {
            user.holdings.forEach((h: any) => {
              this.holdings[h.ticker] = h;
            });
          }
          this.updateHoldingsStream();
          this.loadOrders();
          this.loadTransactions();
        },
        error: (err) => {
          console.error('Token inválido ou expirado. Efetuando logout...', err);
          this.logout();
        }
      });
    }
  }

  // --- Operações de Negociação (Trading) ---

  buyAsset(ticker: string, name: string, quantity: number, price: number, sl?: number, tp?: number): boolean {
    const cost = quantity * price;
    if (this.cash < cost) {
      this.addToast('Saldo de caixa insuficiente para esta compra.', 'warning');
      return false;
    }

    this.http.post<{ cash: number, holdings: Holding[] }>(`${this.apiUrl}/wallet/buy`, {
      ticker, name, quantity, price, sl, tp
    }, this.getHeaders()).subscribe({
      next: (res) => {
        this.cash = res.cash;
        this.holdings = {};
        if (Array.isArray(res.holdings)) {
          res.holdings.forEach(h => {
            this.holdings[h.ticker] = h;
          });
        }

        this.cash$.next(this.cash);
        this.updateHoldingsStream();
        this.loadOrders();
        this.loadTransactions();
        this.addToast(`Compra efetuada com sucesso: ${quantity} ${ticker} a $${price.toFixed(2)}.`, 'success');
      },
      error: (err) => {
        console.error('Erro ao efetuar compra no servidor:', err);
        this.addToast('Erro ao registar compra no MongoDB Atlas.', 'warning');
      }
    });

    return true;
  }

  sellAsset(ticker: string, quantity: number, price: number): boolean {
    const existing = this.holdings[ticker];
    if (!existing || existing.quantity < quantity) {
      this.addToast('Não possui a quantidade necessária para venda.', 'warning');
      return false;
    }

    this.http.post<{ cash: number, holdings: Holding[] }>(`${this.apiUrl}/wallet/sell`, {
      ticker, quantity, price
    }, this.getHeaders()).subscribe({
      next: (res) => {
        this.cash = res.cash;
        this.holdings = {};
        if (Array.isArray(res.holdings)) {
          res.holdings.forEach(h => {
            this.holdings[h.ticker] = h;
          });
        }

        this.cash$.next(this.cash);
        this.updateHoldingsStream();
        this.loadOrders();
        this.loadTransactions();
        this.addToast(`Venda efetuada com sucesso: ${quantity} ${ticker} a $${price.toFixed(2)}.`, 'success');
      },
      error: (err) => {
        console.error('Erro ao efetuar venda no servidor:', err);
        this.addToast('Erro ao registar venda no MongoDB Atlas.', 'warning');
      }
    });

    return true;
  }

  cancelOrder(id: string) {
    this.http.post<any>(`${this.apiUrl}/wallet/orders/cancel`, {
      id
    }, this.getHeaders()).subscribe({
      next: () => {
        this.loadOrders();
        this.addToast('Ordem automática cancelada.', 'info');
      },
      error: (err) => {
        console.error('Erro ao cancelar ordem no servidor:', err);
      }
    });
  }

  clearToast(id: string) {
    const current = this.toasts$.value;
    this.toasts$.next(current.filter(t => t.id !== id));
  }

  resetWallet() {
    this.http.post<any>(`${this.apiUrl}/wallet/reset`, {}, this.getHeaders())
      .subscribe({
        next: (res) => {
          this.cash = res.cash || 50000.00;
          this.holdings = {};
          this.activeOrders = [];
          this.transactions = [];

          this.cash$.next(this.cash);
          this.updateHoldingsStream();
          this.activeOrders$.next(this.activeOrders);
          this.transactions$.next(this.transactions);
          this.orders$.next([]);
          this.addToast('A sua carteira foi reiniciada com o saldo original de $50.000,00.', 'info');
        },
        error: (err) => {
          console.error('Erro ao reiniciar carteira no servidor:', err);
        }
      });
  }

  private checkActiveOrders(assets: MarketAsset[]) {
    const ordersToProcess = [...this.activeOrders];

    for (const order of ordersToProcess) {
      const asset = assets.find(a => a.ticker === order.ticker);
      if (!asset) continue;

      const currentPrice = asset.price;
      let shouldTrigger = false;

      if (order.type === 'STOP_LOSS' && currentPrice <= order.thresholdPrice) {
        shouldTrigger = true;
      } else if (order.type === 'TAKE_PROFIT' && currentPrice >= order.thresholdPrice) {
        shouldTrigger = true;
      }
      if (shouldTrigger) {
        // Remover de forma otimista das activeOrders locais para evitar múltiplos disparos
        this.activeOrders = this.activeOrders.filter(o => o.id !== order.id);
        this.activeOrders$.next(this.activeOrders);

        // Enviar requisição de disparo para o backend
        this.http.post<{ cash: number, holdings: Holding[] }>(`${this.apiUrl}/wallet/orders/trigger`, {
          orderId: order.id,
          executionPrice: currentPrice
        }, this.getHeaders()).subscribe({
          next: (res) => {
            this.cash = res.cash;
            this.holdings = {};
            if (Array.isArray(res.holdings)) {
              res.holdings.forEach(h => {
                this.holdings[h.ticker] = h;
              });
            }

            this.cash$.next(this.cash);
            this.updateHoldingsStream();
            this.loadOrders();
            this.loadTransactions();

            const msg = order.type === 'STOP_LOSS'
              ? `[SL] AUTO-VENDA: Stop Loss ativado para ${order.ticker}. ${order.quantity} vendidos a $${currentPrice.toFixed(2)}.`
              : `[TP] AUTO-VENDA: Take Profit ativado para ${order.ticker}. ${order.quantity} vendidos a $${currentPrice.toFixed(2)}.`;
            
            this.addToast(msg, 'warning');
          },
          error: (err) => {
            console.error('Erro ao processar disparo de ordem no servidor:', err);
          }
        });
      }
    }
  }

  private addToast(message: string, type: 'success' | 'warning' | 'info') {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: ToastMessage = { id, message, type, timestamp: new Date() };
    const current = this.toasts$.value;
    
    // Limitar a 5 alertas do tipo toast simultâneos
    this.toasts$.next([toast, ...current.slice(0, 4)]);
    
    // Remover automaticamente após 5 segundos
    setTimeout(() => {
      this.clearToast(id);
    }, 5000);
  }

  private updateHoldingsStream() {
    this.holdings$.next(Object.values(this.holdings));
  }
}
