import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function CABar() {
  const [showCABar, setShowCABar] = useState(true);
  const [copied, setCopied] = useState(false);

  const contractAddress = "2WXbVHpK2RqA5FcU7fNzpeUTNrNoSXqT93ziEJnMpump";

  const handleCopy = () => {
    navigator.clipboard.writeText(contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!showCABar) return null;

  return (
    <AnimatePresence>
      {showCABar && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-cod-orange/20 via-cod-orange/10 to-cod-orange/20 border-b border-cod-orange/30 backdrop-blur-sm"
        >
          <div className="flex items-center justify-center gap-2 sm:gap-4 py-1.5 sm:py-2.5 px-2 sm:px-4">
            {/* Contract Address */}
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-[10px] sm:text-sm font-bold tracking-[0.1em] sm:tracking-[0.15em] text-cod-orange uppercase">
                CA:
              </span>
              <span className="text-[10px] sm:text-sm font-mono text-white/80 tracking-wider hidden sm:inline">
                {contractAddress}
              </span>
              <span className="text-[10px] sm:text-sm font-mono text-white/80 tracking-wider sm:hidden">
                {contractAddress.slice(0, 8)}...{contractAddress.slice(-6)}
              </span>
            </div>
            
            {/* Copy Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleCopy}
              className="ml-1 sm:ml-2 px-2 py-0.5 bg-cod-orange/20 border border-cod-orange/40 hover:bg-cod-orange/30 transition-colors flex items-center gap-1"
            >
              {copied ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-cod-green">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-cod-orange">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              )}
              <span className="text-[10px] sm:text-xs font-bold tracking-wider text-cod-orange uppercase">
                {copied ? "COPIED" : "COPY"}
              </span>
            </motion.button>
            
            {/* Close Button (X) */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowCABar(false)}
              className="ml-1 sm:ml-2 w-5 h-5 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 sm:w-3.5 sm:h-3.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
