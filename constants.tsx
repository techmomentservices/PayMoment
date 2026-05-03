
import React from 'react';

export const COLORS = {
  primary: '#1E3A8A', // Deep Blue
  secondary: '#7C3AED', // Vibrant Purple
  accent: '#06B6D4', // Cyan
  background: '#F8FAFC',
};

export const NIGERIAN_BANKS = [
  "Access Bank", "GTBank", "First Bank", "Zenith Bank", "UBA", 
  "Kuda Bank", "Moniepoint", "OPay", "PalmPay", "Stanbic IBTC", 
  "Wema Bank", "Fidelity Bank", "Standard Chartered"
];

export const SAMPLE_TRANSACTIONS = [
  { id: '1', type: 'debit', amount: 5000, title: 'Ikeja Electric', category: 'Utility', timestamp: '2023-10-25 14:30', status: 'completed' },
  { id: '2', type: 'credit', amount: 150000, title: 'Transfer from Fola', category: 'Transfer', timestamp: '2023-10-24 09:15', status: 'completed' },
  { id: '3', type: 'debit', amount: 2500, title: 'MTN Airtime', category: 'Airtime', timestamp: '2023-10-24 18:45', status: 'completed' },
  { id: '4', type: 'debit', amount: 12000, title: 'Netflix Subscription', category: 'Entertainment', timestamp: '2023-10-23 20:00', status: 'completed' },
  { id: '5', type: 'credit', amount: 45000, title: 'Bet9ja Payout', category: 'Gaming', timestamp: '2023-10-22 11:20', status: 'completed' },
];

export const ICONS = {
  Transfer: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  Bill: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Airtime: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  Card: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Savings: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};
