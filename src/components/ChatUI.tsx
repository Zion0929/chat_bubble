import React, { useState, useRef, useEffect } from 'react';
import {generateAICharacters} from "@/config/aiCharacters";
import { groups } from "@/config/groups";
import type { AICharacter } from "@/config/aiCharacters";

// 更新主题常量
const theme = {
  primary: '#84A98C',      // 墨绿 - 主色
  secondary: '#CCE8C6',    // 浅嫩绿 - 次要色
  tertiary: '#CCD5AE',     // 青草绿 - 第三色
  quaternary: '#D8E2DC',   // 淡青灰 - 第四色
  text: {
    primary: '#2D3A3A',    // 深色文本
    secondary: '#84A98C',  // 绿色文本
    light: '#F5F7F5',     // 浅色文本
  },
  background: {
    primary: '#F5F7F5',    // 主背景
    secondary: '#CCE8C6',  // 次要背景
    tertiary: '#D8E2DC',   // 第三背景
  },
  border: {
    primary: '#84A98C',    // 主边框
    secondary: '#CCE8C6',  // 次要边框
  },
  hover: {
    primary: '#9CB4A3',    // 主悬停色
    secondary: '#D8E2DC',  // 次要悬停色
  },
  status: {
    success: '#52796F',    // 成功状态
    error: '#B85555',      // 错误状态（带绿色调）
  }
};

// 更新头像颜色
const getAvatarData = (name: string) => {
  const colors = ['#84A98C', '#52796F', '#6B9080', '#CCD5AE', '#CCE8C6'];
  const index = (name.charCodeAt(0) + (name.charCodeAt(1) || 0 )) % colors.length;
  return {
    backgroundColor: colors[index],
    text: name[0],
  };
};

// 单个完整头像
const SingleAvatar = ({ user }: { user: any }) => {
  // 如果有头像就使用头像，否则使用默认的文字头像
  if ('avatar' in user && user.avatar) {
    return (
      <div className="w-full h-full">
        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
      </div>
    );
  }
  const avatarData = getAvatarData(user.name);
  return (
    <div 
      className="w-full h-full flex items-center justify-center text-xs text-white font-medium"
      style={{ backgroundColor: avatarData.backgroundColor }}
    >
      {avatarData.text}
    </div>
  );
};

// 左右分半头像
const HalfAvatar = ({ user, isFirst }: { user: any, isFirst: boolean }) => {
  if ('avatar' in user && user.avatar) {
    return (
      <div 
        className="w-1/2 h-full"
        style={{ 
          borderRight: isFirst ? '1px solid white' : 'none'
        }}
      >
        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
      </div>
    );
  }
  const avatarData = getAvatarData(user.name);
  return (
    <div 
      className="w-1/2 h-full flex items-center justify-center text-xs text-white font-medium"
      style={{ 
        backgroundColor: avatarData.backgroundColor,
        borderRight: isFirst ? '1px solid white' : 'none'
      }}
    >
      {avatarData.text}
    </div>
  );
};

// 四分之一头像
const QuarterAvatar = ({ user, index }: { user: any, index: number }) => {
  if ('avatar' in user && user.avatar) {
    return (
      <div 
        className="aspect-square"
        style={{ 
          borderRight: index % 2 === 0 ? '1px solid white' : 'none',
          borderBottom: index < 2 ? '1px solid white' : 'none'
        }}
      >
        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
      </div>
    );
  }
  const avatarData = getAvatarData(user.name);
  return (
    <div 
      className="aspect-square flex items-center justify-center text-[8px] text-white font-medium"
      style={{ 
        backgroundColor: avatarData.backgroundColor,
        borderRight: index % 2 === 0 ? '1px solid white' : 'none',
        borderBottom: index < 2 ? '1px solid white' : 'none'
      }}
    >
      {avatarData.text}
    </div>
  );
};

