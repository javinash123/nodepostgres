import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Financial Year utilities for Indian Financial Year (April to March)
export function getFinancialYear(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // getMonth() returns 0-based month
  
  if (month >= 4) {
    // April onwards - current year to next year
    return `${year}-${year + 1}`;
  } else {
    // January to March - previous year to current year
    return `${year - 1}-${year}`;
  }
}

export function getCurrentFinancialYear(): string {
  return getFinancialYear(new Date());
}

export function isDateInFinancialYear(date: Date, financialYear: string): boolean {
  const projectFY = getFinancialYear(date);
  return projectFY === financialYear;
}

export function getFinancialYearRange(financialYear: string): { startDate: Date, endDate: Date } {
  const [startYear, endYear] = financialYear.split('-').map(Number);
  return {
    startDate: new Date(startYear, 3, 1), // April 1st (month is 0-indexed)
    endDate: new Date(endYear, 2, 31)     // March 31st  
  };
}

export function formatFinancialYear(financialYear: string): string {
  const [startYear, endYear] = financialYear.split('-');
  return `FY ${startYear}-${endYear.slice(-2)}`;
}

