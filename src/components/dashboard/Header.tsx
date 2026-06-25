import React from 'react';
import { SlidersHorizontal, ChevronDown, Search, Check } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { setCurrentFacility } from '../../services/dashboard.service';

interface UserProps {
  firstName: string;
  lastName: string;
  role: string;
}

interface NavbarProps {
}

const Navbar: React.FC<NavbarProps> = () => {
  const context = useAppContext();
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleFacilitySelect = (facilityId: string | number) => {
    setCurrentFacility(facilityId);
    setIsOpen(false);
  };

  const currentFacility = context.facilities?.find((fac: any) => {
    const id = fac.id !== undefined ? fac.id : fac.ID;
    return String(id) === String(context.currentFacilityID);
  });
  const currentName = currentFacility ? (currentFacility.name || (currentFacility as any).NAME) : 'Select Facility';

  const filteredFacilities = (context.facilities || []).filter((fac: any) => {
    const name = (fac.name || (fac as any).NAME || '').toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  return (
    <nav className="react-navbar">
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {context.facilities && context.facilities.length > 1 && (
        <div className="navbar-brand" style={{ padding: 0 }}>
          <div className="facility-dropdown-container" ref={containerRef}>
            <button 
              type="button"
              className="facility-dropdown-trigger" 
              onClick={() => setIsOpen(!isOpen)}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>{currentName}</span>
              <ChevronDown size={16} style={{ width: '16px', height: '16px', minWidth: '16px', minHeight: '16px', marginLeft: '8px', opacity: 0.8, flexShrink: 0, display: 'inline-block' }} />
            </button>

            {isOpen && (
              <div className="facility-dropdown-menu">
                <div className="facility-dropdown-search-container">
                  <Search size={14} style={{ width: '14px', height: '14px', minWidth: '14px', minHeight: '14px', color: '#DC2626', opacity: 0.7, flexShrink: 0, display: 'inline-block' }} />
                  <input
                    type="text"
                    className="facility-dropdown-search-input"
                    placeholder="Search facility..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                  />
                </div>
                
                <div className="facility-dropdown-options">
                  {filteredFacilities.length > 0 ? (
                    filteredFacilities.map((fac: any) => {
                      const id = fac.id !== undefined ? fac.id : fac.ID;
                      const name = fac.name !== undefined ? fac.name : fac.NAME;
                      const isSelected = String(id) === String(context.currentFacilityID);
                      
                      return (
                        <div
                          key={id}
                          className={`facility-dropdown-option ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleFacilitySelect(id)}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>{name}</span>
                          {isSelected && <Check size={14} style={{ width: '14px', height: '14px', minWidth: '14px', minHeight: '14px', color: '#DC2626', flexShrink: 0, display: 'inline-block' }} />}
                        </div>
                      );
                    })
                  ) : (
                    <div className="facility-dropdown-no-results">
                      No facilities found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Right */}
      <div className="navbar-right">
      </div>
    </nav>
  );
};

interface PageHeaderProps { 
  onFilter?: () => void; 
  user?: UserProps;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ onFilter, user }) => {
  const context = useAppContext();
  const displayUser = user || {
    firstName: context.firstName,
    lastName: context.lastName,
    role: Object.keys(context.roles)[0] || 'Unknown Role'
  };

  const handleFacilityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentFacility(e.target.value);
  };

  return (
    <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
      <div>
        <h1 className="page-title" style={{ margin: 0 }}>TaskBoard (React)</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
          <span style={{ fontSize: '13px', color: 'var(--gray-text)' }}>
            Welcome, {displayUser.firstName} {displayUser.lastName} ({displayUser.role})
          </span>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        {context.facilities && context.facilities.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-text)' }}>Facility:</span>
            <select
              value={context.currentFacilityID}
              onChange={handleFacilityChange}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: '#fff',
                color: 'var(--text)',
                fontSize: '13px',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
                minWidth: '180px'
              }}
            >
              {context.facilities.map((fac) => (
                <option key={fac.id} value={fac.id}>
                  {fac.name}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {onFilter && (
          <button className="btn-filters" onClick={onFilter}>
            <SlidersHorizontal size={15} />
            Filters
          </button>
        )}
      </div>
    </div>
  );
};

export default Navbar;
