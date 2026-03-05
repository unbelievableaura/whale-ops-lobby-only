import { useEffect, useRef, useState } from "react";

export default function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(true); // Start as playing
  const [volume, setVolume] = useState(0.3);
  const [showControls, setShowControls] = useState(false);

  // Try to autoplay on mount
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;
      // Try to play immediately
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsPlaying(true);
        }).catch((error) => {
          // Autoplay was blocked, wait for user interaction
          console.log('Autoplay blocked, waiting for interaction:', error);
          setIsPlaying(false);
          
          const handleInteraction = () => {
            audio.play().then(() => {
              setIsPlaying(true);
              // Remove listeners after successful play
              document.removeEventListener('click', handleInteraction);
              document.removeEventListener('keydown', handleInteraction);
              document.removeEventListener('touchstart', handleInteraction);
            }).catch(console.error);
          };

          document.addEventListener('click', handleInteraction);
          document.addEventListener('keydown', handleInteraction);
          document.addEventListener('touchstart', handleInteraction);
        });
      }
    }
  }, []);

  // Update volume when slider changes
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;
    }
  }, [volume]);

  // Toggle mute/unmute
  const toggleMute = () => {
    const audio = audioRef.current;
    if (audio) {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play().then(() => {
          setIsPlaying(true);
        }).catch(console.error);
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  return (
    <>
      <audio
        ref={audioRef}
        src="/images/menu-theme.mp3"
        loop
        preload="auto"
        autoPlay
      />
      
      {/* Sound Controls - Fixed position bottom left */}
      <div 
        className="fixed bottom-3 left-3 z-50 flex items-center gap-1.5"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {/* Mute/Unmute Button - Now on the left */}
        <button
          onClick={toggleMute}
          className="w-8 h-8 bg-black/80 border border-white/20 rounded-full flex items-center justify-center hover:bg-black/90 hover:border-cod-orange transition-all group"
          title={isPlaying ? "Mute" : "Unmute"}
        >
          {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white group-hover:text-cod-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white/50 group-hover:text-cod-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          )}
        </button>

        {/* Volume Slider - Shows on hover */}
        <div className={`flex items-center gap-1.5 bg-black/90 border border-white/20 rounded-full px-2 py-1.5 transition-all duration-300 ${showControls ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'}`}>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={handleVolumeChange}
            className="w-14 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-cod-orange [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
          />
          <span className="text-[9px] font-mono text-white/60 w-6">{Math.round(volume * 100)}%</span>
        </div>

      </div>
    </>
  );
}
