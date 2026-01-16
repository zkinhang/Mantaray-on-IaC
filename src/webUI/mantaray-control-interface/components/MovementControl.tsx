import React, { useState, useRef, useEffect } from 'react';
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

  const stopMovement = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    
    rosService.publishTwist({
      linear: { x: 0, y: 0, z: 0 },
      angular: { x: 0, y: 0, z: 0 }
    });
    
    setActiveDirection(null);
    setTimeLeft(0);
  };

  const handleMove = (direction: Direction) => {
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
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const ControlBtn = ({ dir, icon: Icon, title, className = "" }: { dir: Direction, icon: any, title: string, className?: string }) => (
    <button
      onClick={() => handleMove(dir)}
      className={`w-full aspect-square flex items-center justify-center border-2 border-k3s-border transition-all font-bold uppercase text-xs ${
        activeDirection === dir 
          ? 'bg-k3s-primary text-black border-k3s-primary scale-95' 
          : 'bg-k3s-dark text-white hover:border-k3s-primary'
      } ${className}`}
      title={title}
    >
      <Icon className="w-8 h-8" />
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-k3s-border pb-2">
        <span className="text-xs font-bold text-k3s-primary uppercase tracking-widest">Navigation Unit</span>
        {timeLeft > 0 && (
          <span className="text-[10px] font-mono bg-k3s-primary text-black px-2 py-0.5 animate-pulse">
            T-{timeLeft}s
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 max-w-[300px] mx-auto">
        <div className="empty" />
        <ControlBtn dir="forward" icon={ChevronUp} title="Forward" />
        <div className="empty" />

        <ControlBtn dir="left" icon={RotateCcw} title="Rotate Left" />
        <ControlBtn dir="stop" icon={Square} title="STOP" className="!bg-red-600/20 !text-red-500 !border-red-500 hover:!bg-red-600 hover:!text-white" />
        <ControlBtn dir="right" icon={RotateCw} title="Rotate Right" />

        <div className="empty" />
        <ControlBtn dir="backward" icon={ChevronDown} title="Backward" />
        <div className="empty" />
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <button
          onClick={() => handleMove('up')}
          className={`flex items-center justify-center gap-2 py-3 border-2 border-k3s-border transition-all font-bold uppercase text-xs ${
            activeDirection === 'up' ? 'bg-k3s-primary text-black border-k3s-primary' : 'bg-k3s-dark text-white hover:border-k3s-primary'
          }`}
        >
          <ArrowUp className="w-4 h-4" /> UP
        </button>
        <button
          onClick={() => handleMove('down')}
          className={`flex items-center justify-center gap-2 py-3 border-2 border-k3s-border transition-all font-bold uppercase text-xs ${
            activeDirection === 'down' ? 'bg-k3s-primary text-black border-k3s-primary' : 'bg-k3s-dark text-white hover:border-k3s-primary'
          }`}
        >
          <ArrowDown className="w-4 h-4" /> DOWN
        </button>
      </div>
    </div>
  );
};