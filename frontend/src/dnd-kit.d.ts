declare module '@dnd-kit/core' {
  import { ComponentType, ReactNode } from 'react';

  export interface DragEndEvent {
    active: { id: string; data: { current: any } };
    over: { id: string; data: { current: any } } | null;
  }

  export interface DragStartEvent {
    active: { id: string; data: { current: any } };
  }

  export interface DragOverEvent {
    active: { id: string; data: { current: any } };
    over: { id: string; data: { current: any } } | null;
  }

  export const DndContext: ComponentType<{
    onDragEnd?: (event: DragEndEvent) => void;
    onDragStart?: (event: DragStartEvent) => void;
    onDragOver?: (event: DragOverEvent) => void;
    sensors?: any[];
    collisionDetection?: any;
    children?: ReactNode;
  }>;

  export const DragOverlay: ComponentType<{ children?: ReactNode }>;
  export const useDraggable: (props: { id: string; data?: any; disabled?: boolean }) => any;
  export const useDroppable: (props: { id: string; data?: any; disabled?: boolean }) => any;
  export const useSensor: (sensor: any, options?: any) => any;
  export const useSensors: (...sensors: any[]) => any[];
  export const PointerSensor: any;
  export const KeyboardSensor: any;
  export const closestCenter: any;
  export const closestCorners: any;
}

declare module '@dnd-kit/sortable' {
  import { ComponentType, ReactNode } from 'react';

  export const SortableContext: ComponentType<{ items: any[]; strategy?: any; children?: ReactNode }>;
  export const useSortable: (props: { id: string; data?: any; disabled?: boolean }) => any;
  export const verticalListSortingStrategy: any;
  export const horizontalListSortingStrategy: any;
  export const arrayMove: (array: any[], from: number, to: number) => any[];
  export const sortableKeyboardCoordinates: any;
}

declare module '@dnd-kit/utilities' {
  export const CSS: {
    transform: (value: any) => any;
    [key: string]: any;
  };
}
