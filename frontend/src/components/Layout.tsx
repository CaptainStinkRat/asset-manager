import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h2>Asset Manager</h2>
        </div>
        <div className="sidebar-user">
          <span className="user-name">{user?.username}</span>
          <span className={`user-badge ${isAdmin ? 'admin' : 'user'}`}>
            {isAdmin ? 'Admin' : 'User'}
          </span>
        </div>
        <div className="sidebar-links">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Dashboard
          </NavLink>
          <NavLink to="/assets" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Assets
          </NavLink>
          <NavLink to="/change-requests" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Change Requests
          </NavLink>
          <NavLink to="/change-requests/new" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            New Request
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin/requests" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Admin Panel
            </NavLink>
          )}
        </div>
        <div className="sidebar-footer">
          <button className="btn btn-outline btn-sm" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
