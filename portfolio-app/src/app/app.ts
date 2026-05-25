import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LiveMarketService, MarketAsset } from './services/live-market.service';
import { WalletStateService, Holding, Transaction, ActiveOrder, ToastMessage } from './services/wallet-state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html'
})
export class App implements OnInit {
  private readonly marketService = inject(LiveMarketService);
  private readonly walletService = inject(WalletStateService);

  // Auth State Signals
  protected readonly currentUser = signal<any | null>(null);
  protected readonly authTab = signal<'login' | 'register'>('login');
  protected readonly authError = signal<string | null>(null);
  protected readonly authSuccess = signal<string | null>(null);

  // Login Form Signals
  protected readonly loginEmail = signal<string>('');
  protected readonly loginPassword = signal<string>('');

  // Register Form Signals
  protected readonly regName = signal<string>('');
  protected readonly regAge = signal<number | null>(null);
  protected readonly regNif = signal<string>('');
  protected readonly regAddress = signal<string>('');
  protected readonly regEmail = signal<string>('');
  protected readonly regPassword = signal<string>('');

  // UI Tabs State
  protected readonly activeTab = signal<'negociacao' | 'carteira' | 'historico' | 'ordens'>('negociacao');

  // Markets Ticker State
  protected readonly assets = signal<MarketAsset[]>([]);
  protected readonly selectedTicker = signal<string>('BTC');

  // Computed selector for current active asset
  protected readonly selectedAsset = computed(() => {
    return this.assets().find(a => a.ticker === this.selectedTicker());
  });

  // Wallet State bindings (updated via service subscriptions)
  protected readonly cash = signal<number>(50000.00);
  protected readonly holdings = signal<Holding[]>([]);
  protected readonly transactions = signal<Transaction[]>([]);
  protected readonly activeOrders = signal<ActiveOrder[]>([]);
  protected readonly toasts = signal<ToastMessage[]>([]);
  protected readonly ordersList = signal<any[]>([]);

  // Trade Form State
  protected readonly tradeType = signal<'BUY' | 'SELL'>('BUY');
  protected readonly quantity = signal<number>(0.1);
  
  protected readonly stopLossEnabled = signal<boolean>(false);
  protected readonly stopLossPrice = signal<number | null>(null);
  
  protected readonly takeProfitEnabled = signal<boolean>(false);
  protected readonly takeProfitPrice = signal<number | null>(null);

  // Computed state for current asset holding (if any)
  protected readonly currentHolding = computed(() => {
    return this.holdings().find(h => h.ticker === this.selectedTicker());
  });

  // Computed portfolio total asset value and net return
  protected readonly totalAssetsValue = computed(() => {
    let total = 0;
    for (const holding of this.holdings()) {
      const asset = this.assets().find(a => a.ticker === holding.ticker);
      const currentPrice = asset ? asset.price : holding.avgBuyPrice;
      total += holding.quantity * currentPrice;
    }
    return total;
  });

  protected readonly netEquity = computed(() => {
    return this.cash() + this.totalAssetsValue();
  });

  protected readonly netProfitLoss = computed(() => {
    let totalCost = 0;
    for (const holding of this.holdings()) {
      totalCost += holding.quantity * holding.avgBuyPrice;
    }
    return this.totalAssetsValue() - totalCost;
  });

  protected readonly netProfitLossPercent = computed(() => {
    let totalCost = 0;
    for (const holding of this.holdings()) {
      totalCost += holding.quantity * holding.avgBuyPrice;
    }
    return totalCost > 0 ? (this.totalAssetsValue() - totalCost) / totalCost : 0;
  });

  ngOnInit() {
    // 1. Subscribe to Auth status
    this.walletService.getCurrentUser().subscribe(user => {
      this.currentUser.set(user);
    });

    // 2. Subscribe to live price ticks
    this.marketService.getAssets().subscribe(assets => {
      this.assets.set(assets);
    });

    // 3. Subscribe to wallet data streams
    this.walletService.getCash().subscribe(cash => this.cash.set(cash));
    this.walletService.getHoldings().subscribe(holdings => this.holdings.set(holdings));
    this.walletService.getTransactions().subscribe(txs => this.transactions.set(txs));
    this.walletService.getActiveOrders().subscribe(orders => this.activeOrders.set(orders));
    this.walletService.getToasts().subscribe(toasts => this.toasts.set(toasts));
    this.walletService.getOrders().subscribe(orders => this.ordersList.set(orders));

    // Initialize form defaults for the default asset
    this.resetFormPrices();
  }

