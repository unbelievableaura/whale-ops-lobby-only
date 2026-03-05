import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteCopy } from "@/hooks/useSiteCopy";

export default function Loading() {
  const [, setLocation] = useLocation();
  const { authenticate, isAuthenticated } = useAuth();
  const siteCopy = useSiteCopy();
  const [flickerIntensity, setFlickerIntensity] = useState(1);
  const [isEntering, setIsEntering] = useState(false);

  // If already authenticated, go directly to lobby
  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/lobby");
    }
  }, [isAuthenticated, setLocation]);

  // Random flicker effect
  useEffect(() => {
    const flickerInterval = setInterval(() => {
      // Random flicker between 0.85 and 1
      setFlickerIntensity(0.85 + Math.random() * 0.15);
    }, 100 + Math.random() * 200);

    return () => clearInterval(flickerInterval);
  }, []);

  // Listen for any key press or click to enter
  useEffect(() => {
    const handleEnter = () => {
      if (!isEntering && !isAuthenticated) {
        setIsEntering(true);
        // Authenticate the user
        authenticate();
        // Navigate to lobby after animation
        setTimeout(() => {
          setLocation("/lobby");
        }, 1500);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      handleEnter();
    };

    const handleClick = () => {
      handleEnter();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("click", handleClick);
    };
  }, [isEntering, isAuthenticated, authenticate, setLocation]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white font-rajdhani select-none cursor-pointer">
      {/* Background Image with flicker */}
      <motion.div 
        className="absolute inset-0 z-0"
        animate={{ opacity: flickerIntensity }}
        transition={{ duration: 0.05 }}
      >
        <img
          src="/images/intro-bg.png"
          alt="RED WHITE & BLUE"
          className="w-full h-full object-cover object-center"
        />
        {/* Dark overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20" />
      </motion.div>

      {/* Vignette Effect */}
      <div 
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.9) 100%)'
        }}
      />

      {/* Animated orange streaks */}
      <div className="absolute inset-0 z-5 overflow-hidden opacity-30 pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 bg-gradient-to-b from-transparent via-blue-500 to-transparent"
            style={{
              left: `${10 + i * 20}%`,
              height: '150%',
              top: '-25%',
            }}
            animate={{
              opacity: [0.2, 0.6, 0.2],
              scaleY: [1, 1.1, 1],
            }}
            transition={{
              duration: 2 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Scanline Effect */}
      <div className="absolute inset-0 z-20 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_2px,3px_100%] bg-repeat" />

      {/* Noise/Grain overlay */}
      <div className="absolute inset-0 z-15 pointer-events-none opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      {/* Main Content */}
      <div className="relative z-30 w-full h-screen flex flex-col items-center justify-center">
        
        {/* Nav Links */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex gap-6 mb-6"
        >
          <a
            href="https://pump.fun"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs sm:text-sm font-bold tracking-[0.3em] text-white/50 hover:text-white transition-colors duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            PUMP.FUN
          </a>
          <a
            href="https://t.me"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs sm:text-sm font-bold tracking-[0.3em] text-white/50 hover:text-white transition-colors duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            COMMUNITY
          </a>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mb-8 text-center w-[90%] mx-auto"
        >
          <div
            className="w-full max-w-[560px] mx-auto font-black-ops font-black tracking-[0.08em] leading-none text-[56px] sm:text-[72px] text-white"
            style={{
              filter: "drop-shadow(0 0 24px rgba(255,255,255,0.28))",
            }}
          >
            RED, WHITE & BLUE
          </div>
        </motion.div>

        {/* Press Enter Prompt */}
        {!isEntering ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="flex flex-col items-center gap-4"
          >
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="text-sm sm:text-base font-bold tracking-[0.3em] text-white/70"
          >
              {siteCopy.loadingPressAnyKey}
            </motion.div>
            
            <motion.div
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="text-xs text-white/40 tracking-widest"
          >
              {siteCopy.loadingOrClick}
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-cod-green text-lg font-bold tracking-[0.3em]"
            >
              {siteCopy.loadingEntering}
            </motion.div>
            <div className="w-48 h-1 bg-cod-green/30 overflow-hidden mt-2">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="h-full bg-cod-green"
              />
            </div>
          </motion.div>
        )}

        {/* Bottom info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-6 left-0 right-0 flex justify-between items-center px-4 sm:px-8 text-[10px] sm:text-xs text-white/30 tracking-widest"
        >
          <div>{siteCopy.loadingVersion}</div>
          <div></div>
        </motion.div>
      </div>
    </div>
  );
}
