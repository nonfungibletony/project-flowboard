import { useState, useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { useWorkspaces } from '../hooks/useWorkspaces'

export function Sidebar() {
  const { user } = useUser()
  const { workspaces, isLoading: wsLoading } = useWorkspaces()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="org-switcher">
            <span className="org-name">{user?.firstName || 'My Corp'}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {wsLoading ? (
            <div className="workspace-switcher" style={{ fontSize: '12px', opacity: 0.5 }}>Loading workspaces…</div>
          ) : (
            <div className="workspace-switcher" style={{ fontSize: '12px', paddingBottom: '8px' }}>
              {workspaces.map((ws) => (
                <NavLink
                  key={ws.id}
                  to={`/workspaces/${ws.id}`}
                  className={({ isActive }) => `nav-item nav-small${isActive ? ' active' : ''}`}
                  style={{ paddingLeft: '16px', fontSize: '12px' }}
                >
                  <span className="workspace-dot" style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#999', marginRight: '6px' }} />
                  {ws.name}
                </NavLink>
              ))}
            </div>
          )}
        </div>
        <nav className="sidebar-nav">
          <button className="nav-item" onClick={() => setSearchOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span>Search</span>
            <kbd className="shortcut">⌘K</kbd>
          </button>
          <NavLink to="/" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} end>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            <span>Boards</span>
          </NavLink>
          <NavLink to="/members" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="5" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="11" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M1 14C1 11.5 2.5 10 5 10H11C13.5 10 15 11.5 15 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span>Members</span>
          </NavLink>
          <NavLink to="/workspaces" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="4" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M5 4V2C5 1.5 5.5 1 6 1H14C14.5 1 15 1.5 15 2V10C15 10.5 14.5 11 14 11H12" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            <span>Workspaces</span>
          </NavLink>
        </nav>
      </aside>

      {searchOpen && (
        <div className="search-overlay" onClick={() => setSearchOpen(false)}>
          <div className="search-modal" ref={searchRef} onClick={(e) => e.stopPropagation()}>
            <div className="search-input-row">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="Search boards, cards, comments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <kbd className="shortcut">ESC</kbd>
            </div>
            <div className="search-results">
              <p className="search-hint">Type to search across your boards and cards</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
