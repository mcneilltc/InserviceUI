"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EmployeeLookup() {
  const [badgeNumber, setBadgeNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!badgeNumber || !firstName || !lastName) {
      setError('Badge number, first name and last name are required');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/employee/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badgeNumber, firstName, lastName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message || data?.message || 'Lookup failed');
        setLoading(false);
        return;
      }
      // Store result for dashboard view
      try { sessionStorage.setItem('employeeSelfData', JSON.stringify(data)); } catch (e) {}
      router.push('/employee/dashboard');
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: '2rem auto', padding: '1rem' }}>
      <h2>Employee Self-Service</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Badge Number</label>
          <input value={badgeNumber} onChange={(e) => setBadgeNumber(e.target.value)} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>First Name</label>
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Last Name</label>
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
        <button type="submit" disabled={loading}>{loading ? 'Looking up…' : 'Lookup'}</button>
      </form>
    </div>
  );
}