  // --- Auth Control Actions ---

  protected setAuthTab(tab: 'login' | 'register') {
    this.authTab.set(tab);
    this.authError.set(null);
    this.authSuccess.set(null);
  }

  protected submitLogin() {
    this.authError.set(null);
    const email = this.loginEmail().trim();
    const password = this.loginPassword();

    if (!email || !password) {
      this.authError.set('Por favor, preencha todos os campos.');
      return;
    }

    this.walletService.login({ email, password }).subscribe({
      next: () => {
        // Clear login form
        this.loginEmail.set('');
        this.loginPassword.set('');
      },
      error: (err) => {
        console.error(err);
        this.authError.set(err.error?.error || 'Falha ao autenticar. Credenciais inválidas.');
      }
    });
  }

  protected submitRegister() {
    this.authError.set(null);
    this.authSuccess.set(null);

    const name = this.regName().trim();
    const age = this.regAge();
    const nif = this.regNif().trim();
    const address = this.regAddress().trim();
    const email = this.regEmail().trim();
    const password = this.regPassword();

    if (!name || !age || !nif || !address || !email || !password) {
      this.authError.set('Por favor, preencha todos os campos.');
      return;
    }

    if (age <= 0) {
      this.authError.set('Por favor, insira uma idade válida.');
      return;
    }

    const userData = { name, age, nif, address, email, password };
    this.walletService.register(userData).subscribe({
      next: (res) => {
        this.authSuccess.set('Conta criada com sucesso! Já pode fazer login.');
        // Clear registration form
        this.regName.set('');
        this.regAge.set(null);
        this.regNif.set('');
        this.regAddress.set('');
        this.regEmail.set('');
        this.regPassword.set('');
        // Toggle to login tab
        setTimeout(() => {
          this.setAuthTab('login');
        }, 1500);
      },
      error: (err) => {
        console.error(err);
        this.authError.set(err.error?.error || 'Erro ao efetuar registo.');
      }
    });
  }

  protected logout() {
    this.walletService.logout();
  }

  // --- Trade Control Actions ---

  protected selectAsset(ticker: string) {
    this.selectedTicker.set(ticker);
    this.resetFormPrices();
  }

  protected setTradeType(type: 'BUY' | 'SELL') {
    this.tradeType.set(type);
    
    // Set logical quantity default based on action
    const asset = this.selectedAsset();
    if (asset) {
      if (type === 'SELL') {
        const holding = this.currentHolding();
        this.quantity.set(holding ? holding.quantity : 0);
      } else {
        // Buy default: what $1000 can get
        const defaultQty = Number((1000 / asset.price).toFixed(asset.category === 'CRYPTO' ? 4 : 2));
        this.quantity.set(defaultQty > 0 ? defaultQty : 1);
      }
    }
  }

  protected setPercentQuantity(percent: number) {
    const asset = this.selectedAsset();
    if (!asset) return;

    if (this.tradeType() === 'BUY') {
      const targetCash = this.cash() * (percent / 100);
      const qty = targetCash / asset.price;
      this.quantity.set(Number(qty.toFixed(asset.category === 'CRYPTO' ? 4 : 2)));
    } else {
      const holding = this.currentHolding();
      if (holding) {
        const qty = holding.quantity * (percent / 100);
        this.quantity.set(Number(qty.toFixed(asset.category === 'CRYPTO' ? 4 : 2)));
      } else {
        this.quantity.set(0);
      }
    }
  }

  protected executeTrade() {
    const asset = this.selectedAsset();
    if (!asset || this.quantity() <= 0) return;

    let success = false;
    const slVal = this.stopLossEnabled() ? this.stopLossPrice() || undefined : undefined;
    const tpVal = this.takeProfitEnabled() ? this.takeProfitPrice() || undefined : undefined;

    if (this.tradeType() === 'BUY') {
      success = this.walletService.buyAsset(
        asset.ticker,
        asset.name,
        this.quantity(),
        asset.price,
        slVal,
        tpVal
      );
    } else {
      success = this.walletService.sellAsset(
        asset.ticker,
        this.quantity(),
        asset.price
      );
    }

    if (success) {
      // Keep SL/TP flags but clear fields
      this.stopLossPrice.set(null);
      this.takeProfitPrice.set(null);
      this.stopLossEnabled.set(false);
      this.takeProfitEnabled.set(false);
    }
  }

  protected cancelOrder(id: string) {
    this.walletService.cancelOrder(id);
  }

  protected clearToast(id: string) {
    this.walletService.clearToast(id);
  }

