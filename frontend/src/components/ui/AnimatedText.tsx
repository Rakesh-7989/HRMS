import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

interface AnimatedTextProps {
  children: React.ReactNode;
  variant?: 'fade-in' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'scale' | 'blur';
  delay?: number;
  duration?: number;
  className?: string;
  once?: boolean;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  children,
  variant = 'fade-in',
  delay = 0,
  duration = 0.6,
  className = '',
  once = true,
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, margin: '-50px' });

  const variants = {
    'fade-in': {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
    },
    'slide-up': {
      initial: { opacity: 0, y: 30 },
      animate: { opacity: 1, y: 0 },
    },
    'slide-down': {
      initial: { opacity: 0, y: -30 },
      animate: { opacity: 1, y: 0 },
    },
    'slide-left': {
      initial: { opacity: 0, x: 30 },
      animate: { opacity: 1, x: 0 },
    },
    'slide-right': {
      initial: { opacity: 0, x: -30 },
      animate: { opacity: 1, x: 0 },
    },
    'scale': {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
    },
    'blur': {
      initial: { opacity: 0, filter: 'blur(10px)' },
      animate: { opacity: 1, filter: 'blur(0px)' },
    },
  };

  return (
    <motion.div
      ref={ref}
      initial={variants[variant].initial}
      animate={isInView ? variants[variant].animate : variants[variant].initial}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface TypewriterTextProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = 50,
  className = '',
  onComplete,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (displayedText.length < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(text.slice(0, displayedText.length + 1));
      }, speed);

      return () => clearTimeout(timeout);
    } else if (!isComplete) {
      setIsComplete(true);
      onComplete?.();
    }
  }, [displayedText, text, speed, isComplete, onComplete]);

  return (
    <span className={className}>
      {displayedText}
      {!isComplete && <span className="animate-pulse">|</span>}
    </span>
  );
};

interface StaggerTextProps {
  words: string[];
  className?: string;
  delay?: number;
}

export const StaggerText: React.FC<StaggerTextProps> = ({
  words,
  className = '',
  delay = 0.1,
}) => {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {words.map((word, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{
            delay: index * delay,
            duration: 0.5,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          {word}
        </motion.span>
      ))}
    </div>
  );
};

