import React, { useState, useEffect, useRef, memo } from 'react';
import { Play, Pause, RotateCcw, Clock, Timer } from 'lucide-react';

export const CountdownTimer: React.FC = memo(() => {
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const savedTime = localStorage.getItem('mantaray_timer_timeLeft');
    const savedActive = localStorage.getItem('mantaray_timer_isActive') === 'true';
    const lastUpdate = localStorage.getItem('mantaray_timer_lastUpdate');
    
    if (savedTime && savedActive && lastUpdate) {
      const elapsed = Math.floor((Date.now() - parseInt(lastUpdate)) / 1000);
      return Math.max(0, parseInt(savedTime) - elapsed);
    }
    return savedTime ? parseInt(savedTime) : 0;
  });

  const [isActive, setIsActive] = useState<boolean>(() => {
    const savedActive = localStorage.getItem('mantaray_timer_isActive') === 'true';
    const savedTime = localStorage.getItem('mantaray_timer_timeLeft');
    // Don't resume if time already ran out during refresh
    if (savedActive && savedTime) {
      const lastUpdate = localStorage.getItem('mantaray_timer_lastUpdate');
      const elapsed = Math.floor((Date.now() - parseInt(lastUpdate || "0")) / 1000);
      return parseInt(savedTime) - elapsed > 0;
    }
    return false;
  });

  const [inputMinutes, setInputMinutes] = useState<string>(() => 
    localStorage.getItem('mantaray_timer_inputMinutes') || "5"
  );
  
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Optimized Persistence: Save ONLY when state changes, not recurring every second.
  // This ensures zero disk I/O during active countdown.
  const saveState = (time: number, active: boolean, mins?: string) => {
    localStorage.setItem('mantaray_timer_timeLeft', time.toString());
    localStorage.setItem('mantaray_timer_isActive', active.toString());
    localStorage.setItem('mantaray_timer_lastUpdate', Date.now().toString());
    if (mins) localStorage.setItem('mantaray_timer_inputMinutes', mins);
  };

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            setIsActive(false);
            saveState(0, false);
            return 0;
          }
          return next;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]); // Only re-run when isActive changes, not timeLeft

  const toggleTimer = () => {
    let newTime = timeLeft;
    let newActive = !isActive;

    if (!isActive && timeLeft === 0) {
      const mins = parseInt(inputMinutes) || 0;
      if (mins > 0) {
        newTime = mins * 60;
        newActive = true;
        setTimeLeft(newTime);
        setIsActive(true);
        setIsEditing(false);
      }
    } else {
      setIsActive(newActive);
    }
    
    saveState(newTime, newActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(0);
    setIsEditing(false);
    if (timerRef.current) clearInterval(timerRef.current);
    saveState(0, false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center bg-k3s-dark border border-k3s-border h-[38px] px-3 group">
      <div className="flex items-center gap-2 mr-4 border-r border-k3s-border pr-4 h-[24px]">
        <Timer className={`w-4 h-4 ${isActive ? 'text-k3s-primary animate-pulse' : 'text-k3s-muted'}`} />
        <span className="text-[10px] font-black text-k3s-muted uppercase tracking-widest hidden xl:block">MISSION TIME</span>
      </div>

      <div className="flex items-center w-[140px] justify-center">
        {timeLeft === 0 && !isActive && !isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="text-xl font-mono font-black text-k3s-muted hover:text-k3s-primary transition-colors tracking-tighter w-full text-center"
          >
            00:00
          </button>
        ) : isEditing && timeLeft === 0 ? (
          <div className="flex items-center justify-center gap-2 animate-in fade-in slide-in-from-left-1 duration-200 w-full">
            <input 
              autoFocus
              type="number" 
              value={inputMinutes}
              onChange={(e) => {
                setInputMinutes(e.target.value);
                localStorage.setItem('mantaray_timer_inputMinutes', e.target.value);
              }}
              onBlur={() => { if (!isActive) setIsEditing(false); }}
              onKeyDown={(e) => { if(e.key === 'Enter') toggleTimer(); if(e.key === 'Escape') setIsEditing(false); }}
              className="w-16 bg-k3s-block border border-k3s-primary text-white text-xs py-1 px-1 focus:outline-none font-mono text-center"
            />
            <button 
              onMouseDown={(e) => { e.preventDefault(); toggleTimer(); }}
              className="text-[10px] font-black text-k3s-primary uppercase hover:text-white transition-colors flex-shrink-0"
            >
              SET
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full font-mono font-black tracking-tighter tabular-nums">
            <span className={`text-xl ${timeLeft < 60 && isActive ? 'text-red-500 animate-pulse' : 'text-white'} min-w-[65px] text-center`}>
              {formatTime(timeLeft)}
            </span>
            
            <div className="flex items-center gap-1 border-l border-k3s-border ml-2 pl-2">
              <button 
                onClick={toggleTimer}
                className={`p-1 hover:bg-white/5 rounded transition-colors ${isActive ? 'text-amber-500' : 'text-green-500'}`}
                title={isActive ? 'Pause' : 'Resume'}
              >
                {isActive ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              </button>
              <button 
                onClick={resetTimer}
                className="p-1 hover:bg-white/5 rounded transition-colors text-red-500"
                title="Reset"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
