import React, { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Clock, Bug, Globe } from 'lucide-react';

interface ReplayProps {
  events: any[];
  onReplay: (event: any) => void;
}

export default function ReplayTimeline({ events, onReplay }: ReplayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(e.target.value);
    setCurrentIndex(index);
    onReplay(events[index]);
  };

  return (
    <div className="glass-panel rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-syne font-bold text-soc-text flex items-center gap-2">
          <Clock className="w-5 h-5 text-soc-purple" />
          Attack Replay Timeline
        </h3>
        <div className="text-[10px] text-soc-muted font-mono uppercase">
          Step {currentIndex + 1} of {events.length}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-white/5 rounded-lg text-soc-muted">
            <SkipBack className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-3 bg-soc-purple text-white rounded-full shadow-[0_0_15px_rgba(127,119,221,0.4)]"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          <button className="p-2 hover:bg-white/5 rounded-lg text-soc-muted">
            <SkipForward className="w-4 h-4" />
          </button>
          
          <div className="flex-1 px-4">
            <input 
              type="range" 
              min="0" 
              max={events.length - 1} 
              value={currentIndex}
              onChange={handleSliderChange}
              className="w-full h-1.5 bg-soc-bg rounded-lg appearance-none cursor-pointer accent-soc-purple"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {events.slice(Math.max(0, currentIndex - 1), currentIndex + 2).map((event, i) => (
            <div 
              key={i} 
              className={`p-3 rounded-lg border transition-all duration-300 ${
                i === (currentIndex > 0 ? 1 : 0) 
                  ? 'bg-soc-purple/10 border-soc-purple shadow-[0_0_10px_rgba(127,119,221,0.2)]' 
                  : 'bg-black/20 border-white/5 opacity-40'
              }`}
            >
              <div className="flex items-center justify-between">
                 <div className="text-[10px] text-soc-muted font-mono mb-1">
                   {new Date((event.event?.timestamp) || event.timestamp).toLocaleTimeString()}
                 </div>
                 <div className="flex gap-1">
                   {event.ti_result?.malicious && (
                     <span className="text-[10px] bg-soc-cyan/20 text-soc-cyan border border-soc-cyan/30 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold" title="Threat Intel Hit">
                       <Globe className="w-3 h-3" />
                     </span>
                   )}
                   {event.malware_analysis?.is_malware && (
                     <span className="text-[10px] bg-soc-red/20 text-soc-red border border-soc-red/30 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold" title="Malware Payload">
                       <Bug className="w-3 h-3" />
                     </span>
                   )}
                 </div>
              </div>
              <div className="text-xs font-bold text-soc-text truncate">{event.event?.event_type || event.event_type || 'Unknown'}</div>
              <div className="text-[10px] text-soc-muted truncate">{event.event?.source_ip || event.source_ip || '---'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
