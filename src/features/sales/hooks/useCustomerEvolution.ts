import { useMemo } from 'react';
import { CustomerRow } from '@/lib/sheets';
import { CustomerEvolutionData } from '@/features/sales/components/CustomerEvolutionChart';

interface UseCustomerEvolutionProps {
  rawData: CustomerRow[];
  inactiveMonths: number;
  selectedCustomerTypes: string[];
  lastPurchaseDate: Date | null;
}

export function useCustomerEvolution({
  rawData,
  inactiveMonths,
  selectedCustomerTypes,
  lastPurchaseDate,
}: UseCustomerEvolutionProps): CustomerEvolutionData[] {
  
  const evolutionData = useMemo(() => {
    if (!rawData.length || !lastPurchaseDate) return [];

    // Filtrar dados por tipo de cliente se selecionado
    const filteredData = selectedCustomerTypes.length > 0
      ? rawData.filter(row => row.customer_type && selectedCustomerTypes.includes(row.customer_type))
      : rawData;

    // Calcular o período de análise (últimos 6 meses por padrão)
    const endDate = lastPurchaseDate;
    const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 5, 1); // 6 meses atrás

    // Gerar lista de períodos (meses)
    const periods: Date[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      periods.push(new Date(currentDate));
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    const evolutionData: CustomerEvolutionData[] = [];

    for (let i = 0; i < periods.length; i++) {
      const periodDate = periods[i];
      
      // Definir períodos conforme Excel
      const ultimoDiaDoMes = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0); // Último dia do mês
      const primeiroDiaDoMes = new Date(periodDate.getFullYear(), periodDate.getMonth(), 1); // Primeiro dia do mês
      const mesesParaSerQuaseInativo = new Date(periodDate.getFullYear(), periodDate.getMonth() - 1, 1); // Primeiro dia do mês anterior
      const mesesParaSerInativo = new Date(periodDate.getFullYear(), periodDate.getMonth() - inactiveMonths, 1); // Primeiro dia do mês - inactiveMonths

      // 1. Clientes que fizeram compra no mês atual
      // UNIQUE(FILTER(A2:A;F2:F>=$H$4;F2:F<=$H$2))
      const clientesQueCompraramNoMes = new Set<string>();
      filteredData.forEach(row => {
        if (row.first_purchase) {
          const purchaseDate = new Date(row.first_purchase);
          if (purchaseDate >= primeiroDiaDoMes && purchaseDate <= ultimoDiaDoMes) {
            clientesQueCompraramNoMes.add(row.customer);
          }
        }
      });

      // 2. Para cada cliente que comprou no mês, encontrar último pedido anterior
      // MÁXIMO(FILTER(F:F;A:A=H10;F:F<=$H$4))
      const ultimoPedidoAnteriorPorCliente = new Map<string, Date | null>();
      clientesQueCompraramNoMes.forEach(customer => {
        let ultimoPedidoAnterior: Date | null = null;
        filteredData.forEach(row => {
          if (row.customer === customer && row.first_purchase) {
            const purchaseDate = new Date(row.first_purchase);
            if (purchaseDate < primeiroDiaDoMes) {
              if (!ultimoPedidoAnterior || purchaseDate > ultimoPedidoAnterior) {
                ultimoPedidoAnterior = purchaseDate;
              }
            }
          }
        });
        ultimoPedidoAnteriorPorCliente.set(customer, ultimoPedidoAnterior);
      });

      // 3. É cliente novo: É.NÃO.DISP(I10)
      // Cliente novo = não tem último pedido anterior (é erro/N/A)
      let novos = 0;
      ultimoPedidoAnteriorPorCliente.forEach((ultimoPedido) => {
        if (ultimoPedido === null) {
          novos++;
        }
      });

      // 4. É cliente mantido: SE(É.NÃO.DISP(I10);FALSO;E(I10>=$K$3;I10<$H$4))
      // Cliente mantido = tem último pedido anterior E ele está entre quase inativo e primeiro dia do mês
      let mantidos = 0;
      ultimoPedidoAnteriorPorCliente.forEach((ultimoPedido) => {
        if (ultimoPedido !== null && 
            ultimoPedido >= mesesParaSerQuaseInativo && 
            ultimoPedido < primeiroDiaDoMes) {
          mantidos++;
        }
      });

      // 5. É cliente reativado: SE(OU(J10;K10);FALSO;VERDADEIRO)
      // Cliente reativado = comprou no mês mas NÃO é novo nem mantido
      let reativados = 0;
      ultimoPedidoAnteriorPorCliente.forEach((ultimoPedido) => {
        const isNovo = ultimoPedido === null;
        const isMantido = ultimoPedido !== null && 
                         ultimoPedido >= mesesParaSerQuaseInativo && 
                         ultimoPedido < primeiroDiaDoMes;
        
        if (!isNovo && !isMantido) {
          reativados++;
        }
      });

      // 6. Clientes perdidos
      // Clientes que fizeram compra no período quase inativo: UNIQUE(FILTER(A2:A;F2:F>=$I$4;F2:F<$I$3))
      const clientesQueCompraramNoPeriodoQuaseInativo = new Set<string>();
      filteredData.forEach(row => {
        if (row.first_purchase) {
          const purchaseDate = new Date(row.first_purchase);
          if (purchaseDate >= mesesParaSerInativo && purchaseDate < mesesParaSerQuaseInativo) {
            clientesQueCompraramNoPeriodoQuaseInativo.add(row.customer);
          }
        }
      });

      // Perdidos: Desses, não voltaram até o fim do mês
      // É.NÃO.DISP(MÁXIMO(FILTER(F:F;A:A=O10;F:F>=$I$3;F:F<=$I$1)))
      let perdidos = 0;
      clientesQueCompraramNoPeriodoQuaseInativo.forEach(customer => {
        let voltouNoMes = false;
        filteredData.forEach(row => {
          if (row.customer === customer && row.first_purchase) {
            const purchaseDate = new Date(row.first_purchase);
            if (purchaseDate >= mesesParaSerQuaseInativo && purchaseDate <= ultimoDiaDoMes) {
              voltouNoMes = true;
            }
          }
        });
        if (!voltouNoMes) {
          perdidos++;
        }
      });

      // Calcular totais
      const totalStart = i === 0 ? clientesQueCompraramNoMes.size : evolutionData[i - 1].totalEnd;
      const totalEnd = totalStart + novos + reativados - perdidos;

      evolutionData.push({
        period: periodDate.toLocaleDateString('pt-BR', { 
          month: 'short', 
          year: '2-digit' 
        }),
        maintained: mantidos,
        new: novos,
        reactivated: reativados,
        lost: perdidos,
        totalStart,
        totalEnd,
        netGrowth: novos + reativados - perdidos,
      });
    }

    return evolutionData;
  }, [
    rawData,
    inactiveMonths,
    selectedCustomerTypes,
    lastPurchaseDate,
  ]);

  return evolutionData;
}

