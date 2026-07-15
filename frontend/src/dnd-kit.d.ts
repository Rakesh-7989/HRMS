declare module '@dnd-kit/core' {
  import { ComponentType, ReactNode } from 'react';

  export interface DragEndEvent {
    active: { id: string; data: { current: unknown } };
    over: { id: string; data: { current: unknown } } | null;
  }

  export interface DragStartEvent {
    active: { id: string; data: { current: unknown } };
  }

  export interface DragOverEvent {
    active: { id: string; data: { current: unknown } };
    over: { id: string; data: { current: unknown } } | null;
  }

  export const DndContext: ComponentType<{
    onDragEnd?: (event: DragEndEvent) => void;
    onDragStart?: (event: DragStartEvent) => void;
    onDragOver?: (event: DragOverEvent) => void;
    sensors?: unknown[];
    collisionDetection?: unknown;
    children?: ReactNode;
  }>;

  export const DragOverlay: ComponentType<{ children?: ReactNode }>;
  export const useDraggable: (props: { id: string; data?: unknown; disabled?: boolean }) => unknown;
  export const useDroppable: (props: { id: string; data?: unknown; disabled?: boolean }) => unknown;
  export const useSensor: (sensor: unknown, options?: unknown) => unknown;
  export const useSensors: (...sensors: unknown[]) => unknown[];
  export const PointerSensor: unknown;
  export const KeyboardSensor: unknown;
  export const closestCenter: unknown;
  export const closestCorners: unknown;
}

declare module '@dnd-kit/sortable' {
  import { ComponentType, ReactNode } from 'react';

  export const SortableContext: ComponentType<{ items: unknown[]; strategy?: unknown; children?: ReactNode }>;
  export const useSortable: (props: { id: string; data?: unknown; disabled?: boolean }) => unknown;
  export const verticalListSortingStrategy: unknown;
  export const horizontalListSortingStrategy: unknown;
  export const arrayMove: (array: unknown[], from: number, to: number) => unknown[];
  export const sortableKeyboardCoordinates: unknown;
}

declare module '@dnd-kit/utilities' {
  export const CSS: {
    transform: (value: unknown) => unknown;
    [key: string]: unknown;
  };
}
