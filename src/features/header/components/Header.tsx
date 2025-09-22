import Image from "next/image";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";

interface HeaderProps {
  userName?: string;
  userImage?: string;
}

/**
 * Header Component
 * 
 * This component handles:
 * - Gmail branding and menu toggle
 * - Search functionality
 * - User profile display
 * 
 * Benefits:
 * - Reusable across different pages
 * - Centralized header logic
 * - Easy to extend with new features
 */
export function Header({ userName, userImage }: HeaderProps) {
  return (
    <div className="border-b border-gray-200 bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon">
            <Image 
              src="/icons/menu.svg" 
              alt="Menu" 
              width={20} 
              height={20}
            />
          </Button>
          <div className="flex items-center space-x-2">
            <Image src="/favicon.ico" alt="Gmail" width={32} height={32} />
            <span className="text-xl font-semibold text-gray-800">
              Gmail
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search mail"
              className="w-96 pr-10"
            />
            <Image 
              src="/icons/search.svg" 
              alt="Search" 
              width={20} 
              height={20} 
              className="absolute top-2.5 right-3 text-gray-400"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={userImage ?? ""} />
              <AvatarFallback className="bg-blue-500 text-white">
                {userName?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-gray-700">
              {userName}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
