import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { TabType } from "@/app/page"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Tab type utilities
export function getTabIcon(type: TabType) {
  const iconMap = {
    visual: 'PenTool',
    code: 'Code',
    markdown: 'FileText'
  }
  return iconMap[type]
}

export function getTabColorClass(type: TabType) {
  const colorMap = {
    visual: 'sticky-green',
    code: 'sticky-purple',
    markdown: 'sticky-yellow'
  }
  return colorMap[type]
}

// Drag zone calculation utility
export function calculateDropZone(
  clientX: number,
  clientY: number,
  rect: DOMRect
): 'left' | 'right' | 'top' | 'bottom' {
  const x = clientX - rect.left
  const y = clientY - rect.top
  const width = rect.width
  const height = rect.height

  if (x < width * 0.3) return 'left'
  if (x > width * 0.7) return 'right'
  if (y < height * 0.5) return 'top'
  return 'bottom'
}

// Common tab props generator
export function createTabEventHandlers({
  tabId,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onDoubleClick,
  onClose,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave
}: {
  tabId: string
  onMouseEnter: () => void
  onMouseLeave: () => void
  onClick: () => void
  onDoubleClick: () => void
  onClose: () => void
  onDragStart: (tabId: string) => void
  onDragEnd: () => void
  onDragOver: (tabId: string, dropZone: 'left' | 'right' | 'top' | 'bottom') => void
  onDragLeave: () => void
}) {
  return {
    onMouseEnter,
    onMouseLeave,
    onClick,
    onDoubleClick,
    onClose,
    onDragStart: () => onDragStart(tabId),
    onDragEnd,
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault()
      const rect = e.currentTarget.getBoundingClientRect()
      const dropZone = calculateDropZone(e.clientX, e.clientY, rect)
      onDragOver(tabId, dropZone)
    },
    onDragLeave
  }
}
