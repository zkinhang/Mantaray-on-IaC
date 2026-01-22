import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown, RotateCcw, RotateCw, Square, ArrowUp, ArrowDown } from 'lucide-react';
import { Direction, TwistMessage } from '../types';
import { rosService } from '../services/rosService';

const LINEAR_SPEED = 0.5;
const ANGULAR_SPEED = 0.5;
const VERTICAL_SPEED = 0.5;
const MOVEMENT_DURATION = 10000;

export const MovementControl: React.FC = () => {
  const [activeDirection, setActiveDirection] = useState<Direction | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopMovement = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    
    rosService.publishTwist({
      linear: { x: 0, y: 0, z: 0 },
      angular: { x: 0, y: 0, z: 0 }
    });
    
    setActiveDirection(null);
    setTimeLeft(0);
  }, []);

  const handleMove = useCallback((direction: Direction) => {
    stopMovement();
    
    if (direction === 'stop') return;

    setActiveDirection(direction);
    setTimeLeft(10);

    const twist: TwistMessage = {
      linear: { x: 0, y: 0, z: 0 },
      angular: { x: 0, y: 0, z: 0 }
    };

    switch (direction) {
      case 'forward': twist.linear.x = LINEAR_SPEED; break;
      case 'backward': twist.linear.x = -LINEAR_SPEED; break;
      case 'left': twist.angular.z = ANGULAR_SPEED; break;
      case 'right': twist.angular.z = -ANGULAR_SPEED; break;
      case 'up': twist.linear.z = VERTICAL_SPEED; break;
      case 'down': twist.linear.z = -VERTICAL_SPEED; break;
    }

    rosService.publishTwist(twist);

    // Auto-stop timer
    timerRef.current = setTimeout(() => {
      stopMovement();
    }, MOVEMENT_DURATION);

    // Visual countdown
    countdownRef.current = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
  }, [stopMovement]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          handleMove('forward');
          break;
        case 's':
        case 'arrowdown':
          handleMove('backward');
          break;
        case 'a':
        case 'arrowleft':
          handleMove('left');
          break;
        case 'd':
        case 'arrowright':
          handleMove('right');
          break;
        case 'q':
          handleMove('up');
          break;
        case 'e':
          handleMove('down');
          break;
        case 'x':
        case ' ':
          e.preventDefault(); // Prevent spacebar scroll
          handleMove('stop');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [handleMove]);

  const ControlBtn = ({ dir, icon: Icon, title, hint, className = "" }: { dir: Direction, icon: any, title: string, hint?: string, className?: string }) => (
    <button
      onClick={() => handleMove(dir)}
      className={`w-full aspect-square flex flex-col items-center justify-center border-2 border-k3s-border transition-all font-bold uppercase text-xs relative ${
        activeDirection === dir 
          ? 'bg-k3s-primary text-black border-k3s-primary scale-95' 
          : 'bg-k3s-dark text-white hover:border-k3s-primary'
      } ${className}`}
      title={title}
    >
      <Icon className="w-7 h-7" />
      {hint ? (
        <span className={`absolute bottom-1 right-1 text-[8px] font-mono opacity-60 ${activeDirection === dir ? 'text-black' : 'text-k3s-primary'}`}>
          [{hint}]
        </span>
      ) : null}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-k3s-border pb-1">
        <span className="text-xs font-bold text-k3s-primary uppercase tracking-widest">Navigation Unit</span>
        {timeLeft > 0 ? (
          <span className="text-[10px] font-mono bg-k3s-primary text-black px-2 py-0.5 animate-pulse">
            T-{timeLeft}s
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
        <div className="empty" />
        <ControlBtn dir="forward" icon={ChevronUp} title="Forward" hint="W" />
        <div className="empty" />

        <ControlBtn dir="left" icon={RotateCcw} title="Rotate Left" hint="A" />
        <ControlBtn dir="stop" icon={Square} title="STOP" hint="SPC" className="!bg-red-600/20 !text-red-500 !border-red-500 hover:!bg-red-600 hover:!text-white" />
        <ControlBtn dir="right" icon={RotateCw} title="Rotate Right" hint="D" />

        <div className="empty" />
        <ControlBtn dir="backward" icon={ChevronDown} title="Backward" hint="S" />
        <div className="empty" />
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <button
          onClick={() => handleMove('up')}
          className={`flex items-center justify-center gap-2 py-3 border-2 border-k3s-border transition-all font-bold uppercase text-xs relative ${
            activeDirection === 'up' ? 'bg-k3s-primary text-black border-k3s-primary' : 'bg-k3s-dark text-white hover:border-k3s-primary'
          }`}
        >
          <ArrowUp className="w-4 h-4" /> UP
          <span className={`absolute bottom-0.5 right-1 text-[8px] font-mono opacity-60 ${activeDirection === 'up' ? 'text-black' : 'text-k3s-primary'}`}>[Q]</span>
        </button>
        <button
          onClick={() => handleMove('down')}
          className={`flex items-center justify-center gap-2 py-3 border-2 border-k3s-border transition-all font-bold uppercase text-xs relative ${
            activeDirection === 'down' ? 'bg-k3s-primary text-black border-k3s-primary' : 'bg-k3s-dark text-white hover:border-k3s-primary'
          }`}
        >
          <ArrowDown className="w-4 h-4" /> DOWN
          <span className={`absolute bottom-0.5 right-1 text-[8px] font-mono opacity-60 ${activeDirection === 'down' ? 'text-black' : 'text-k3s-primary'}`}>[E]</span>
        </button>
      </div>
    </div>
  );
};