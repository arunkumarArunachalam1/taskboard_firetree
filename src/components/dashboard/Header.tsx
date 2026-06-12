import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

interface UserProps {
  firstName: string;
  lastName: string;
  role: string;
}

interface NavbarProps {
  user?: UserProps;
}

const Navbar: React.FC<NavbarProps> = ({ user }) => {
  const context = useAppContext();

  // If passed as a prop, use it. Otherwise, fallback to the context.
  const displayUser = user || {
    firstName: context.firstName,
    lastName: context.lastName,
    role: Object.keys(context.roles)[0] || 'Unknown Role' // grabbing the first role from the roles object
  };

  return (
    <nav className="react-navbar">
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        <div className="navbar-brand">
          <span>Capitol Pavilion</span>
          <span className="dot">▾</span>
        </div>
        <button className="btn-checkin">Check In / Out</button>
      </div>

      {/* Right */}
      <div className="navbar-right">
        <select className="nav-select">
          <option>Active</option>
          <option>Inactive</option>
        </select>
        <input className="nav-search" placeholder="Search clients..." />
        <span className="nav-username">{`${displayUser.firstName} ${displayUser.lastName}`}</span>
        <span className="badge-role">{displayUser.role}</span>
        <button className="nav-signout">Sign Out</button>
      </div>
    </nav>
  );
};

interface PageHeaderProps { 
  onFilter?: () => void; 
  user?: UserProps;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ onFilter, user }) => (
  <div className="page-header">
    <h1 className="page-title">Welcome, {user ? `${user.firstName} ${user.lastName}` : 'Dr. Smith'}</h1>
    <button className="btn-filters" onClick={onFilter}>
      <SlidersHorizontal size={15} />
      Filters
    </button>
  </div>
);

export default Navbar;
