"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import styles from "../Admin.module.css";

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await api("/api/admin/users");
        setUsers(data);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };
    fetchUsers();
  }, []);

  return (
    <div className={styles.adminPage}>
      <header className={styles.header}>
        <h1 className={styles.title}>User Management</h1>
        <p className={styles.subtitle}>Control access and permissions</p>
      </header>

      <div className={styles.activityTable}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Verified</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.is_verified ? "✅" : "❌"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
