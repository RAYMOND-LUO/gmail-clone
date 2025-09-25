import { Button } from "~/features/shared/components/ui/button";

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
          Primary
        </Button>
        <Button
          variant="ghost"
          className="flex h-full w-[213px] justify-start rounded-none px-6 py-3 text-gray-600 hover:text-gray-900"
        >
          Promotions
        </Button>
        <Button
          variant="ghost"
          className="flex h-full w-[213px] justify-start rounded-none px-6 py-3 text-gray-600 hover:text-gray-900"
        >
          Social
        </Button>
        <Button
          variant="ghost"
          className="flex h-full w-[213px] justify-start rounded-none px-6 py-3 text-gray-600 hover:text-gray-900"
        >
          Updates
        </Button>
      </div>
    </div>
  );
}
