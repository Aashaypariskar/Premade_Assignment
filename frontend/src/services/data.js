export const TRAINS = [
    { id: 'T1', name: 'Rajdhani Express (12301)' },
    { id: 'T2', name: 'Shatabdi Express (12002)' },
    { id: 'T3', name: 'Tejas Express (22671)' },
];

export const COACHES = [
    { id: 'C1', train_id: 'T1', coach_number: 'B1' },
    { id: 'C2', train_id: 'T1', coach_number: 'B2' },
    { id: 'C3', train_id: 'T2', coach_number: 'C1' },
    { id: 'C4', train_id: 'T2', coach_number: 'C2' },
    { id: 'C5', train_id: 'T3', coach_number: 'A1' },
];

export const CATEGORIES = [
    { id: 'CAT1', name: 'Exterior' },
];

export const ACTIVITIES = [
    { id: 'ACT1', category_id: 'CAT1', type: 'Minor' },
    { id: 'ACT2', category_id: 'CAT1', type: 'Major' },
];

export const QUESTIONS = [
    { id: 'Q1', activity_id: 'ACT1', text: 'Is the coach exterior clean?' },
    { id: 'Q2', activity_id: 'ACT1', text: 'Are the window glasses intact?' },
    { id: 'Q3', activity_id: 'ACT2', text: 'Is there any major dent on the body?' },
    { id: 'Q4', activity_id: 'ACT2', text: 'Are the steps and handles secure?' },
];

export const REASON_OPTIONS = [
    'Dirty', 'Broken', 'Dented', 'Missing', 'Loose'
];
