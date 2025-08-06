import React, { useState } from 'react';

type SolveState = 'ok' | 'plus2' | 'dnf';

interface SolveRecord {
  id: string;
  time: number;
  scramble: string;
  timestamp: number;
  state: SolveState;
  ao5?: number | null;
  ao12?: number | null;
  inspectionTime?: number;
}

interface Session {
  id: string;
  name: string;
  createdAt: number;
  isActive: boolean;
  solves: SolveRecord[];
}

interface SessionManagerProps {
  theme: 'light' | 'dark';
  sessions: Session[];
  activeSessionId: string;
  onSessionChange: (sessionId: string) => void;
  onCreateSession: (name: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newName: string) => void;
}

const SessionManager: React.FC<SessionManagerProps> = ({
  theme,
  sessions,
  activeSessionId,
  onSessionChange,
  onCreateSession,
  onDeleteSession,
  onRenameSession
}) => {
  const [showNewSessionInput, setShowNewSessionInput] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const themeVars = {
    '--bg-primary': theme === 'light' ? '#ffffff' : '#0f0f0f',
    '--bg-secondary': theme === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 15, 15, 0.95)',
    '--bg-tertiary': theme === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(31, 31, 31, 0.8)',
    '--text-primary': theme === 'light' ? '#000000' : '#ffffff',
    '--text-secondary': theme === 'light' ? '#666666' : '#a3a3a3',
    '--text-tertiary': theme === 'light' ? '#999999' : '#737373',
    '--border-light': theme === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)',
    '--border-medium': theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
    '--hover-bg': theme === 'light' ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)',
    '--hover-bg-strong': theme === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)',
  };

  const handleCreateSession = () => {
    if (newSessionName.trim()) {
      onCreateSession(newSessionName.trim());
      setNewSessionName('');
      setShowNewSessionInput(false);
    }
  };

  const handleRename = (sessionId: string) => {
    if (editingName.trim()) {
      onRenameSession(sessionId, editingName.trim());
      setEditingSessionId(null);
      setEditingName('');
    }
  };

  const startEditing = (session: Session) => {
    setEditingSessionId(session.id);
    setEditingName(session.name);
  };

  const cancelEditing = () => {
    setEditingSessionId(null);
    setEditingName('');
  };

  return (
    <div className="space-y-3" style={{ ...themeVars } as React.CSSProperties}>
      <div className="flex items-center justify-between">
        <label 
          className="text-sm font-medium"
          style={{ color: 'var(--text-primary)' }}
        >
          Sessions
        </label>
        <button
          onClick={() => setShowNewSessionInput(true)}
          className="text-xs px-2 py-1 rounded transition-colors"
          style={{
            color: 'var(--text-secondary)',
            background: 'var(--hover-bg)',
            border: '1px solid var(--border-medium)'
          }}
        >
          + New
        </button>
      </div>

      {showNewSessionInput && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
            placeholder="Session name"
            className="flex-1 px-2 py-1 text-xs rounded border"
            style={{
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-medium)'
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') handleCreateSession();
              if (e.key === 'Escape') {
                setShowNewSessionInput(false);
                setNewSessionName('');
              }
            }}
            onKeyUp={(e) => e.stopPropagation()}
            autoFocus
          />
          <button
            onClick={handleCreateSession}
            className="px-2 py-1 text-xs rounded"
            style={{
              background: 'var(--hover-bg-strong)',
              color: 'var(--text-primary)'
            }}
          >
            ✓
          </button>
          <button
            onClick={() => {
              setShowNewSessionInput(false);
              setNewSessionName('');
            }}
            className="px-2 py-1 text-xs rounded"
            style={{
              background: 'var(--hover-bg)',
              color: 'var(--text-secondary)'
            }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="space-y-1">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
              session.id === activeSessionId ? 'ring-1' : ''
            }`}
            style={{
              background: session.id === activeSessionId 
                ? 'var(--hover-bg-strong)' 
                : 'var(--hover-bg)',
              border: session.id === activeSessionId 
                ? '1px solid var(--border-medium)'
                : '1px solid transparent'
            }}
            onClick={() => onSessionChange(session.id)}
          >
            <div className="flex-1">
              {editingSessionId === session.id ? (
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="w-full bg-transparent text-xs font-medium outline-none"
                  style={{ color: 'var(--text-primary)' }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') handleRename(session.id);
                    if (e.key === 'Escape') cancelEditing();
                  }}
                  onKeyUp={(e) => e.stopPropagation()}
                  onBlur={() => handleRename(session.id)}
                  autoFocus
                />
              ) : (
                <div>
                  <div 
                    className="text-xs font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {session.name}
                  </div>
                  <div 
                    className="text-xs"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {session.solves.length} solves
                  </div>
                </div>
              )}
            </div>
            
            {editingSessionId !== session.id && (
              <div className="flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditing(session);
                  }}
                  className="p-1 text-xs rounded transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--hover-bg-strong)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                {sessions.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete session "${session.name}"?`)) {
                        onDeleteSession(session.id);
                      }
                    }}
                    className="p-1 text-xs rounded transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                      e.currentTarget.style.color = '#ef4444';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3,6 5,6 21,6"></polyline>
                      <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SessionManager;