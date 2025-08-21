import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Image from "next/image";

export default async function Home() {
  const session = await auth();
  
  if (!session) {
    redirect("/login");
  }

  const dashboards = [
    {
      id: "faturamento",
      title: "Dashboard de Faturamento",
      description: "Visão geral do faturamento e receitas",
      status: "Disponível",
      href: "/dashboard/faturamento",
      icon: "💰",
      color: "bg-green-500"
    },
    {
      id: "vendas",
      title: "Dashboard de Vendas",
      description: "Análise de vendas por produto e margem",
      status: "Disponível",
      href: "/dashboard/vendas",
      icon: "📊",
      color: "bg-blue-500"
    },
    {
      id: "producao",
      title: "Dashboard de Produção",
      description: "Monitoramento das etapas de produção",
      status: "Em desenvolvimento",
      href: "/dashboard/producao",
      icon: "🏭",
      color: "bg-orange-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Valepan Dashboard</h1>
              <p className="text-gray-600">Sistema de gestão operacional</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Bem-vindo, <span className="font-medium">{session.user?.name}</span>
              </div>
              <Image 
                src={session.user?.image || ""} 
                alt="Avatar" 
                width={32}
                height={32}
                className="w-8 h-8 rounded-full"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Dashboards Disponíveis</h2>
          <p className="text-gray-600">Selecione um dashboard para visualizar os dados operacionais</p>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboards.map((dashboard) => (
            <div
              key={dashboard.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${dashboard.color} rounded-lg flex items-center justify-center text-white text-xl`}>
                    {dashboard.icon}
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    dashboard.status === "Disponível" 
                      ? "bg-green-100 text-green-800" 
                      : "bg-yellow-100 text-yellow-800"
                  }`}>
                    {dashboard.status}
                  </span>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {dashboard.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  {dashboard.description}
                </p>
                
                <a
                  href={dashboard.href}
                  className={`inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    dashboard.status === "Disponível"
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                  {...(dashboard.status !== "Disponível" && { "aria-disabled": true })}
                >
                  {dashboard.status === "Disponível" ? "Acessar Dashboard" : "Em breve"}
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-12">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo Rápido</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">R$ 0,00</div>
              <div className="text-sm text-gray-600">Faturamento Hoje</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-blue-600">0</div>
              <div className="text-sm text-gray-600">Pedidos Hoje</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-orange-600">0%</div>
              <div className="text-sm text-gray-600">Eficiência Produção</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-purple-600">0</div>
              <div className="text-sm text-gray-600">Produtos Ativos</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
