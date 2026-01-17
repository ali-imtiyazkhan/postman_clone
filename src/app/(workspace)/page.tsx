"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useWorkspaceStore } from "@/modules/Layout/store";
import RequestPlayground from "@/modules/request/components/request-playground";
import TabbedSidebar from "@/modules/workspace/components/sidebar";
import { useGetWorkspace } from "@/modules/workspace/hooks/workspace";
import { Loader } from "lucide-react";
import { Spotlight } from "@/components/ui/spotlight-new";


const Page = () => {
  const { selectedWorkspace } = useWorkspaceStore();
  const { data: currentWorkspace, isLoading } =
    useGetWorkspace(selectedWorkspace?.id!);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader className="h-6 w-6 animate-spin text-zinc-200" />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <Spotlight
        className="opacity-35 blur-2xl"
        gradientFirst="radial-gradient(68.54% 68.72% at 55.02% 31.46%, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.025) 50%, rgba(255,255,255,0) 80%)"
        gradientSecond="radial-gradient(50% 50% at 50% 50%, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 80%, transparent 100%)"
        gradientThird="radial-gradient(50% 50% at 50% 50%, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 80%, transparent 100%)"
      />


      <div className="relative z-10 h-full">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={65} minSize={40}>
            <RequestPlayground />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel
            defaultSize={35}
            maxSize={40}
            minSize={25}
            className="flex"
          >
            <div className="flex-1">
              <TabbedSidebar currentWorkspace={currentWorkspace} />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default Page;
