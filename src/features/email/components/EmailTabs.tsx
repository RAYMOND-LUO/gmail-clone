import { Button } from "~/components/ui/button";

/**
 * EmailTabs Component
 * 
 * This component handles:
 * - Email category tabs (Primary, Promotions, Social, Updates)
 * - Active tab highlighting
 * - Tab switching functionality
 * 
 * Benefits:
 * - Reusable across different email views
 * - Centralized tab logic
 * - Easy to extend with new categories
 */
export function EmailTabs() {
  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="flex">
        <Button 
          variant="ghost" 
          className="rounded-none border-b-2 border-b-blue-500 text-blue-600 font-medium px-6 py-3"
        >
          Primary
        </Button>
        <Button 
          variant="ghost" 
          className="rounded-none text-gray-600 hover:text-gray-900 px-6 py-3"
        >
          Promotions
        </Button>
        <Button 
          variant="ghost" 
          className="rounded-none text-gray-600 hover:text-gray-900 px-6 py-3"
        >
          Social
        </Button>
        <Button 
          variant="ghost" 
          className="rounded-none text-gray-600 hover:text-gray-900 px-6 py-3"
        >
          Updates
        </Button>
      </div>
    </div>
  );
}
