import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// 1. データの形を定義
export interface Step {
  id: string;
  order: number;
  content: string;
  isCompleted: boolean;
}

export interface CoreCard {
  id: string;
  url: string;
  title: string;
  summary: string[];
  nextSteps: Step[];
  createdAt: string;
}

interface StoreState {
  cards: CoreCard[];
  addCard: (card: CoreCard) => void;
  deleteCard: (id: string) => void;
  toggleStep: (cardId: string, stepId: string) => void;
}

// 2. ストアを作成（自動保存機能付き）
export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      cards: [],

      // カードを追加する機能
      addCard: (card) =>
        set((state) => ({ cards: [card, ...state.cards] })),

      // カードを削除する機能
      deleteCard: (id) =>
        set((state) => ({ cards: state.cards.filter((c) => c.id !== id) })),

      // ステップのチェックを切り替える機能
      toggleStep: (cardId, stepId) =>
        set((state) => ({
          cards: state.cards.map((card) =>
            card.id === cardId
              ? {
                  ...card,
                  nextSteps: card.nextSteps.map((step) =>
                    step.id === stepId
                      ? { ...step, isCompleted: !step.isCompleted }
                      : step
                  ),
                }
              : card
          ),
        })),
    }),
    {
      name: 'corepick-storage', // ブラウザに保存する時の名前
      storage: createJSONStorage(() => localStorage),
    }
  )
);
