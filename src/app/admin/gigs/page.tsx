"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import styles from "../Admin.module.css";

export default function AdminListings() {
  const [listings, setListings] = useState<any[]>([]);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      const data = await api("/api/listings/"); // Fetch all listings
      setListings(data);
    } catch (error) {
      console.error("Failed to fetch listings:", error);
    }
  };

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      await api(`/api/admin/listings/${id}/${action}`, { method: 'PUT' });
      fetchListings(); // Refresh list
    } catch (error) {
      alert(`Action failed: ${error}`);
    }
  };

  return (
    <div className={styles.adminPage}>
      <header className={styles.header}>
        <h1 className={styles.title}>Listing Moderation</h1>
        <p className={styles.subtitle}>Maintain platform quality and trust</p>
      </header>

      <div className={styles.activityTable}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((l) => (
              <tr key={l.id}>
                <td>{l.title}</td>
                <td>${l.price}</td>
                <td>
                  <span className={`${styles.badge} ${styles[l.status.toLowerCase()]}`}>
                    {l.status}
                  </span>
                </td>
                <td className={styles.actions}>
                  {l.status === 'PENDING' && (
                    <>
                      <button 
                        onClick={() => handleAction(l.id, 'approve')}
                        className={styles.approveBtn}
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => handleAction(l.id, 'reject')}
                        className={styles.rejectBtn}
                      >
                        Reject
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
