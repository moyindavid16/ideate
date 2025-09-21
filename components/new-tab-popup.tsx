"use client";

import { useState } from "react";
import { PenTool, Code, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TabType } from "@/contexts/tab-context";

interface NewTabPopupProps {
  onCreateTab: (type: TabType) => void;
  children: React.ReactNode;
}

type TabConfig = {
  type: TabType;
  icon: React.ReactNode;
  title: string;
  description: string;
  colorClass: string;
  buttonColor: string;
};

const TAB_CONFIGS: TabConfig[] = [
  {
    type: 'visual',
    icon: <PenTool className="w-4 h-4 transition-transform duration-300" />,
    title: 'new canvas',
    description: 'Create visual diagrams and drawings',
    colorClass: 'sticky-green',
    buttonColor: 'green'
  },
  {
    type: 'code',
    icon: <Code className="w-4 h-4 transition-transform duration-300" />,
    title: 'new ide',
    description: 'Write and execute Python code',
    colorClass: 'sticky-purple',
    buttonColor: 'purple'
  },
  {
    type: 'markdown',
    icon: <FileText className="w-4 h-4 transition-transform duration-300" />,
    title: 'new markdown file',
    description: 'Write documentation and notes',
    colorClass: 'sticky-yellow',
    buttonColor: 'yellow'
  }
];

function TabCard({ config, onCreateTab }: { config: TabConfig; onCreateTab: (type: TabType) => void }) {
  return (
    <div className={`${config.colorClass} rounded-2xl p-4 mb-3 transition-all duration-300 hover:scale-102 hover:shadow-md`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {config.icon}
          <span className="font-medium">{config.title}</span>
        </div>

        <div className="flex-1 text-center">
          <p className="text-sm text-muted-foreground">
            {config.description}
          </p>
        </div>

        <button
          onClick={() => onCreateTab(config.type)}
          className="px-4 py-2 bg-green-200 hover:bg-green-300 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95 active:rotate-1 transform"
        >
          create
        </button>
      </div>
    </div>
  );
}

export function NewTabPopup({ onCreateTab, children }: NewTabPopupProps) {
  const [open, setOpen] = useState(false);

  const handleCreateTab = (type: TabType) => {
    onCreateTab(type);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sticky-blue max-w-md border-2 border-blue-200/50 animate-in fade-in-0 zoom-in-95 duration-300">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-center">
            What do you want to make?
          </DialogTitle>
        </DialogHeader>

        <div className="w-full">
          {TAB_CONFIGS.map((config) => (
            <TabCard key={config.type} config={config} onCreateTab={handleCreateTab} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}