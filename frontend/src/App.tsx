import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import ChangeRequests from './pages/ChangeRequests';
import NewChangeRequest from './pages/NewChangeRequest';
import AdminRequests from './pages/AdminRequests';
import Groups from './pages/Groups';

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/change-requests" element={<ChangeRequests />} />
          <Route path="/change-requests/new" element={<NewChangeRequest />} />
          <Route path="/admin/requests" element={<AdminRequests />} />
          <Route path="/groups" element={<Groups />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
