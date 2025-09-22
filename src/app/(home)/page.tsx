import { Suspense } from "react";

import { LoadingSpinner } from "~/features/shared/components/LoadingSpinner";

import { HomePageContent } from "./_components/HomePageContent";

export default function Home() {
  return (
    <div className="bg-white h-full w-full">
      <Suspense fallback={<LoadingSpinner />}>
        <HomePageContent />
      </Suspense>
    </div>
  );
}
