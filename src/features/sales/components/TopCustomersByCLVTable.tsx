'use client';

import { useState } from 'react';
import { CLVData } from '@/features/sales/types/clv';
import { useTableSort } from '@/features/shared/hooks/useTableSort';

interface TopCustomersByCLVTableProps {
  customers: CLVData[];
  onCustomerClick?: (customer: CLVData) => void;
}

interface SortableCustomerData {
  customer: string;
  customerType: string;
  totalValue: number;
  totalOrders: number;
  averageTicket: number;
  purchaseFrequency: number;
  customerLifespan: number;
  clvRiskScore: number;
  lastPurchase: Date;
}

export default function TopCustomersByCLVTable({ 
  customers, 
  onCustomerClick 
}: TopCustomersByCLVTableProps) {
  const [sortField, setSortField] = useState<keyof SortableCustomerData>('totalValue');

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatNumber = (n: number) => {
    return n.toLocaleString('pt-BR');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR');
  };

  const formatRiskScore = (score: number) => {
    if (score < 30) return { text: 'Baixo', className: 'risk-low' };
    if (score < 60) return { text: 'Médio', className: 'risk-medium' };
    return { text: 'Alto', className: 'risk-high' };
  };

  const { sortedData, handleSort } = useTableSort<SortableCustomerData>(
    customers.map(customer => ({
      customer: customer.customer,
      customerType: customer.customerType ?? 'Sem Categoria',
      totalValue: customer.totalValue,
      totalOrders: customer.totalOrders,
      averageTicket: customer.averageTicket,
      purchaseFrequency: customer.purchaseFrequency,
      customerLifespan: customer.customerLifespan,
      clvRiskScore: customer.clvRiskScore,
      lastPurchase: customer.lastPurchase
    }))
  );

  const handleSortChange = (field: keyof SortableCustomerData) => {
    setSortField(field);
    handleSort(String(field));
  };

  const columns = [
    { key: 'customer', label: 'Cliente', sortable: true },
    { key: 'customerType', label: 'Tipo', sortable: true },
    { key: 'totalValue', label: 'CLV Histórico', sortable: true },
    { key: 'totalOrders', label: 'Pedidos', sortable: true },
    { key: 'averageTicket', label: 'Ticket Médio', sortable: true },
    { key: 'purchaseFrequency', label: 'Freq./Mês', sortable: true },
    { key: 'customerLifespan', label: 'Vida (meses)', sortable: true },
    { key: 'lastPurchase', label: 'Último Pedido', sortable: true },
    { key: 'clvRiskScore', label: 'Risco', sortable: true }
  ];

  return (
    <div className="top-customers-clv-table">
      <div className="table-header">
        <h3>Top 20 Clientes por CLV</h3>
        <p className="table-subtitle">
          Clientes ordenados por valor histórico total
        </p>
      </div>
      
      <div className="table-container">
        <table className="clv-table">
          <thead>
            <tr>
              {columns.map(column => (
                <th 
                  key={column.key}
                  className={column.sortable ? 'sortable' : ''}
                  onClick={() => column.sortable && handleSortChange(column.key as keyof SortableCustomerData)}
                >
                  {column.label}
                  {column.sortable && sortField === column.key && (
                    <span className="sort-indicator">
                      ↓
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.slice(0, 20).map((customer, index) => {
              const riskInfo = formatRiskScore(customer.clvRiskScore);
              
              return (
                <tr 
                  key={customer.customer}
                  className={onCustomerClick ? 'clickable' : ''}
                  onClick={() => onCustomerClick && onCustomerClick(customers.find(c => c.customer === customer.customer)!)}
                >
                  <td>
                    <div className="customer-info">
                      <span className="customer-name">{customer.customer}</span>
                      <span className="customer-rank">#{index + 1}</span>
                    </div>
                  </td>
                  <td>
                    <span className="customer-type">{customer.customerType}</span>
                  </td>
                  <td className="currency-cell">
                    {formatCurrency(customer.totalValue)}
                  </td>
                  <td className="number-cell">
                    {formatNumber(customer.totalOrders)}
                  </td>
                  <td className="currency-cell">
                    {formatCurrency(customer.averageTicket)}
                  </td>
                  <td className="number-cell">
                    {customer.purchaseFrequency.toFixed(2)}
                  </td>
                  <td className="number-cell">
                    {customer.customerLifespan.toFixed(1)}
                  </td>
                  <td className="date-cell">
                    {formatDate(customer.lastPurchase)}
                  </td>
                  <td>
                    <span className={`risk-badge ${riskInfo.className}`}>
                      {riskInfo.text}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
