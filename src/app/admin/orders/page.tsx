"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import styles from "../Admin.module.css";

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await api("/api/orders/");
        setOrders(data);
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      }
    };
    fetchOrders();
  }, []);

  return (
    <div className={styles.adminPage} suppressHydrationWarning={true}>
      <header className={styles.header}>
        <h1 className={styles.title}>Order Management</h1>
        <p className={styles.subtitle}>Monitor marketplace transactions</p>
      </header>

      <div className={styles.activityTable}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Status</th>
              <th>Price</th>
              <th>Placed At</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="text-xs opacity-50">{o.id}</td>
                <td>
                  <span className={`${styles.badge} ${styles[o.status.toLowerCase()]}`}>
                    {o.status}
                  </span>
                </td>
                <td>${o.price}</td>
                <td>{new Date(o.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
