import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

type ApiKey = {
  id: string;
  label: string | null;
  revoked: boolean;
  createdAt: string;
};

export type Price = {
  id: string;
  label: string;
  amount: string;
  currency: string;
  createdAt: string;
};

export type Product = {
  id: string;
  name: string;
  description?: string;
  image?: string | null;
  createdAt: string;
  prices: Price[];
};

type UserDashboard = {
  id: string;
  email: string;
  name?: string | null;
  pubKey: string[];
  apiKeys: ApiKey[];
  products: Product[];
  invoices: any[];
};

export interface DashboardContextType {
  userData: UserDashboard | null;
  loading: boolean;
  refreshData: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType>({
  userData: null,
  loading: true,
  refreshData: async () => {},
});

export const DashboardProvider = ({ children }: { children: React.ReactElement}) => {
  const [userData, setUserData] = useState<UserDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/user/dashboard`,
        {
          headers: {
            Authorization: localStorage.getItem("jwtToken") || "",
          },
        }
      );
      setUserData(res.data.user);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <DashboardContext.Provider
      value={{
        userData,
        loading,
        refreshData: fetchDashboardData,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => useContext(DashboardContext);
