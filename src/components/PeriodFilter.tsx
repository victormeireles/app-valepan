'use client';

import { useState } from 'react';

interface PeriodFilterProps {
  currentPeriod: {
    start: string;
    end: string;
  };
  onApply: (start: string, end: string) => void;
  onPreset: (preset: 'thisMonth' | 'lastMonth') => void;
}

export default function PeriodFilter({ currentPeriod, onApply, onPreset }: PeriodFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState(currentPeriod.start);
  const [endDate, setEndDate] = useState(currentPeriod.end);

  const handleApply = () => {
    if (startDate && endDate && startDate <= endDate) {
      onApply(startDate, endDate);
      setIsOpen(false);
    }
  };

  const handlePreset = (preset: 'thisMonth' | 'lastMonth') => {
    onPreset(preset);
    setIsOpen(false);
  };

  const formatDateRange = (start: string, end: string) => {
    const startFormatted = new Date(start).toLocaleDateString('pt-BR');
    const endFormatted = new Date(end).toLocaleDateString('pt-BR');
    return `${startFormatted} - ${endFormatted}`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <span className="mr-2">📅</span>
        Período: {formatDateRange(currentPeriod.start, currentPeriod.end)}
        <span className="ml-2">▼</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border border-gray-200 z-10">
          <div className="p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Selecionar Período</h3>
            
            {/* Presets */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Períodos Predefinidos
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => handlePreset('thisMonth')}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                >
                  Este mês
                </button>
                <button
                  onClick={() => handlePreset('lastMonth')}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                >
                  Mês passado
                </button>
              </div>
            </div>

            {/* Custom dates */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Período Personalizado
              </label>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Data Início</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Data Fim</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleApply}
                disabled={!startDate || !endDate || startDate > endDate}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
