import { useState } from 'react';
import type { FilterOption } from '@/components/DashboardHeader';

// Definir interface para os dados de venda
interface SaleData {
  cliente: string;
  produto: string;
  tipo_cliente?: string;
  [key: string]: unknown;
}

interface UseDashboardFiltersProps {
  data: SaleData[];
  getCustomerTypes?: (data: SaleData[]) => string[];
  getProducts?: (data: SaleData[]) => string[];
  getCustomerTypesCount?: (data: SaleData[], type: string) => number;
  getProductsCount?: (data: SaleData[], product: string) => number;
  hasCustomerType?: boolean;
}

export function useDashboardFilters({
  data,
  getCustomerTypes,
  getProducts,
  getCustomerTypesCount,
  getProductsCount,
  hasCustomerType = false
}: UseDashboardFiltersProps) {
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedCustomerTypes, setSelectedCustomerTypes] = useState<string[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [customerTypeSearch, setCustomerTypeSearch] = useState('');

  // Dados para filtros
  const clients = [...new Set(data.map(item => item.cliente).filter(Boolean))];
  const products = getProducts ? getProducts(data) : [];
  const customerTypes = getCustomerTypes ? getCustomerTypes(data) : [];

  const filteredClients = clients.filter(client => 
    client.toLowerCase().includes(clientSearch.toLowerCase())
  );
  const filteredProducts = products.filter(product => 
    product.toLowerCase().includes(productSearch.toLowerCase())
  );
  const filteredCustomerTypes = customerTypes.filter(type => 
    type.toLowerCase().includes(customerTypeSearch.toLowerCase())
  );

  const filters: FilterOption[] = [
    {
      id: 'period',
      label: 'Período',
      type: 'period',
      selectedValues: [periodStart, periodEnd],
      onSelectionChange: (values: string[]) => {
        setPeriodStart(values[0] || '');
        setPeriodEnd(values[1] || '');
      },
      presets: [
        {
          label: 'Este mês',
          action: () => {
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            setPeriodStart(firstDay.toISOString().split('T')[0]);
            setPeriodEnd(lastDay.toISOString().split('T')[0]);
          }
        },
        {
          label: 'Mês passado',
          action: () => {
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
            setPeriodStart(firstDay.toISOString().split('T')[0]);
            setPeriodEnd(lastDay.toISOString().split('T')[0]);
          }
        }
      ]
    },
    {
      id: 'clients',
      label: 'Clientes',
      type: 'select',
      options: filteredClients,
      selectedValues: selectedClients,
      searchValue: clientSearch,
      onSearchChange: setClientSearch,
      onSelectionChange: setSelectedClients,
      count: (client: string) => data.filter(item => item.cliente === client).length
    },
    {
      id: 'products',
      label: 'Produtos',
      type: 'select',
      options: filteredProducts,
      selectedValues: selectedProducts,
      searchValue: productSearch,
      onSearchChange: setProductSearch,
      onSelectionChange: setSelectedProducts,
      count: (product: string) => getProductsCount ? getProductsCount(data, product) : data.filter(item => item.produto === product).length
    },
    ...(hasCustomerType ? [{
      id: 'customerType',
      label: 'Tipos de Cliente',
      type: 'select' as const,
      options: filteredCustomerTypes,
      selectedValues: selectedCustomerTypes,
      searchValue: customerTypeSearch,
      onSearchChange: setCustomerTypeSearch,
      onSelectionChange: setSelectedCustomerTypes,
      count: (type: string) => getCustomerTypesCount ? getCustomerTypesCount(data, type) : data.filter(item => item.tipo_cliente === type).length,
      show: customerTypes.length > 0
    }] : [])
  ];

  return {
    filters,
    periodStart,
    periodEnd,
    selectedClients,
    selectedProducts,
    selectedCustomerTypes,
    setPeriodStart,
    setPeriodEnd,
    setSelectedClients,
    setSelectedProducts,
    setSelectedCustomerTypes
  };
}
