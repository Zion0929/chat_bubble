import React, { useEffect, useState } from 'react';
import { Avatar } from './ui/avatar';
import ReactMarkdown from 'react-markdown';
import { AICharacter } from '@/config/aiCharacters';
import '../styles/animations.css';

interface CustomCSSProperties extends React.CSSProperties {
  '--energy': string;
}

interface ChatMessageProps {
  sender: AICharacter;
  content: string;
  isAI: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ sender, content, isAI }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentEmoji, setCurrentEmoji] = useState(sender.emotionalState?.emoji || sender.defaultEmoji || '');

  useEffect(() => {
    // 入场动画
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // 根据内容分析情绪
  useEffect(() => {
    if (isAI && sender.emotionalState) {
      // 情绪分析逻辑
      const content_lower = content.toLowerCase();
      
      // 开心、兴奋
      if (content_lower.includes('哈哈') || 
          content_lower.includes('😊') || 
          content_lower.includes('太棒了') ||
          content_lower.includes('开心') ||
          content_lower.includes('好玩')) {
        setCurrentEmoji('😊');
        sender.emotionalState.mood = 'happy';
        sender.emotionalState.energy = Math.min(100, sender.emotionalState.energy + 10);
      } 
      // 思考、疑惑
      else if (content_lower.includes('？') || 
               content_lower.includes('🤔') ||
               content_lower.includes('让我想想') ||
               content_lower.includes('有意思')) {
        setCurrentEmoji('🤔');
        sender.emotionalState.mood = 'serious';
        sender.emotionalState.energy = Math.max(50, sender.emotionalState.energy - 5);
      }
      // 生气、不满
      else if (content_lower.includes('！') ||
               content_lower.includes('😠') ||
               content_lower.includes('气死') ||
               content_lower.includes('不行')) {
        setCurrentEmoji('😠');
        sender.emotionalState.mood = 'angry';
        sender.emotionalState.energy = Math.min(100, sender.emotionalState.energy + 20);
      }
      // 调皮、玩闹
      else if (content_lower.includes('嘿嘿') ||
               content_lower.includes('😋') ||
               content_lower.includes('玩') ||
               content_lower.includes('有趣')) {
        setCurrentEmoji('😋');
        sender.emotionalState.mood = 'playful';
        sender.emotionalState.energy = Math.min(100, sender.emotionalState.energy + 15);
      }
      // 兴奋、惊喜
      else if (content_lower.includes('哇') ||
               content_lower.includes('🤩') ||
               content_lower.includes('太厉害了') ||
               content_lower.includes('amazing')) {
        setCurrentEmoji('🤩');
        sender.emotionalState.mood = 'excited';
        sender.emotionalState.energy = Math.min(100, sender.emotionalState.energy + 25);
      }
      // 默认保持中性
      else {
        setCurrentEmoji(sender.defaultEmoji || '😐');
        sender.emotionalState.mood = 'neutral';
        sender.emotionalState.energy = Math.max(40, sender.emotionalState.energy - 2);
      }

      // 更新最后交互时间
      sender.emotionalState.lastInteractionTime = Date.now();
    }
  }, [content, isAI]);

  useEffect(() => {
    if (isAI && sender.emotionalState) {
      // 能量自动恢复机制
      const now = Date.now();
      const timeSinceLastInteraction = now - sender.emotionalState.lastInteractionTime;
      const recoveryRate = 5; // 每分钟恢复5点能量
      const recoveryAmount = Math.floor(timeSinceLastInteraction / 60000) * recoveryRate;
      
      if (recoveryAmount > 0) {
        sender.emotionalState.energy = Math.min(100, sender.emotionalState.energy + recoveryAmount);
        sender.emotionalState.lastInteractionTime = now;
      }

      // 如果能量太低，强制切换到中性状态
      if (sender.emotionalState.energy < 20) {
        sender.emotionalState.mood = 'neutral';
        setCurrentEmoji('😐');
      }
    }
  }, [isAI, sender.emotionalState]);

  const messageClasses = `
    flex gap-3 p-4 
    ${isAnimating ? sender.animationEffects?.entrance || 'animate-fadeIn' : ''}
    ${isAI ? 'bg-muted/50' : ''}
  `;

  const avatarClasses = `
    ${isAI && sender.animationEffects?.speaking ? sender.animationEffects.speaking : ''}
  `;

  return (
    <div className={messageClasses}>
      <div className={avatarClasses}>
        <Avatar>
          {sender.avatar ? (
            <img src={sender.avatar} alt={sender.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-primary flex items-center justify-center text-white">
              {sender.name[0]}
            </div>
          )}
        </Avatar>
        {isAI && (
          <div className="energy-indicator mt-1" style={{ '--energy': `${sender.emotionalState?.energy || 100}%` } as CustomCSSProperties} />
        )}
      </div>
      <div className="flex flex-col flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{sender.name}</span>
          {isAI && currentEmoji && (
            <span className="emoji-pop">{currentEmoji}</span>
          )}
        </div>
        <div className={`chat-message prose mt-1 ${isAI ? 'mood-transition' : ''}`}>
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}; 