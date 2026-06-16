import { useEffect, useState } from 'react';
import { workerUrl } from '../lib/workerApi';

type MaintenanceResponse = {
  underMaintenance: boolean;
};

export const useUnderMaintenance = () => {
  const [underMaintenance, setUnderMaintenance] = useState<boolean>();
  useEffect(() => {
    const fetchMaintenance = async () => {
      try {
        const res = await fetch(workerUrl('/config/maintenance'));
        if (!res.ok) {
          return;
        }
        const data = (await res.json()) as MaintenanceResponse;
        setUnderMaintenance(data.underMaintenance === true);
      } catch {
        // 取得失敗時はメンテナンス扱いにしない（既定の通常表示を維持）
      }
    };
    fetchMaintenance();
  }, []);

  return underMaintenance;
};
