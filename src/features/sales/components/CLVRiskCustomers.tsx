'use client';

import { CLVRiskCustomer } from '@/features/sales/types/clv';

interface CLVRiskCustomersProps {
  riskCustomers: CLVRiskCustomer[];
  onCustomerClick?: (customer: CLVRiskCustomer) => void;
  filterParams?: {
    inactiveMonths: number;
    almostInactiveMonths: number;
  };
}

export default function CLVRiskCustomers({ 
  riskCustomers, 
  onCustomerClick,
  filterParams 
}: CLVRiskCustomersProps) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };


  const formatRiskScore = (score: number) => {
    if (score < 40) return { text: 'Baixo', className: 'risk-low', priority: 'low' };
    if (score < 70) return { text: 'Médio', className: 'risk-medium', priority: 'medium' };
    return { text: 'Alto', className: 'risk-high', priority: 'high' };
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const getDaysText = (days: number) => {
    if (days < 30) return `${days} dias`;
    if (days < 365) return `${Math.floor(days / 30)} meses`;
    return `${Math.floor(days / 365)} anos`;
  };

  if (riskCustomers.length === 0) {
    return (
      <div className="relative">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white mb-2">
            Clientes em Risco de Churn
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Nenhum cliente em risco identificado
          </p>
        </div>
        <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="text-4xl mb-4">✅</div>
            <p className="text-gray-500">Todos os clientes estão em boa situação!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-2">
          Clientes em Risco de Churn
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          {riskCustomers.length} clientes identificados com risco de abandono
          {filterParams && (
            <span className="risk-period">
              {' '}(baseado em: quase inativos ≥ {filterParams.almostInactiveMonths} meses, inativos ≥ {filterParams.inactiveMonths} meses)
            </span>
          )}
        </p>
      </div>

      <div className="table-container">
        <table className="risk-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Tipo</th>
              <th>CLV Histórico</th>
              <th>Score de Risco</th>
              <th>Último Pedido</th>
              <th>Prioridade</th>
            </tr>
          </thead>
          <tbody>
            {riskCustomers.map((customer) => {
              const riskInfo = formatRiskScore(customer.clvRiskScore);
              
              return (
                <tr 
                  key={customer.customer}
                  className={`risk-row ${riskInfo.priority} ${onCustomerClick ? 'clickable' : ''}`}
                  onClick={() => onCustomerClick && onCustomerClick(customer)}
                >
                  <td>
                    <div className="customer-info">
                      <span className="customer-name">{customer.customer}</span>
                    </div>
                  </td>
                  <td>
                    <span className="customer-type">{customer.customerType ?? 'Sem Categoria'}</span>
                  </td>
                  <td className="currency-cell">
                    {formatCurrency(customer.clvHistorical)}
                  </td>
                  <td>
                    <span className={`risk-badge ${riskInfo.className}`}>
                      {customer.clvRiskScore.toFixed(0)}%
                    </span>
                  </td>
                  <td className="date-cell">
                    {getDaysText(customer.daysSinceLastPurchase)} atrás
                  </td>
                  <td>
                    <div className="priority-info">
                      <span className="priority-icon">
                        {getPriorityIcon(riskInfo.priority)}
                      </span>
                      <span className="priority-text">
                        {riskInfo.priority === 'high' ? 'Alta' : riskInfo.priority === 'medium' ? 'Média' : 'Baixa'}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="risk-summary">
        <div className="summary-stats">
          <div className="stat">
            <span className="stat-value">{riskCustomers.filter(c => c.clvRiskScore > 70).length}</span>
            <span className="stat-label">Alto Risco</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              {formatCurrency(riskCustomers.reduce((sum, c) => sum + c.clvHistorical, 0))}
            </span>
            <span className="stat-label">CLV em Risco</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              {formatCurrency(riskCustomers.reduce((sum, c) => sum + c.clvHistorical, 0) / riskCustomers.length)}
            </span>
            <span className="stat-label">CLV Médio</span>
          </div>
        </div>
      </div>
    </div>
  );
}
