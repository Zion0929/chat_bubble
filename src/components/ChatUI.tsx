import React, { useState, useRef, useEffect } from 'react';
import { Send, Menu, MoreHorizontal, UserPlus, UserMinus, Users2, Users, MoreVertical, Share2, Mic, MicOff, Settings2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

import {generateAICharacters} from "@/config/aiCharacters";
import { groups } from "@/config/groups";
import type { AICharacter } from "@/config/aiCharacters";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import html2canvas from 'html2canvas';
import { SharePoster } from '@/components/SharePoster';
import { MembersManagement } from '@/components/MembersManagement';

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
const SingleAvatar = ({ user }: { user: User | AICharacter }) => {
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
const HalfAvatar = ({ user, isFirst }: { user: User, isFirst: boolean }) => {
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
const QuarterAvatar = ({ user, index }: { user: User, index: number }) => {
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
      const shedulerResponse = await fetch('/api/scheduler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: inputMessage, history: messageHistory, availableAIs: groupAiCharacters })
      });
      const shedulerData = await shedulerResponse.json();
      const selectedAIs = shedulerData.selectedAIs;
      selectedGroupAiCharacters = selectedAIs.map(ai => groupAiCharacters.find(c => c.id === ai));
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

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            //如果completeResponse为空，
            if (completeResponse.trim() === "") {
            completeResponse = "这个问题难倒我了，下一位。";
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
            });}
            break;
          }
          
          buffer += decoder.decode(value, { stream: true });
          
          let newlineIndex;
          while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
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

        // 将当前AI的回复添加到消息历史中，供下一个AI使用
        messageHistory.push({
          role: 'assistant',
          content: completeResponse,
          name: aiMessage.sender.name
        });

        // 等待一小段时间再开始下一个 AI 的回复
        if (i < groupAiCharacters.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error("发送消息失败:", error);
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessage.id 
            ? { ...msg, content: "错误: " + error.message, isError: true }
            : msg
        ));
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
      <div className="fixed inset-0 bg-gradient-to-br from-[#CCE8C6] via-[#CCD5AE] to-[#84A98C] flex items-start md:items-center justify-center overflow-hidden">
        <div className="h-full flex flex-col bg-[#F5F7F5] w-full mx-auto relative shadow-xl md:max-w-3xl md:h-[95dvh] md:my-auto md:rounded-lg">
          {/* Header */}
          <header className="bg-gradient-to-r from-[#CCE8C6] via-[#D8E2DC] to-[#CCD5AE] shadow-sm flex-none md:rounded-t-lg border-b border-[#84A98C]/20">
            <div className="flex items-center justify-between px-4 py-3">
              {/* 左侧群组信息 */}
              <div className="flex items-center gap-1.5">
                <div className="relative w-10 h-10">
                  <div className="w-full h-full overflow-hidden bg-[#F5F7F5] border border-[#84A98C]/30 rounded-lg">
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
                  <div className="absolute -bottom-0.5 -right-0.5 bg-[#52796F] w-3 h-3 border-2 border-[#F5F7F5] rounded-full"></div>
                </div>
                <div>
                  <h1 className="font-medium text-[#2D3A3A]">{group.name}</h1>
                  <p className="text-xs text-[#84A98C]">{users.length} 名成员</p>
                </div>
              </div>
              
              {/* 右侧头像组和按钮 */}
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {users.slice(0, 4).map((user) => {
                    const avatarData = getAvatarData(user.name);
                    return (
                      <TooltipProvider key={user.id}>
                        <Tooltip>
                          <TooltipTrigger>
                            <Avatar className="w-7 h-7 border-2 border-white">
                              {'avatar' in user && user.avatar ? (
                                <AvatarImage src={user.avatar} />
                              ) : (
                                <AvatarFallback style={{ backgroundColor: avatarData.backgroundColor, color: 'white' }}>
                                  {avatarData.text}
                                </AvatarFallback>
                              )}
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{user.name}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                  {users.length > 4 && (
                    <div className="w-7 h-7 rounded-full bg-[#CCE8C6]/70 flex items-center justify-center text-xs border-2 border-[#F5F7F5] text-[#84A98C] font-medium">
                      +{users.length - 4}
                    </div>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowMembers(true)}
                  className="text-[#84A98C] hover:text-[#52796F] hover:bg-[#CCE8C6]/30"
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
                    className={`flex items-start gap-2 ${message.sender.name === "我" ? "justify-end" : ""}`}>
                    {message.sender.name !== "我" && (
                      <Avatar>
                        {'avatar' in message.sender && message.sender.avatar ? (
                          <AvatarImage src={message.sender.avatar} className="w-10 h-10" />
                        ) : (
                        <AvatarFallback style={{ backgroundColor: getAvatarData(message.sender.name).backgroundColor, color: 'white' }}>
                          {message.sender.name[0]}
                        </AvatarFallback>
                        )}
                      </Avatar>
                    )}
                    <div className={message.sender.name === "我" ? "text-right" : ""}>
                      <div className="text-sm text-[#84A98C] font-medium mb-1">{message.sender.name}</div>
                      <div className={`p-3 rounded-2xl shadow-sm transition-all duration-200 chat-message inline-block max-w-[85%] min-w-[120px] ${
                        message.sender.name === "我" 
                          ? "bg-gradient-to-r from-[#84A98C] to-[#6B9080] text-[#F5F7F5] text-left ml-auto rounded-tr-md hover:shadow-md hover:from-[#6B9080] hover:to-[#84A98C]" 
                          : "bg-gradient-to-r from-[#CCE8C6]/60 to-[#D8E2DC]/60 text-[#2D3A3A] backdrop-blur-sm rounded-tl-md hover:shadow-md hover:from-[#CCE8C6]/70 hover:to-[#D8E2DC]/70"
                      }`}>
                        {message.content.length < 30 && !message.content.includes('\n') ? (
                          <span className="whitespace-pre-wrap break-words">{message.content.trim()}</span>
                        ) : (
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            className={`prose dark:prose-invert max-w-none ${
                              message.sender.name === "我" 
                                ? "text-[#F5F7F5] [&_*]:text-[#F5F7F5]" 
                                : "text-[#2D3A3A] [&_*]:text-[#2D3A3A]"
                            }
                            [&_h2]:py-1
                            [&_h2]:m-0
                            [&_h3]:py-1.5
                            [&_h3]:m-0
                            [&_p]:m-0 
                            [&_pre]:bg-[#2D3A3A]/80 
                            [&_pre]:p-2
                            [&_pre]:m-0 
                            [&_pre]:rounded-lg
                            [&_pre]:text-[#F5F7F5]
                            [&_pre]:whitespace-pre-wrap
                            [&_pre]:break-words
                            [&_pre_code]:whitespace-pre-wrap
                            [&_pre_code]:break-words
                            [&_code]:text-sm
                            [&_code]:text-[#84A98C]
                            [&_code:not(:where([class~="language-"]))]:text-[#52796F]
                            [&_code:not(:where([class~="language-"]))]:bg-transparent
                            [&_a]:text-[#52796F]
                            [&_a]:no-underline
                            [&_ul]:my-2
                            [&_ol]:my-2
                            [&_li]:my-1
                            [&_blockquote]:border-l-4
                            [&_blockquote]:border-[#84A98C]/30
                            [&_blockquote]:pl-4
                            [&_blockquote]:my-2
                            [&_blockquote]:italic
                            [&_blockquote]:text-[#52796F]`}
                          >
                            {message.content.trim()}
                          </ReactMarkdown>
                        )}
                        {message.isAI && isTyping && currentMessageRef.current === message.id && (
                          <span className="typing-indicator ml-1 text-[#84A98C]">▋</span>
                        )}
                      </div>
                    </div>
                    {message.sender.name === "我" && (
                      <Avatar>
                       {'avatar' in message.sender && message.sender.avatar ? (
                          <AvatarImage src={message.sender.avatar} className="w-10 h-10" />
                        ) : (
                        <AvatarFallback style={{ backgroundColor: getAvatarData(message.sender.name).backgroundColor, color: 'white' }}>
                          {message.sender.name[0]}
                        </AvatarFallback>
                        )}
                      </Avatar>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
                {/* QR Code */}
                <div id="qrcode" className="flex flex-col items-center hidden">
                  <img src="/img/qr.png" alt="QR Code" className="w-24 h-24" />
                  <p className="text-sm text-[#84A98C] mt-2 font-medium tracking-tight bg-[#F5F7F5]/80 px-3 py-1 rounded-full">扫码体验AI群聊</p>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Input Area */}
          <div className="bg-gradient-to-r from-[#CCE8C6]/30 via-[#D8E2DC]/30 to-[#CCD5AE]/30 border-t border-[#84A98C]/10 pb-3 pt-3 px-4 md:rounded-b-lg backdrop-blur-sm">
            <div className="flex gap-2 pb-[env(safe-area-inset-bottom)]">
              {messages.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline"
                        size="icon"
                        onClick={handleShareChat}
                        className="px-3 border-[#84A98C]/60 text-[#84A98C] hover:text-[#52796F] rounded-xl hover:bg-[#CCE8C6]/30 hover:border-[#84A98C] transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#F5F7F5] text-[#2D3A3A] border-[#84A98C]/20">
                      <p>分享聊天记录</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <Input 
                placeholder="输入消息..." 
                className="flex-1 rounded-xl border-[#84A98C]/40 focus:ring-1 focus:ring-[#84A98C] focus:border-[#84A98C] bg-[#F5F7F5]/90 placeholder:text-[#84A98C]/50 text-[#2D3A3A]"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <Button 
                onClick={handleSendMessage}
                disabled={isLoading}
                className="bg-gradient-to-r from-[#84A98C] to-[#6B9080] hover:from-[#6B9080] hover:to-[#84A98C] rounded-xl px-4 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-[#F5F7F5] border-t-transparent" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Members Management Dialog */}
        <MembersManagement 
          showMembers={showMembers}
          setShowMembers={setShowMembers}
          users={users}
          mutedUsers={mutedUsers}
          handleToggleMute={handleToggleMute}
          isGroupDiscussionMode={isGroupDiscussionMode}
          onToggleGroupDiscussion={() => setIsGroupDiscussionMode(!isGroupDiscussionMode)}
          getAvatarData={getAvatarData}
        />
      </div>

      {/* SharePoster */}
      <SharePoster 
        isOpen={showPoster}
        onClose={() => setShowPoster(false)}
        chatAreaRef={chatAreaRef}
      />
    </>
  );
};

export default ChatUI;