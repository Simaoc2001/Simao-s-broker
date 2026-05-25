import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { mergeMap, map } from 'rxjs/operators';
import { StockApiService } from './stock-api.service';

export interface PortfolioItem {
  ticker: string;
  empresa: string;
  dataCompra: string;
  quantidade: number;
  precoCompra: number;
}

export interface EnrichedPortfolioItem extends PortfolioItem {
  totalCompra: number;
  cotacaoDia: number;
  valorAtual: number;
  variacaoPercentual: number;
}

export interface PortfolioSummary {
  totalInvested: number;
  currentValue: number;
  totalVariationPercent: number;
}

export interface PortfolioData {
  items: EnrichedPortfolioItem[];
  summary: PortfolioSummary;
}

@Injectable({
  providedIn: 'root'
})
export class PortfolioService {
  private readonly http = inject(HttpClient);
  private readonly stockApiService = inject(StockApiService);

  loadAndEnrichPortfolio(useMock: boolean, apiKey?: string): Observable<PortfolioData> {
    // 1. Fetch raw items from the portfolio.json static file
    return this.http.get<PortfolioItem[]>('/portfolio.json').pipe(
      mergeMap((items: PortfolioItem[]) => {
        if (items.length === 0) {
          return forkJoin([]).pipe(
            map(() => ({
              items: [],
              summary: { totalInvested: 0, currentValue: 0, totalVariationPercent: 0 }
            }))
          );
        }

        // 2. Fetch prices for each item in parallel
        const priceRequests = items.map(item => 
          this.stockApiService.fetchMarketPrice(item.ticker, useMock, apiKey).pipe(
            map(marketData => {
              const totalCompra = item.quantidade * item.precoCompra;
              const valorAtual = item.quantidade * marketData.price;
              const variacaoPercentual = totalCompra > 0 ? (valorAtual / totalCompra) - 1 : 0;
              
              return {
                ...item,
                totalCompra,
                cotacaoDia: marketData.price,
                valorAtual,
                variacaoPercentual
              } as EnrichedPortfolioItem;
            })
          )
        );

        // forkJoin wait for all market price requests to complete
        return forkJoin(priceRequests).pipe(
          map((enrichedItems: EnrichedPortfolioItem[]) => {
            // 3. Compute totals
            let totalInvested = 0;
            let currentValue = 0;

            for (const item of enrichedItems) {
              totalInvested += item.totalCompra;
              currentValue += item.valorAtual;
            }

            const totalVariationPercent = totalInvested > 0 ? (currentValue / totalInvested) - 1 : 0;

            return {
              items: enrichedItems,
              summary: {
                totalInvested,
                currentValue,
                totalVariationPercent
              }
            };
          })
        );
      })
    );
  }
}
