import { useState, useEffect } from 'react';

export function useFetch<T>(fetcher: () => Promise<T>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch };
}

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('bookiee_token');
    if (!token) {
      setLoading(false);
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    fetch('/api/v1/auth/me', { headers })
      .then((res) => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then((data) => {
        setUser(data);
        return fetch('/api/v1/businesses/current', { headers });
      })
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((biz) => {
        if (biz) setBusiness(biz);
      })
      .catch(() => {
        localStorage.removeItem('bookiee_token');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = (token: string, userData: any) => {
    localStorage.setItem('bookiee_token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('bookiee_token');
    setUser(null);
    setBusiness(null);
  };

  return { user, business, loading, login, logout };
}
