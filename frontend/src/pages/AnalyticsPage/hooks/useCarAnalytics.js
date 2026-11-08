import { useEffect, useState } from 'react';
import { getCarSummary, getCarHistory } from '../utils/analyticsUtils';

export default function useCarAnalytics(selectedCarId) {
  const [carData, setCarData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!selectedCarId) {
      setCarData([]);
      return;
    }

    async function fetchCarAnalytics() {
      setLoading(true);
      setError(null);

      try {
        const summary = await getCarSummary(selectedCarId);
        console.log('Car summary result:', summary); // Debug log

        if (summary && summary.data && Array.isArray(summary.data) && summary.data.length > 0) {
          setCarData(summary.data);
        } else {
          console.log('No car data found, setting empty array'); // Debug log
          setCarData([]);
        }
      } catch (err) {
        console.error('Error in car analytics:', err); // Debug log
        setError(err.message);
        setCarData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchCarAnalytics();
  }, [selectedCarId]);

  return { carData, loading, error };
}
