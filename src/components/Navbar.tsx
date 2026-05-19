import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Navbar() {
  const { loggedIn, user, isAdmin, isCompany, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <nav className="navbar">
      <Link to="/" className="brand">JobSearch</Link>
      <Link to="/">Home</Link>
      <Link to="/search">Job Listings</Link>
      {loggedIn && <Link to="/alerts">Job Alerts</Link>}
      {loggedIn && <Link to="/notifications">Notifications</Link>}
      {loggedIn && <Link to="/chat">AI Assistant</Link>}
      {(isAdmin || isCompany) && <Link to="/admin">Admin</Link>}
      <span className="spacer" />
      {loggedIn ? (
        <>
          <span className="user-info">{user?.email}</span>
          <button className="btn-nav" onClick={handleLogout}>Sign Out</button>
        </>
      ) : (
        <Link to="/login">
          <button className="btn-nav">Sign In</button>
        </Link>
      )}
    </nav>
  );
}
