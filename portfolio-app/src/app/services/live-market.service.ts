import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { map } from 'rxjs/operators';

export interface MarketAsset {
  ticker: string;
  name: string;
  price: number;
  change24h: number; // Simulated change since session start
  history: number[]; // Last 30 price points
  category: 'STOCK' | 'CRYPTO';
}

@Injectable({
  providedIn: 'root'
})
export class LiveMarketService {
  private readonly assets$ = new BehaviorSubject<MarketAsset[]>([
    {
      ticker: 'BTC',
      name: 'Bitcoin',
      price: 64250.00,
      change24h: 0.00,
      history: this.generateInitialHistory(64250.00, 30),
      category: 'CRYPTO'
    },
    {
      ticker: 'ETH',
      name: 'Ethereum',
      price: 3450.00,
      change24h: 0.00,
      history: this.generateInitialHistory(3450.00, 30),
      category: 'CRYPTO'
    },
    {
      ticker: 'MSFT',
      name: 'Microsoft Corp',
      price: 330.00,
      change24h: 0.00,
      history: this.generateInitialHistory(330.00, 30),
      category: 'STOCK'
    },
    {
      ticker: 'TSLA',
      name: 'TESLA Inc',
      price: 224.00,
      change24h: 0.00,
      history: this.generateInitialHistory(224.00, 30),
      category: 'STOCK'
    },
    {
      ticker: 'AAPL',
      name: 'Apple Inc',
      price: 195.20,
      change24h: 0.00,
      history: this.generateInitialHistory(195.20, 30),
      category: 'STOCK'
    },
    {
      ticker: 'NVDA',
      name: 'NVIDIA Corp',
      price: 840.10,
      change24h: 0.00,
      history: this.generateInitialHistory(840.10, 30),
      category: 'STOCK'
    }
  ]);

  constructor() {
    // Tick prices every 2 seconds
    interval(2000).subscribe(() => {
      this.tickPrices();
    });
  }

  getAssets(): Observable<MarketAsset[]> {
    return this.assets$.asObservable();
  }

  getAsset(ticker: string): Observable<MarketAsset | undefined> {
    return this.assets$.pipe(
      map(assets => assets.find(a => a.ticker.toUpperCase() === ticker.toUpperCase()))
    );
  }

  private tickPrices() {
    const current = this.assets$.value;
    const updated = current.map(asset => {
      // Fluctuate price by up to +/- 0.6%
      const volatility = asset.category === 'CRYPTO' ? 0.008 : 0.003;
      const changePercent = (Math.random() - 0.5) * volatility;
      const newPrice = Number((asset.price * (1 + changePercent)).toFixed(2));
      
      const newHistory = [...asset.history.slice(1), newPrice];
      
      // Calculate 24h change since the start of history (earliest point)
      const basePrice = asset.history[0];
      const change24h = basePrice > 0 ? (newPrice - basePrice) / basePrice : 0;

      return {
        ...asset,
        price: newPrice,
        history: newHistory,
        change24h
      };
    });
    this.assets$.next(updated);
  }

  private generateInitialHistory(basePrice: number, points: number): number[] {
    const history: number[] = [];
    let current = basePrice;
    for (let i = 0; i < points; i++) {
      const change = (Math.random() - 0.5) * 0.01;
      current = Number((current * (1 + change)).toFixed(2));
      history.push(current);
    }
    return history;
  }
}