  protected resetWallet() {
    if (confirm('Tem a certeza que deseja apagar todo o histórico de ordens e transações e reiniciar a carteira?')) {
      this.walletService.resetWallet();
    }
  }

  protected getLiveAsset(ticker: string): MarketAsset | undefined {
    return this.assets().find(a => a.ticker === ticker);
  }

  // --- SVG Live Chart plotting utilities ---
  protected getChartPath(history: number[]): string {
    if (!history || history.length === 0) return '';
    const width = 600;
    const height = 220;
    const padding = 15;

    const min = Math.min(...history);
    const max = Math.max(...history);
    const range = max - min === 0 ? 1 : max - min;

    const points = history.map((price, index) => {
      const x = (index / (history.length - 1)) * (width - 2 * padding) + padding;
      const y = height - padding - ((price - min) / range) * (height - 2 * padding);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return 'M ' + points.join(' L ');
  }

  protected getChartAreaPath(history: number[]): string {
    if (!history || history.length === 0) return '';
    const width = 600;
    const height = 220;
    const padding = 15;

    const min = Math.min(...history);
    const max = Math.max(...history);
    const range = max - min === 0 ? 1 : max - min;

    const points = history.map((price, index) => {
      const x = (index / (history.length - 1)) * (width - 2 * padding) + padding;
      const y = height - padding - ((price - min) / range) * (height - 2 * padding);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const startX = padding;
    const startY = height - padding;
    const endX = width - padding;
    const endY = height - padding;

    return `M ${startX},${startY} L ${points.join(' L ')} L ${endX},${endY} Z`;
  }

  protected getPriceY(price: number, history: number[]): number {
    if (!history || history.length === 0) return 0;
    const height = 220;
    const padding = 15;

    const min = Math.min(...history);
    const max = Math.max(...history);
    const range = max - min === 0 ? 1 : max - min;

    const y = height - padding - ((price - min) / range) * (height - 2 * padding);
    return Number(y.toFixed(1));
  }

  protected isPriceInChartRange(price: number, history: number[]): boolean {
    if (!history || history.length === 0) return false;
    const min = Math.min(...history);
    const max = Math.max(...history);
    
    // Give a 10% overflow margin
    const margin = (max - min) * 0.1;
    return price >= (min - margin) && price <= (max + margin);
  }

  // --- Localized Formatting Helpers ---
  protected formatNumber(value: number, decimals: number = 2): string {
    return new Intl.NumberFormat('pt-PT', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  }

  protected formatPercent(value: number): string {
    const formatted = new Intl.NumberFormat('pt-PT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value * 100);
    return (value > 0 ? '+' : '') + formatted + '%';
  }

  protected formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-PT') + ' ' + d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  protected getTxTypeLabel(type: string): string {
    switch (type) {
      case 'BUY': return 'COMPRA';
      case 'SELL': return 'VENDA';
      case 'STOP_LOSS_TRIGGER': return 'AUTO-SL (STOP LOSS)';
      case 'TAKE_PROFIT_TRIGGER': return 'AUTO-TP (TAKE PROFIT)';
      default: return type;
    }
  }

  protected getOrderTypeLabel(type: string): string {
    switch (type) {
      case 'BUY': return 'COMPRA DIRECTA';
      case 'SELL': return 'VENDA DIRECTA';
      case 'STOP_LOSS': return 'STOP LOSS (LIMITE)';
      case 'TAKE_PROFIT': return 'TAKE PROFIT (LIMITE)';
      default: return type;
    }
  }

  protected getOrderStatusLabel(status: string): string {
    switch (status) {
      case 'PENDING': return 'PENDENTE';
      case 'EXECUTED': return 'EXECUTADA';
      case 'CANCELLED': return 'CANCELADA';
      default: return status;
    }
  }

  private resetFormPrices() {
    const asset = this.selectedAsset();
    if (asset) {
      this.stopLossPrice.set(Number((asset.price * 0.95).toFixed(2))); // 5% below
      this.takeProfitPrice.set(Number((asset.price * 1.05).toFixed(2))); // 5% above
      this.stopLossEnabled.set(false);
      this.takeProfitEnabled.set(false);
      
      if (this.tradeType() === 'SELL') {
        const holding = this.currentHolding();
        this.quantity.set(holding ? holding.quantity : 0);
      } else {
        const defaultQty = Number((1000 / asset.price).toFixed(asset.category === 'CRYPTO' ? 4 : 2));
        this.quantity.set(defaultQty > 0 ? defaultQty : 1);
      }
    }
  }
}
