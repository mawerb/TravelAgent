import type { MoneyCents } from "@/types";

export function dollarsToCents(dollars: number): MoneyCents {
  return Math.round(dollars * 100);
}

export function centsToDollars(cents: MoneyCents): number {
  return cents / 100;
}

export function formatUsd(cents: MoneyCents): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(centsToDollars(cents));
}

export function formatUsdExact(cents: MoneyCents): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(centsToDollars(cents));
}
