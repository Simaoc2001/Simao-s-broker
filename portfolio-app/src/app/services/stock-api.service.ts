import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, delay } from 'rxjs/operators';

export interface MarketData {
  price: number;
}

const MOCK_PRICES: Record<string, number> = {
  'MSFT': 330.00,
  'TSLA': 224.00,
  'AAPL': 195.20,
  'NVDA': 840.10
};

@Injectable({
  providedIn: 'root'
})
export class StockApiService {
  private readonly http = inject(HttpClient);

  fetchMarketPrice(ticker: string, useMock: boolean, apiKey?: string): Observable<MarketData> {
    const symbol = ticker.toUpperCase();

    if (useMock || !apiKey || apiKey.trim() === '') {
      // Resolve mock price with simulation delay for realistic UI loading
      const mockPrice = MOCK_PRICES[symbol] !== undefined ? MOCK_PRICES[symbol] : this.generatePseudoRandomPrice(symbol);
      return of({ price: mockPrice }).pipe(delay(600 + Math.random() * 800));
    }

    // Connect to Finnhub API: 'c' is the current price
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;

    return this.http.get<any>(url).pipe(
      map(response => {
        if (response && response.c !== undefined && response.c !== 0) {
          return { price: response.c };
        } else {
          throw new Error(`Symbol ${symbol} returned invalid data (could be invalid token or symbol).`);
        }
      }),
      catchError(error => {
        console.warn(`API call failed for ${symbol}, falling back to mock price. Error details:`, error);
        // Graceful fallback to mock data so the app never crashes
        const fallbackPrice = MOCK_PRICES[symbol] !== undefined ? MOCK_PRICES[symbol] : this.generatePseudoRandomPrice(symbol);
        return of({ price: fallbackPrice }).pipe(delay(400));
      })
    );
  }

  private generatePseudoRandomPrice(ticker: string): number {
    const charSum = ticker.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return 50 + (charSum % 300);
  }
}
