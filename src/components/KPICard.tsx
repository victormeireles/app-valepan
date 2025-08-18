interface KPICardProps {
  title: string;
  value: string;
  change?: {
    value: string;
    type: 'positive' | 'negative' | 'neutral';
  };
  projection?: string;
  icon?: string;
  loading?: boolean;
}

export default function KPICard({ 
  title, 
  value, 
  change, 
  projection, 
  icon, 
  loading = false 
}: KPICardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-8 w-8 bg-gray-200 rounded"></div>
        </div>
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {icon && (
          <span className="text-2xl">{icon}</span>
        )}
      </div>
      
      <div className="mb-2">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        {change && (
          <div className={`flex items-center ${
            change.type === 'positive' ? 'text-green-600' : 
            change.type === 'negative' ? 'text-red-600' : 
            'text-gray-600'
          }`}>
            <span className={`mr-1 ${
              change.type === 'positive' ? '↗' : 
              change.type === 'negative' ? '↘' : 
              '→'
            }`}>
              {change.type === 'positive' ? '↗' : 
               change.type === 'negative' ? '↘' : 
               '→'}
            </span>
            {change.value}
          </div>
        )}
        
        {projection && (
          <div className="text-gray-500">
            Proj: {projection}
          </div>
        )}
      </div>
    </div>
  );
}
