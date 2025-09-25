import { Button } from "~/features/shared/components/ui/button";
import Image from "next/image";

/**
 * EmailTabs Component
 *
 * This component handles:
 * - Email category tabs (Primary, Promotions, Social, Updates)
 * - Active tab highlighting
 * - Tab switching functionality
 */

export function EmailTabs() {
  return (
    <div className="h-[56px] bg-white">
      <div className="flex h-full">
        <Button
          variant="ghost"
          className="flex h-full w-[213px] justify-start rounded-none border-b-2 border-b-blue-500 px-6 py-3 font-medium text-blue-600"
        >
          <Image
            src="/primary.png"
            alt="Primary"
            width={20}
            height={20}
            className="mr-2"
          />
          Primary
        </Button>
        <Button
          variant="ghost"
          className="flex h-full w-[213px] justify-start rounded-none px-6 py-3 text-gray-600 hover:text-gray-900"
        >
          <Image
            src="/promotions.png"
            alt="Promotions"
            width={20}
            height={20}
            className="mr-2"
          />
          Promotions
        </Button>
        <Button
          variant="ghost"
          className="flex h-full w-[213px] justify-start rounded-none px-6 py-3 text-gray-600 hover:text-gray-900"
        >
          <Image
            src="/social.png"
            alt="Social"
            width={20}
            height={20}
            className="mr-2"
          />
          Social
        </Button>
        <Button
          variant="ghost"
          className="flex h-full w-[213px] justify-start rounded-none px-6 py-3 text-gray-600 hover:text-gray-900"
        >
          <Image
            src="/updates.png"
            alt="Updates"
            width={20}
            height={20}
            className="mr-2"
          />
          Updates
        </Button>
      </div>
    </div>
  );
}
