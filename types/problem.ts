export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export interface Problem { id: string; title: string; slug?: string; url?: string; difficulty?: Difficulty; category?: string; solved?: boolean }
