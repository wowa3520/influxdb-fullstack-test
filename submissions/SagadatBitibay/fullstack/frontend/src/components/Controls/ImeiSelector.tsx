
import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/api';

interface ImeiSelectorProps {
  selectedImei: string;
  onImeiChange: (imei: string) => void;
  disabled?: boolean;
}

export const ImeiSelector: React.FC<ImeiSelectorProps> = ({
  selectedImei,
  onImeiChange,
  disabled = false
}) => {
  const [imeis, setImeis] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadImeis = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiService.getImeis();
        setImeis(data);
        
        if (data.length > 0 && !selectedImei) {
          onImeiChange(data[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки IMEI');
      } finally {
        setLoading(false);
      }
    };

    loadImeis();
  }, [selectedImei, onImeiChange]);

  if (loading) {
    return <div className="text-gray-600">Загрузка IMEI...</div>;
  }

  if (error) {
    return <div className="text-red-600">Ошибка: {error}</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">
        Устройство (IMEI):
      </label>
      <select
        value={selectedImei}
        onChange={(e) => onImeiChange(e.target.value)}
        disabled={disabled || imeis.length === 0}
        className="px-2 py-2 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
      >
        <option value="">Выберите устройство</option>
        {imeis.map((imei) => (
          <option key={imei} value={imei}>
            {imei}
          </option>
        ))}
      </select>
    </div>
  );
};
