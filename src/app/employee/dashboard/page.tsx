"use client";

import React, { useEffect, useState } from 'react';

export default function EmployeeDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('employeeSelfData');
      if (raw) setData(JSON.parse(raw));
    } catch (e) {
      // ignore
    }
  }, []);

  if (!data) {
    return (
      <div style={{ maxWidth: 640, margin: '2rem auto', padding: '1rem' }}>
        <h3>No employee data found</h3>
        <p>Please complete the lookup form first.</p>
      </div>
    );
  }

  const { employee, compliance, sessions } = data;

  const color = (hours) => (hours >= 4 ? 'green' : hours >= 1 ? 'orange' : 'red');

  return (
    <div style={{ maxWidth: 800, margin: '2rem auto', padding: '1rem' }}>
      <h2>{employee.firstName} {employee.lastName}</h2>
      <div style={{ fontSize: 48, color: color(compliance.hoursThisMonth) }}>
        {compliance.hoursThisMonth} hrs
      </div>
      <div style={{ marginTop: 8 }}>{compliance.message}</div>

      <h3 style={{ marginTop: 20 }}>This month's sessions</h3>
      <ul>
        {sessions && sessions.length ? sessions.map(s => (
          <li key={s.id}>{s.date} — {s.topic} — {s.hours} hr</li>
        )) : <li>No sessions this month</li>}
      </ul>

      <h3 style={{ marginTop: 20 }}>Certifications</h3>
      <div>Pool depth: {employee.depth || 'n/a'}</div>
      <div>Expiration: {employee.certificationExpiration || 'n/a'}</div>
    </div>
  );
}
