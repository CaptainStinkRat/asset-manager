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

  if (!stats) return <div className="loading">Loading dashboard...</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{stats.total_assets}</span>
          <span className="stat-label">Total Assets</span>
        </div>
        <div className="stat-card stat-green">
          <span className="stat-value">{stats.available_assets}</span>
          <span className="stat-label">Available</span>
        </div>
        <div className="stat-card stat-blue">
          <span className="stat-value">{stats.assigned_assets}</span>
          <span className="stat-label">Assigned</span>
        </div>
        <div className="stat-card stat-orange">
          <span className="stat-value">{stats.active_assignments}</span>
          <span className="stat-label">Active Assignments</span>
        </div>
        <div className="stat-card stat-red">
          <span className="stat-value">{stats.eol_soon}</span>
          <span className="stat-label">EOL within 90d</span>
        </div>
        <div className="stat-card stat-purple">
          <span className="stat-value">{stats.pending_requests}</span>
          <span className="stat-label">Pending Requests</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.total_users}</span>
          <span className="stat-label">Total Users</span>
        </div>
        <div className="stat-card stat-gray">
          <span className="stat-value">{stats.retired_assets}</span>
          <span className="stat-label">Retired</span>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="section">
          <h2>End-of-Life Alerts ({alerts.length})</h2>
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
                <tr key={a.asset.id}>
                  <td>
                    <a href="#" onClick={(e) => { e.preventDefault(); navigate('/assets'); }}>{a.asset.name}</a>
                  </td>
                  <td>{a.asset.category}</td>
                  <td>{a.asset.eol_date}</td>
                  <td className={a.days_remaining <= 30 ? 'text-red' : 'text-orange'}>
                    {a.days_remaining} days
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isAdmin && stats.pending_requests > 0 && (
        <div className="section">
          <h2>Action Needed</h2>
          <p>{stats.pending_requests} pending change request(s).</p>
          <button className="btn btn-primary" onClick={() => navigate('/admin/requests')}>
            Review Requests
          </button>
        </div>
      )}
    </div>
  );
}
