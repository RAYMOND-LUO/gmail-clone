import HomePageLayout from "./_components/HomePageLayout";

export const metadata = {
  title: "Home",
  description: "Home",
};

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <HomePageLayout>{children}</HomePageLayout>;
}
