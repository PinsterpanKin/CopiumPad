"use client";

import { useCallback, useEffect, useState } from "react";
import type { Holding } from "@/lib/finance/portfolio";

export const PORTFOLIO_STORAGE_KEY = "copiumpad_positions";

export const DEFAULT_POSITIONS: Holding[] = [
  { symbol: "VOO", name: "Vanguard S&P 500 ETF", quantity: "50", averageCost: "450" },
  { symbol: "QQQ", name: "Invesco QQQ Trust", quantity: "30", averageCost: "380" },
  { symbol: "BTC-USD", name: "Bitcoin USD", quantity: "0.5", averageCost: "60000" },
];

function normalizePosition(position: Holding): Holding {
  return { ...position, symbol: position.symbol.trim().toUpperCase() };
}

function isHolding(value: unknown): value is Holding {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.symbol === "string" && typeof candidate.name === "string" &&
    typeof candidate.quantity === "string" && typeof candidate.averageCost === "string";
}

function readPositions(): Holding[] {
  try {
    const stored = window.localStorage.getItem(PORTFOLIO_STORAGE_KEY);
    if (!stored) return DEFAULT_POSITIONS;
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter(isHolding).map(normalizePosition) : DEFAULT_POSITIONS;
  } catch {
    return DEFAULT_POSITIONS;
  }
}

export function usePortfolioStorage() {
  const [positions, setPositions] = useState<Holding[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedPositions = readPositions();
      setPositions(storedPositions);
      window.localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(storedPositions));
      setIsHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const persist = useCallback((nextPositions: Holding[]) => {
    setPositions(nextPositions);
    window.localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(nextPositions));
  }, []);

  const addPosition = useCallback((position: Holding) => {
    const normalized = normalizePosition(position);
    setPositions((current) => {
      if (current.some((item) => item.symbol === normalized.symbol)) return current;
      const next = [...current, normalized];
      window.localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removePosition = useCallback((symbol: string) => {
    setPositions((current) => {
      const next = current.filter((position) => position.symbol !== symbol.trim().toUpperCase());
      window.localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const updatePosition = useCallback((position: Holding) => {
    const normalized = normalizePosition(position);
    setPositions((current) => {
      const next = current.map((item) => item.symbol === normalized.symbol ? normalized : item);
      window.localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetToDefaults = useCallback(() => persist(DEFAULT_POSITIONS), [persist]);

  return { positions, isHydrated, addPosition, removePosition, updatePosition, resetToDefaults };
}