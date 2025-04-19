
import React, { useState, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MicButtonProps {
  isRecording: boolean;
  onToggleRecording: () => void;
  isDisabled?: boolean;
}

const MicButton: React.FC<MicButtonProps> = ({ 
  isRecording, 
  onToggleRecording,
  isDisabled = false 
}) => {
  const [size, setSize] = useState({ button: 120, icon: 40 });

  // Adjust button size based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setSize({ button: 90, icon: 30 });
      } else {
        setSize({ button: 120, icon: 40 });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Call once on component mount
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <button
      className={cn(
        'mic-button',
        isRecording ? 'mic-button-recording' : '',
        isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105',
        'focus:outline-none focus:ring-2 focus:ring-assistant-secondary focus:ring-opacity-50'
      )}
      style={{ 
        width: `${size.button}px`, 
        height: `${size.button}px` 
      }}
      onClick={isDisabled ? undefined : onToggleRecording}
      disabled={isDisabled}
      aria-label={isRecording ? "Stop recording" : "Start recording"}
    >
      <div 
        className={cn(
          'mic-button-inner',
          isRecording ? 'bg-assistant-secondary' : 'bg-assistant-primary',
        )}
        style={{ 
          width: `${size.button * 0.9}px`, 
          height: `${size.button * 0.9}px` 
        }}
      >
        {isRecording 
          ? <Mic size={size.icon} className="text-white" />
          : <Mic size={size.icon} className="text-assistant-text" />
        }
      </div>
    </button>
  );
};

export default MicButton;
