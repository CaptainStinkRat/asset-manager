import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Stats {
  total_assets: number;
  available_assets: number;
  assigned_assets: number;
  retired_assets: number;
  eol_soon: number;
  pending_requests: number;
  total_users: number;
  active_assignments: number;
}

interface EOLAlert {
  asset: { id: number; name: string; category: string; eol_date: string };
  days_remaining: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [alerts, setAlerts] = useState<EOLAlert[]>([]);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    api.get('/dashboard/stats').then((r) => setStats(r.data));
    api.get('/dashboard/eol-alerts?days=90').then((r) => setAlerts(r.data));
  }, []);

  if (!stats) {
    return (
      <div className="loading">
        <div className="spinner" />
        Loading dashboard...
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.username}</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon indigo">&#9632;</div>
          <span className="stat-value">{stats.total_assets}</span>
          <span className="stat-label">Total Assets</span>
        </div>
        <div className="stat-card stat-green">
          <div className="stat-icon green">&#9673;</div>
          <span className="stat-value">{stats.available_assets}</span>
          <span className="stat-label">Available</span>
        </div>
        <div className="stat-card stat-blue">
          <div className="stat-icon blue">&#9641;</div>
          <span className="stat-value">{stats.assigned_assets}</span>
          <span className="stat-label">Assigned</span>
        </div>
        <div className="stat-card stat-orange">
          <div className="stat-icon orange">&#8597;</div>
          <span className="stat-value">{stats.active_assignments}</span>
          <span className="stat-label">Active Assignments</span>
        </div>
        <div className="stat-card stat-red">
          <div className="stat-icon red">&#9888;</div>
          <span className="stat-value">{stats.eol_soon}</span>
          <span className="stat-label">EOL within 90d</span>
        </div>
        <div className="stat-card stat-purple">
          <div className="stat-icon purple">&#9998;</div>
          <span className="stat-value">{stats.pending_requests}</span>
          <span className="stat-label">Pending Requests</span>
        </div>
        <div className="stat-card">
          <div className="stat-icon indigo">&#9783;</div>
          <span className="stat-value">{stats.total_users}</span>
          <span className="stat-label">Total Users</span>
        </div>
        <div className="stat-card stat-gray">
          <div className="stat-icon gray">&#10005;</div>
          <span className="stat-value">{stats.retired_assets}</span>
          <span className="stat-label">Retired</span>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="section">
          <div className="section-header">
            <h2>End-of-Life Alerts ({alerts.length})</h2>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Category</th>
                  <th>EOL Date</th>
                  <th>Days Left</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr
                    key={a.asset.id}
                    className={a.days_remaining <= 30 ? 'row-warning' : ''}
                  >
                    <td>
                      <a
                        href="/assets"
                        onClick={(e) => { e.preventDefault(); navigate('/assets'); }}
                        style={{ fontWeight: 500 }}
                      >
                        {a.asset.name}
                      </a>
                    </td>
                    <td><span className="badge badge-maintenance">{a.asset.category}</span></td>
                    <td>{a.asset.eol_date}</td>
                    <td>
                      <span className={a.days_remaining <= 30 ? 'text-red' : 'text-orange'}>
                        {a.days_remaining} days
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isAdmin && stats.pending_requests > 0 && (
        <div className="card" style={{ borderLeft: '3px solid var(--warning)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
                Pending Review Required
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                {stats.pending_requests} change request{stats.pending_requests > 1 ? 's' : ''} awaiting your decision.
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/admin/requests')}>
              Review Requests
            </button>
          </div>
        </div>
      )}

      {!alerts.length && stats.pending_requests === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <p style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>
            Everything looks good! No alerts or pending items.
          </p>
        </div>
      )}
    </div>
  );
}
