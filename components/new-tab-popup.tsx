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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TabType } from "@/app/page";

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

function TabAccordionItem({ config, onCreateTab }: { config: TabConfig; onCreateTab: (type: TabType) => void }) {
  return (
    <AccordionItem value={config.type} className="border-b-0 mb-3 py-1">
      <AccordionTrigger className={`${config.colorClass} rounded-2xl px-4 py-3 hover:no-underline transition-all duration-300 hover:scale-102 hover:shadow-md`}>
        <div className="flex items-center gap-3">
          {config.icon}
          <span>{config.title}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-0 pt-3">
        <div className={`bg-white/50 rounded-xl p-4 border border-${config.buttonColor}-200/30`}>
          <div className="flex gap-4">
            <div className={`w-20 h-16 bg-${config.buttonColor}-100 rounded-lg border border-${config.buttonColor}-200/50 flex items-center justify-center text-${config.buttonColor}-600 text-xs`}>
              preview
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-3">
                {config.description}
              </p>
              <button
                onClick={() => onCreateTab(config.type)}
                className="px-4 py-2 bg-green-200 hover:bg-green-300 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95 active:rotate-1 transform"
              >
                create
              </button>
            </div>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
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
            new item
          </DialogTitle>
        </DialogHeader>

        <Accordion type="single" collapsible className="w-full">
          {TAB_CONFIGS.map((config) => (
            <TabAccordionItem key={config.type} config={config} onCreateTab={handleCreateTab} />
          ))}
        </Accordion>
      </DialogContent>
    </Dialog>
  );
}