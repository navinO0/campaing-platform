import { DashboardLayoutWrapper } from "@/components/layout/dashboard-layout";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>;
}
