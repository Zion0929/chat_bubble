import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserPlus, Mic, MicOff } from 'lucide-react';
import { type AICharacter } from "@/config/aiCharacters";
import { Switch } from "@/components/ui/switch";

interface User {
  id: number | string;
  name: string;
  avatar?: string;
}

interface MembersManagementProps {
  showMembers: boolean;
  setShowMembers: (show: boolean) => void;
  users: (User | AICharacter)[];
  mutedUsers: string[];
  handleToggleMute: (userId: string) => void;
  getAvatarData: (name: string) => { backgroundColor: string; text: string };
  isGroupDiscussionMode: boolean;
  onToggleGroupDiscussion: () => void;
}

export const MembersManagement = ({
  showMembers,
  setShowMembers,
  users,
  mutedUsers,
  handleToggleMute,
  getAvatarData,
  isGroupDiscussionMode,
  onToggleGroupDiscussion
}: MembersManagementProps) => {
  return (
    <Sheet open={showMembers} onOpenChange={setShowMembers}>
      <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-white backdrop-blur-md border-l border-[#84A98C]/20" style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', borderLeft: '1px solid var(--glass-border)' }}>
        <SheetHeader>
          <SheetTitle className="text-gray-900 text-xl font-medium">群聊配置</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <div className="mb-6 p-4 bg-gradient-to-br from-[#CCE8C6]/30 via-[#D8E2DC]/30 to-[#CCD5AE]/30 rounded-lg border border-[#84A98C]/20 shadow-sm" style={{ boxShadow: 'var(--card-shadow)' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-[#2D3A3A] font-medium">全员讨论模式</div>
                <div className="text-xs text-[#84A98C]">开启后全员回复讨论</div>
              </div>
              <Switch
                checked={isGroupDiscussionMode}
                onCheckedChange={onToggleGroupDiscussion}
                className="data-[state=checked]:bg-[#84A98C] data-[state=unchecked]:bg-[#CCE8C6]"
              />
            </div>
          </div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-500">当前成员（{users.length}）</span>
            <Button variant="outline" size="sm" className="border-[#84A98C]/40 text-[#84A98C] hover:bg-[#CCE8C6]/20 hover:text-[#52796F] shadow-sm" style={{ boxShadow: 'var(--card-shadow)' }}>
              <UserPlus className="w-4 h-4 mr-2" />
              添加成员
            </Button>
          </div>
          <ScrollArea className="h-[calc(100vh-150px)]">
            <div className="space-y-2 pr-4">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-2 hover:bg-[#CCE8C6]/20 rounded-lg transition-colors duration-200">
                  <div className="flex items-center gap-3">
                    <Avatar className="shadow-sm" style={{ boxShadow: 'var(--card-shadow)' }}>
                      {'avatar' in user && user.avatar ? (
                        <AvatarImage src={user.avatar} className="w-10 h-10" />
                      ) : (
                        <AvatarFallback style={{ backgroundColor: getAvatarData(user.name).backgroundColor, color: 'white' }}>
                          {user.name[0]}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-gray-900 font-medium">{user.name}</span>
                      {mutedUsers.includes(user.id as string) && (
                        <span className="text-xs text-red-500">已禁言</span>
                      )}
                    </div>
                  </div>
                  {user.name !== "我" && (
                    <div className="flex gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleMute(user.id as string)}
                              className={mutedUsers.includes(user.id as string) ? "text-red-500 hover:text-red-600 hover:bg-red-100/20" : "text-green-500 hover:text-green-600 hover:bg-green-100/20"}
                            >
                              {mutedUsers.includes(user.id as string) ? (
                                <MicOff className="w-4 h-4" />
                              ) : (
                                <Mic className="w-4 h-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="bg-white border border-[#84A98C]/20 shadow-md" style={{ boxShadow: 'var(--card-shadow)' }}>
                            {mutedUsers.includes(user.id as string) ? '取消禁言' : '禁言'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}; 