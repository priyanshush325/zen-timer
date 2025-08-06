import { useState, useEffect, useCallback } from 'react';

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

interface SessionManager {
  sessions: Session[];
  activeSessionId: string;
  lastUpdated: number;
}

const SESSIONS_STORAGE_KEY = 'zen-timer-sessions';
const LEGACY_HISTORY_KEY = 'zen-timer-history';

export const useSessions = () => {
  const [sessionManager, setSessionManager] = useState<SessionManager>({
    sessions: [],
    activeSessionId: '',
    lastUpdated: Date.now()
  });

  // Average calculation function
  const calculateAverage = useCallback((solves: SolveRecord[], count: number): number | null => {
    if (solves.length < count) return null;
    
    const recentSolves = solves.slice(0, count);
    const dnfCount = recentSolves.filter(solve => solve.state === 'dnf').length;
    
    if (dnfCount >= 2) return null;
    
    const actualTimes = recentSolves.map(solve => {
      if (solve.state === 'dnf') return Infinity;
      return solve.state === 'plus2' ? solve.time + 2000 : solve.time;
    });
    
    const sorted = [...actualTimes].sort((a, b) => a - b);
    const trimmed = sorted.slice(1, -1);
    const validTimes = trimmed.filter(time => time !== Infinity);
    
    if (validTimes.length === 0) return null;
    
    const sum = validTimes.reduce((acc, time) => acc + time, 0);
    return sum / validTimes.length;
  }, []);

  // Initialize sessions from localStorage
  useEffect(() => {
    const savedSessions = localStorage.getItem(SESSIONS_STORAGE_KEY);
    const legacyHistory = localStorage.getItem(LEGACY_HISTORY_KEY);
    
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        setSessionManager(parsed);
        return;
      } catch (error) {
        console.error('Failed to parse saved sessions:', error);
      }
    }
    
    // Migrate from legacy format
    if (legacyHistory) {
      try {
        const legacySolves = JSON.parse(legacyHistory);
        if (Array.isArray(legacySolves)) {
          const defaultSessionId = `session-${Date.now()}`;
          const defaultSession: Session = {
            id: defaultSessionId,
            name: 'Default Session',
            createdAt: Date.now(),
            isActive: true,
            solves: legacySolves
          };
          
          const newSessionManager: SessionManager = {
            sessions: [defaultSession],
            activeSessionId: defaultSessionId,
            lastUpdated: Date.now()
          };
          
          setSessionManager(newSessionManager);
          localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(newSessionManager));
          // Keep legacy data for now, don't remove it automatically
          return;
        }
      } catch (error) {
        console.error('Failed to migrate legacy history:', error);
      }
    }
    
    // Create default session if no data exists
    const defaultSessionId = `session-${Date.now()}`;
    const defaultSession: Session = {
      id: defaultSessionId,
      name: 'Default Session',
      createdAt: Date.now(),
      isActive: true,
      solves: []
    };
    
    const newSessionManager: SessionManager = {
      sessions: [defaultSession],
      activeSessionId: defaultSessionId,
      lastUpdated: Date.now()
    };
    
    setSessionManager(newSessionManager);
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (sessionManager.sessions.length > 0) {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessionManager));
    }
  }, [sessionManager]);

  const getActiveSession = useCallback((): Session | null => {
    return sessionManager.sessions.find(s => s.id === sessionManager.activeSessionId) || null;
  }, [sessionManager]);

  const createSession = useCallback((name: string) => {
    const newSessionId = `session-${Date.now()}`;
    const newSession: Session = {
      id: newSessionId,
      name,
      createdAt: Date.now(),
      isActive: false,
      solves: []
    };

    setSessionManager(prev => ({
      ...prev,
      sessions: [...prev.sessions, newSession],
      lastUpdated: Date.now()
    }));
  }, []);

  const switchSession = useCallback((sessionId: string) => {
    setSessionManager(prev => ({
      ...prev,
      activeSessionId: sessionId,
      sessions: prev.sessions.map(session => ({
        ...session,
        isActive: session.id === sessionId
      })),
      lastUpdated: Date.now()
    }));
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    setSessionManager(prev => {
      const remainingSessions = prev.sessions.filter(s => s.id !== sessionId);
      if (remainingSessions.length === 0) {
        // Create a new default session if all sessions are deleted
        const defaultSessionId = `session-${Date.now()}`;
        const defaultSession: Session = {
          id: defaultSessionId,
          name: 'Default Session',
          createdAt: Date.now(),
          isActive: true,
          solves: []
        };
        return {
          sessions: [defaultSession],
          activeSessionId: defaultSessionId,
          lastUpdated: Date.now()
        };
      }
      
      let newActiveSessionId = prev.activeSessionId;
      if (sessionId === prev.activeSessionId) {
        newActiveSessionId = remainingSessions[0].id;
      }
      
      return {
        ...prev,
        sessions: remainingSessions.map(session => ({
          ...session,
          isActive: session.id === newActiveSessionId
        })),
        activeSessionId: newActiveSessionId,
        lastUpdated: Date.now()
      };
    });
  }, []);

  const renameSession = useCallback((sessionId: string, newName: string) => {
    setSessionManager(prev => ({
      ...prev,
      sessions: prev.sessions.map(session =>
        session.id === sessionId
          ? { ...session, name: newName }
          : session
      ),
      lastUpdated: Date.now()
    }));
  }, []);

  const addSolveToActiveSession = useCallback((solve: SolveRecord) => {
    setSessionManager(prev => {
      const activeSession = prev.sessions.find(s => s.id === prev.activeSessionId);
      if (!activeSession) return prev;

      const updatedSolves = [solve, ...activeSession.solves];
      
      // Recalculate averages for all solves
      const solvesWithAverages = updatedSolves.map((s, index) => {
        const historyAtTime = updatedSolves.slice(index);
        const ao5 = calculateAverage(historyAtTime, 5);
        const ao12 = calculateAverage(historyAtTime, 12);
        
        return {
          ...s,
          ao5,
          ao12
        };
      });

      return {
        ...prev,
        sessions: prev.sessions.map(session =>
          session.id === prev.activeSessionId
            ? { ...session, solves: solvesWithAverages }
            : session
        ),
        lastUpdated: Date.now()
      };
    });
  }, [calculateAverage]);

  const updateSolveInActiveSession = useCallback((solveId: string, updates: Partial<SolveRecord>) => {
    setSessionManager(prev => {
      const activeSession = prev.sessions.find(s => s.id === prev.activeSessionId);
      if (!activeSession) return prev;

      const updatedSolves = activeSession.solves.map(solve =>
        solve.id === solveId ? { ...solve, ...updates } : solve
      );

      // Recalculate averages for all solves
      const solvesWithAverages = updatedSolves.map((s, index) => {
        const historyAtTime = updatedSolves.slice(index);
        const ao5 = calculateAverage(historyAtTime, 5);
        const ao12 = calculateAverage(historyAtTime, 12);
        
        return {
          ...s,
          ao5,
          ao12
        };
      });

      return {
        ...prev,
        sessions: prev.sessions.map(session =>
          session.id === prev.activeSessionId
            ? { ...session, solves: solvesWithAverages }
            : session
        ),
        lastUpdated: Date.now()
      };
    });
  }, [calculateAverage]);

  const deleteSolveFromActiveSession = useCallback((solveId: string) => {
    setSessionManager(prev => {
      const activeSession = prev.sessions.find(s => s.id === prev.activeSessionId);
      if (!activeSession) return prev;

      const updatedSolves = activeSession.solves.filter(s => s.id !== solveId);
      
      // Recalculate averages for all solves
      const solvesWithAverages = updatedSolves.map((s, index) => {
        const historyAtTime = updatedSolves.slice(index);
        const ao5 = calculateAverage(historyAtTime, 5);
        const ao12 = calculateAverage(historyAtTime, 12);
        
        return {
          ...s,
          ao5,
          ao12
        };
      });

      return {
        ...prev,
        sessions: prev.sessions.map(session =>
          session.id === prev.activeSessionId
            ? { ...session, solves: solvesWithAverages }
            : session
        ),
        lastUpdated: Date.now()
      };
    });
  }, [calculateAverage]);

  const clearActiveSession = useCallback(() => {
    setSessionManager(prev => ({
      ...prev,
      sessions: prev.sessions.map(session =>
        session.id === prev.activeSessionId
          ? { ...session, solves: [] }
          : session
      ),
      lastUpdated: Date.now()
    }));
  }, []);

  return {
    sessions: sessionManager.sessions,
    activeSessionId: sessionManager.activeSessionId,
    getActiveSession,
    createSession,
    switchSession,
    deleteSession,
    renameSession,
    addSolveToActiveSession,
    updateSolveInActiveSession,
    deleteSolveFromActiveSession,
    clearActiveSession
  };
};