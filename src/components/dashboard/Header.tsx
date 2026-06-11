import React from 'react';
import { SlidersHorizontal } from 'lucide-react';

const Navbar: React.FC = () => (
  <nav className="navbar">
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
      <span className="nav-username">Dr. Smith</span>
      <span className="badge-role">Clinical Supervisor</span>
      <button className="nav-signout">Sign Out</button>
    </div>
  </nav>
);

interface PageHeaderProps { onFilter?: () => void; }

export const PageHeader: React.FC<PageHeaderProps> = ({ onFilter }) => (
  <div className="page-header">
    <h1 className="page-title">Welcome, Dr. Smith</h1>
    <button className="btn-filters" onClick={onFilter}>
      <SlidersHorizontal size={15} />
      Filters
    </button>
  </div>
);

export default Navbar;
