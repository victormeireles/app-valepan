import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default async function VendasDashboard() {
  const session = await auth();
  
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-blue-600 hover:text-blue-800">
                ← Voltar
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard de Vendas</h1>
                <p className="text-gray-600">Análise de vendas por produto e margem</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {session.user?.name}
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
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Dashboard em Desenvolvimento</h2>
          <p className="text-gray-600">
            Este dashboard será integrado com os dados do Google Sheets para mostrar:
          </p>
          <ul className="mt-4 space-y-2 text-gray-600">
            <li>• Faturamento por produto</li>
            <li>• Custo por produto</li>
            <li>• Margem bruta (% e R$)</li>
            <li>• Quebra por produto/cliente</li>
            <li>• Análise de rentabilidade</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
