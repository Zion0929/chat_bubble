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
      <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-white text-[#2D3A3A]">
        <SheetHeader>
          <SheetTitle className="text-[#2D3A3A] text-xl font-medium">群聊配置</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <div className="mb-6 p-4 bg-[#F5F7F5] rounded-lg border border-[#84A98C]/20 shadow-sm">
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
            <span className="text-sm text-[#84A98C]">当前成员（{users.length}）</span>
            <Button variant="outline" size="sm" className="border-[#84A98C]/40 text-[#84A98C] hover:bg-[#CCE8C6]/20 hover:text-[#52796F] shadow-sm">
              <UserPlus className="w-4 h-4 mr-2" />
              添加成员
            </Button>
          </div>
          <ScrollArea className="h-[calc(100vh-150px)]">
            <div className="space-y-2 pr-4">
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
                          <MicOff className="w-4 h-4" />
                        ) : (
                          <Mic className="w-4 h-4" />
                        )}
                      </button>
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