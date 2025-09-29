Descrição detalhada do dash de clientes

## O que eu quero:

### 1. remova completamente o dashboard de clientes atual

### 2. crie um novo dashboard que vai ter os componentes compartilhados com a tabela sales.. mesmo css, mesmo tudo. só o conteudo dos dados que vai mudar. nao quero que recrie. quero que compartilhe. se precisar mover o componente do dash de vendas par algum lugar para compartilhar, faça isso.
Componentes:

#### 2.1. filtro: 
2.1.1. meses para ser novo: padrao 1
2.1.2. meses sem comprar para ser inativo: padrao 2
2.1.3. meses sem comprar para ser quase inativo: padrao 1

#### 2.2. cards:
2.2.1. Numero de clientes totais: clientes distintos da base
2.2.2. Numero de clientes ativos: clientes distintos da base com data de pedido maior ou igual a hoje - 30 * [filtro do item 2.1.2]
2.2.3. Taxa de retenção: clientes ativos [item 2.2.2.] / clientes totais [2.2.1]
2.2.4. Faturamento médio mensal dos clientes ativos: soma de faturamento com data maior ou igual a hoje - 30 * [filtro do item 2.1.2] dividido pelo numero de clientes ativos [2.2.2]

#### 2.3. crie um grafico de Engajamento de clientes. Nele vai ter:
2.3.1. o grafico vai ser de barras com:
	- clientes novos: clientes cuja data do primeiro pedido na historia foi maior ou igual a hoje - 30 * [filtro do item 2.1.1]
	- clientes muito ativos: clientes distintos da base com data de pedido maior ou igual a hoje - 30 * [filtro do item 2.1.3]
	- clientes quase inativos: clientes distintos da base com data de pedido menor que hoje - 30 * [filtro do item 2.1.3] e maior ou igual a que hoje - 30 * [filtro do item 2.1.2]
	- clientes inativos: clientes distintos da base com data de pedido menor que hoje - 30 * [filtro do item 2.1.3]

2.3.2. clicar no grafico e abrir modal com clientes: nesse modal eu quero que copie a estrutura dos modais da tabela de vendas. na mesma linha da descricao do item 2. copie css tudo reaproveite e compartilhe codigo.
2.3.2.1. No modal eu quero uma tabela com a lista de clientes, numero de pedidos, data do primeiro pedido, data do ultimo pedido, faturamento total e faturamento do ultimo mes.
2.3.2.2. quero botoes de ordenar igual tem nas tabelas dos modais de vendas
2.3.2.3. quero um botao para exportar para excel igual tem nos modais de vendas
2.3.2.4. quero uma legenda no grafico para indicar para clicar nas barras para ver os clientes