// 修改 KaTeXStyle 组件
const KaTeXStyle = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    /* 只在聊天消息内应用 KaTeX 样式 */
    .chat-message .katex-html {
      display: none;
    }
    
    .chat-message .katex {
      font: normal 1.1em KaTeX_Main, Times New Roman, serif;
      line-height: 1.2;
      text-indent: 0;
      white-space: nowrap;
      text-rendering: auto;
    }
    
    .chat-message .katex-display {
      display: block;
      margin: 1em 0;
      text-align: center;
    }
    
    /* 其他必要的 KaTeX 样式 */
    @import "katex/dist/katex.min.css";
  `}} />
);

const ChatUI = () => {
  const [group, setGroup] = useState(groups[1]);
  const [isGroupDiscussionMode, setIsGroupDiscussionMode] = useState(false);
  const groupAiCharacters = generateAICharacters(group.name).filter(character => group.members.includes(character.id));
  const [users, setUsers] = useState([
    { id: 1, name: "我" },
    ...groupAiCharacters
  ]);
  const [showMembers, setShowMembers] = useState(false);
  const [messages, setMessages] = useState([

  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingContent, setPendingContent] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const currentMessageRef = useRef<number | null>(null);
  const typewriterRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedContentRef = useRef(""); // 用于跟踪完整内容
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 添加禁言状态
  const [mutedUsers, setMutedUsers] = useState<string[]>([]);

  const abortController = new AbortController();

  const handleRemoveUser = (userId: number) => {
    setUsers(users.filter(user => user.id !== userId));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 添加禁言/取消禁言处理函数
  const handleToggleMute = (userId: string) => {
    setMutedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSendMessage = async () => {
    //判断是否Loding
    if (isLoading) return;
    if (!inputMessage.trim()) return;

    // 添加用户消息
    const userMessage = {
      id: messages.length + 1,
      sender: users[0],
      content: inputMessage,
      isAI: false
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    setPendingContent("");
    accumulatedContentRef.current = "";

    // 构建历史消息数组
    let messageHistory = messages.map(msg => ({
      role: msg.sender.name === "我" ? 'user' : 'assistant',
      content: msg.content,
      name: msg.sender.name
    }));
    let selectedGroupAiCharacters = groupAiCharacters;
    if (!isGroupDiscussionMode) {
      try {
        const shedulerResponse = await fetch('/api/scheduler', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: inputMessage, history: messageHistory, availableAIs: groupAiCharacters })
        });
        
        if (!shedulerResponse.ok) {
          throw new Error('调度器请求失败');
        }
        
        const shedulerData = await shedulerResponse.json();
        const selectedAIs = shedulerData.selectedAIs;
        selectedGroupAiCharacters = selectedAIs.map(ai => groupAiCharacters.find(c => c.id === ai)).filter(Boolean);
        
        // 如果没有选择任何AI，随机选择一个
        if (selectedGroupAiCharacters.length === 0) {
          const randomIndex = Math.floor(Math.random() * groupAiCharacters.length);
          selectedGroupAiCharacters = [groupAiCharacters[randomIndex]];
        }
      } catch (error) {
        console.error('调度器错误:', error);
        // 出错时随机选择一个AI
        const randomIndex = Math.floor(Math.random() * groupAiCharacters.length);
        selectedGroupAiCharacters = [groupAiCharacters[randomIndex]];
      }
    }
    
    for (let i = 0; i < selectedGroupAiCharacters.length; i++) {
      //禁言
      if (mutedUsers.includes(selectedGroupAiCharacters[i].id)) {
        continue;
      }
      // 创建当前 AI 角色的消息
      const aiMessage = {
        id: messages.length + 2 + i,
        sender: { id: selectedGroupAiCharacters[i].id, name: selectedGroupAiCharacters[i].name, avatar: selectedGroupAiCharacters[i].avatar },
        content: "",
        isAI: true
      };
      
      // 添加当前 AI 的消息
      setMessages(prev => [...prev, aiMessage]);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: selectedGroupAiCharacters[i].model,
            message: inputMessage,
            personality: selectedGroupAiCharacters[i].personality,
            history: messageHistory,
            index: i,
            aiName: selectedGroupAiCharacters[i].name,
            custom_prompt: selectedGroupAiCharacters[i].custom_prompt
          }),
        });

        if (!response.ok) {
          throw new Error('请求失败');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('无法获取响应流');
        }

        let buffer = '';
        let completeResponse = ''; // 用于跟踪完整的响应
        let hasReceivedContent = false;

        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              // 如果完成但没有收到任何内容，使用友好的提示
              if (completeResponse.trim() === "") {
                completeResponse = "抱歉，我现在无法回应，请稍后再试。";
                setMessages(prev => {
                  const newMessages = [...prev];
                  const aiMessageIndex = newMessages.findIndex(msg => msg.id === aiMessage.id);
                  if (aiMessageIndex !== -1) {
                    newMessages[aiMessageIndex] = {
                      ...newMessages[aiMessageIndex],
                      content: completeResponse
                    };
                  }
                  return newMessages;
                });
              }
              break;
            }
            
            buffer += decoder.decode(value, { stream: true });
            
            // 处理可能的多行数据
            let newlineIndex;
            while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
              const line = buffer.slice(0, newlineIndex);
              buffer = buffer.slice(newlineIndex + 1);
              
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.content) {
                    hasReceivedContent = true;
                    completeResponse += data.content;
                    setMessages(prev => {
                      const newMessages = [...prev];
                      const aiMessageIndex = newMessages.findIndex(msg => msg.id === aiMessage.id);
                      if (aiMessageIndex !== -1) {
                        newMessages[aiMessageIndex] = {
                          ...newMessages[aiMessageIndex],
                          content: completeResponse
                        };
                      }
                      return newMessages;
                    });
                  } 
                } catch (e) {
                  console.error('解析响应数据失败:', e);
                }
              }
            }
          }
        } catch (error) {
          console.error('读取流失败:', error);
          // 如果读取流过程中出错，但已经收到了一些内容，继续使用已收到的内容
          if (!hasReceivedContent) {
            completeResponse = "抱歉，我现在无法回应，请稍后再试。";
            setMessages(prev => {
              const newMessages = [...prev];
              const aiMessageIndex = newMessages.findIndex(msg => msg.id === aiMessage.id);
              if (aiMessageIndex !== -1) {
                newMessages[aiMessageIndex] = {
                  ...newMessages[aiMessageIndex],
                  content: completeResponse
                };
              }
              return newMessages;
            });
          }
        }

        // 如果整个过程中没有收到任何内容，使用友好的提示
        if (!hasReceivedContent) {
          completeResponse = "抱歉，我现在无法回应，请稍后再试。";
          setMessages(prev => {
            const newMessages = [...prev];
            const aiMessageIndex = newMessages.findIndex(msg => msg.id === aiMessage.id);
            if (aiMessageIndex !== -1) {
              newMessages[aiMessageIndex] = {
                ...newMessages[aiMessageIndex],
                content: completeResponse
              };
            }
            return newMessages;
          });
        }

        // 将当前AI的回复添加到消息历史中，供下一个AI使用
        messageHistory.push({
          role: 'assistant',
          content: completeResponse,
          name: aiMessage.sender.name
        });

        // 等待一小段时间再开始下一个 AI 的回复
        if (i < selectedGroupAiCharacters.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error("发送消息失败:", error);
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessage.id 
            ? { ...msg, content: "抱歉，我现在无法回应，请稍后再试。" }
            : msg
        ));
        
        // 即使出错，也添加到历史记录中，避免后续AI无法获取上下文
        messageHistory.push({
          role: 'assistant',
          content: "抱歉，我现在无法回应，请稍后再试。",
          name: aiMessage.sender.name
        });
      }
    }
    
    setIsLoading(false);
  };

  const handleCancel = () => {
    abortController.abort();
  };

  // 清理打字机效果
  useEffect(() => {
    return () => {
      if (typewriterRef.current) {
        clearInterval(typewriterRef.current);
      }
    };
  }, []);

  // 添加对聊天区域的引用
  const chatAreaRef = useRef<HTMLDivElement>(null);

  // 更新分享函数
  const [showPoster, setShowPoster] = useState(false);

  const handleShareChat = () => {
    setShowPoster(true);
  };

  return (
    <>
      <KaTeXStyle />
      <div className="fixed inset-0 bg-gradient-to-br from-[#CCE8C6] via-[#CCD5AE] to-[#84A98C] flex items-start md:items-center justify-center overflow-hidden" style={{ backgroundImage: 'var(--background-gradient)' }}>
        <div className="h-full flex flex-col bg-[#F5F7F5] w-full mx-auto relative shadow-xl md:max-w-3xl md:h-[95dvh] md:my-auto md:rounded-lg backdrop-blur-sm border border-[#84A98C]/10" style={{ boxShadow: 'var(--card-shadow)' }}>
          {/* Header */}
          <header className="bg-gradient-to-br from-[#CCE8C6] via-[#D8E2DC] to-[#CCD5AE] shadow-sm flex-none md:rounded-t-lg border-b border-[#84A98C]/20" style={{ backgroundImage: 'var(--header-gradient)' }}>
            <div className="flex items-center justify-between px-4 py-3">
              {/* 左侧群组信息 */}
              <div className="flex items-center gap-1.5">
                <div className="relative w-10 h-10">
                  <div className="w-full h-full overflow-hidden bg-[#F5F7F5] border border-[#84A98C]/30 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300" style={{ boxShadow: 'var(--card-shadow)' }}>
                    {users.length === 1 ? (
                      <SingleAvatar user={users[0]} />
                    ) : users.length === 2 ? (
                      <div className="h-full flex">
                        {users.slice(0, 2).map((user, index) => (
                          <HalfAvatar key={user.id} user={user} isFirst={index === 0} />
                        ))}
                      </div>
                    ) : users.length === 3 ? (
                      <div className="h-full flex flex-col">
                        <div className="flex h-1/2">
                          {users.slice(0, 2).map((user, index) => (
                            <HalfAvatar key={user.id} user={user} isFirst={index === 0} />
                          ))}
                        </div>
                        <div className="h-1/2 flex justify-center">
                          <SingleAvatar user={users[2]} />
                        </div>
                      </div>
                    ) : (
                      <div className="h-full grid grid-cols-2">
                        {users.slice(0, 4).map((user, index) => (
                          <QuarterAvatar key={user.id} user={user} index={index} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 bg-[#52796F] w-3 h-3 border-2 border-[#F5F7F5] rounded-full shadow-sm"></div>
                </div>
                <div>
                  <h1 className="font-medium text-[#2D3A3A] hover:text-[#52796F] transition-colors">{group.name}</h1>
                  <p className="text-xs text-[#84A98C] hover:text-[#52796F] transition-colors">{users.length} 名成员</p>
                </div>
              </div>
              
              {/* 右侧头像组和按钮 */}
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {users.slice(0, 4).map((user) => {
                    const avatarData = getAvatarData(user.name);
                    return (
                      <div key={user.id} className="w-7 h-7 rounded-full bg-[#CCE8C6]/80 flex items-center justify-center text-xs border-2 border-[#F5F7F5] text-[#84A98C] font-medium shadow-sm hover:shadow-md transition-shadow duration-300" style={{ boxShadow: 'var(--card-shadow)' }}>
                        {avatarData.text}
                      </div>
                    );
                  })}
                  {users.length > 4 && (
                    <div className="w-7 h-7 rounded-full bg-[#CCE8C6]/80 flex items-center justify-center text-xs border-2 border-[#F5F7F5] text-[#84A98C] font-medium shadow-sm hover:shadow-md transition-shadow duration-300" style={{ boxShadow: 'var(--card-shadow)' }}>
                      +{users.length - 4}
                    </div>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowMembers(true)}
                  className="text-[#84A98C] hover:text-[#52796F] hover:bg-[#CCE8C6]/40 transition-colors"
                >
                  <Settings2 className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </header>

          {/* Main Chat Area */}
          <div className="flex-1 overflow-hidden bg-gradient-to-b from-[#F5F7F5] to-[#F5F7F5]/95">
            <ScrollArea className="h-full p-2" ref={chatAreaRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} 
                    className={`flex items-start gap-2 ${message.sender.name === "我" ? "justify-end" : ""}`}
                    data-sender={message.sender.name}>
                    {message.sender.name !== "我" && (
                      <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-[#84A98C] flex items-center justify-center text-white">
                        {'avatar' in message.sender && message.sender.avatar ? (
                          <img src={message.sender.avatar} alt={message.sender.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{message.sender.name[0]}</span>
                        )}
                      </div>
                    )}
                    <div className={`${message.sender.name === "我" ? "text-right" : ""} flex-1`}>
                      <div className="text-sm text-[#84A98C] font-medium mb-1">{message.sender.name}</div>
                      <div className={`p-3 rounded-2xl shadow-sm transition-all duration-300 inline-block max-w-[85%] min-w-[120px] ${
                        message.sender.name === "我" 
                          ? "bg-[#84A98C] text-[#F5F7F5] text-left ml-auto rounded-tr-md" 
                          : "bg-[#CCE8C6] text-[#2D3A3A] rounded-tl-md"
                      }`}>
                        {message.content.length < 30 && !message.content.includes('\n') ? (
                          <span className="break-words whitespace-normal">{message.content.trim()}</span>
                        ) : (
                          <div className={message.sender.name === "我" ? "text-[#F5F7F5]" : "text-[#2D3A3A]"}>
                            {message.content.trim()}
                          </div>
                        )}
                        {message.isAI && isTyping && currentMessageRef.current === message.id && (
                          <span className="ml-1 text-[#84A98C]">▋</span>
                        )}
                      </div>
                    </div>
                    {message.sender.name === "我" && (
                      <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-[#84A98C] flex items-center justify-center text-white">
                        {'avatar' in message.sender && message.sender.avatar ? (
                          <img src={message.sender.avatar} alt={message.sender.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{message.sender.name[0]}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
                {/* QR Code */}
                <div id="qrcode" className="flex flex-col items-center hidden">
                  <img src="/img/qr.png" alt="QR Code" className="w-24 h-24 shadow-md rounded-lg" style={{ boxShadow: 'var(--card-shadow)' }} />
                  <p className="text-sm text-[#84A98C] mt-2 font-medium tracking-tight bg-[#F5F7F5]/80 px-3 py-1 rounded-full shadow-sm" style={{ boxShadow: 'var(--card-shadow)' }}>扫码体验AI群聊</p>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Input Area */}
          <div className="bg-[#F5F7F5] border-t border-[#84A98C]/20 pb-3 pt-3 px-4 md:rounded-b-lg">
            <div className="flex gap-2 pb-[env(safe-area-inset-bottom)]">
              {messages.length > 0 && (
                <button 
                  onClick={handleShareChat}
                  className="px-3 h-10 border border-[#84A98C]/60 text-[#84A98C] hover:text-[#52796F] rounded-xl hover:bg-[#CCE8C6]/40 hover:border-[#84A98C] transition-colors shadow-sm flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3"></circle>
                    <circle cx="6" cy="12" r="3"></circle>
                    <circle cx="18" cy="19" r="3"></circle>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                  </svg>
                </button>
              )}
              <input 
                type="text"
                placeholder="输入消息..." 
                className="flex-1 h-10 px-3 rounded-xl border border-[#84A98C]/40 focus:ring-2 focus:ring-[#84A98C]/30 focus:border-[#84A98C] bg-[#F5F7F5]/90 placeholder:text-[#84A98C]/60 text-[#2D3A3A] shadow-sm"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button 
                onClick={handleSendMessage}
                disabled={isLoading}
                className="h-10 px-4 bg-[#84A98C] hover:bg-[#6B9080] rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md text-white flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Members Management Dialog */}
        <div className={`fixed inset-y-0 right-0 w-[300px] sm:w-[400px] bg-white shadow-lg transform transition-transform duration-300 ${showMembers ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-4 border-b border-[#84A98C]/20">
            <div className="flex justify-between items-center">
              <h2 className="text-[#2D3A3A] text-xl font-medium">群聊配置</h2>
              <button 
                onClick={() => setShowMembers(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F7F5]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
          <div className="p-4">
            <div className="mb-6 p-4 bg-[#F5F7F5] rounded-lg border border-[#84A98C]/20 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-[#2D3A3A] font-medium">全员讨论模式</div>
                  <div className="text-xs text-[#84A98C]">开启后全员回复讨论</div>
                </div>
                <div 
                  className={`w-10 h-5 rounded-full relative cursor-pointer ${isGroupDiscussionMode ? 'bg-[#84A98C]' : 'bg-[#CCE8C6]'}`}
                  onClick={() => setIsGroupDiscussionMode(!isGroupDiscussionMode)}
                >
                  <div 
                    className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${isGroupDiscussionMode ? 'translate-x-5' : 'translate-x-0.5'}`}
                  ></div>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-[#84A98C]">当前成员（{users.length}）</span>
              <button className="px-2 py-1 text-sm border border-[#84A98C]/40 text-[#84A98C] hover:bg-[#CCE8C6]/20 hover:text-[#52796F] rounded-md shadow-sm flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                  <line x1="20" y1="8" x2="20" y2="14"></line>
                  <line x1="23" y1="11" x2="17" y2="11"></line>
                </svg>
                添加成员
              </button>
            </div>
            <div className="h-[calc(100vh-250px)] overflow-auto pr-2">
              <div className="space-y-2">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-2 hover:bg-[#F5F7F5] rounded-lg transition-colors duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-[#84A98C] flex items-center justify-center text-white">
                        {'avatar' in user && user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{user.name[0]}</span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[#2D3A3A] font-medium">{user.name}</span>
                        {mutedUsers.includes(user.id as string) && (
                          <span className="text-xs text-red-500">已禁言</span>
                        )}
                      </div>
                    </div>
                    {user.name !== "我" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleMute(user.id as string)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            mutedUsers.includes(user.id as string) 
                              ? "text-red-500 hover:bg-red-100/20" 
                              : "text-green-500 hover:bg-green-100/20"
                          }`}
                        >
                          {mutedUsers.includes(user.id as string) ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="1" y1="1" x2="23" y2="23"></line>
                              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                              <line x1="12" y1="19" x2="12" y2="23"></line>
                              <line x1="8" y1="23" x2="16" y2="23"></line>
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                              <line x1="12" y1="19" x2="12" y2="23"></line>
                              <line x1="8" y1="23" x2="16" y2="23"></line>
                            </svg>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SharePoster */}
      <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${showPoster ? 'opacity-100 visible' : 'opacity-0 invisible'} transition-opacity duration-300`}>
        <div className="bg-white rounded-lg max-w-[90vw] max-h-[90vh] overflow-auto p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[#2D3A3A] text-xl font-medium">分享聊天记录</h2>
            <button 
              onClick={() => setShowPoster(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F7F5]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="flex items-center justify-center">
            <button className="px-4 py-2 bg-[#84A98C] text-white rounded-md shadow-sm hover:bg-[#6B9080] transition-colors">
              保存聊天海报
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatUI;