import { TRAINS, COACHES, CATEGORIES, QUESTIONS } from './data';

const delay = (ms = 800) => new Promise(resolve => setTimeout(resolve, ms));

export const getTrains = async () => {
    await delay();
    return TRAINS;
};

export const getCoaches = async (trainId) => {
    await delay();
    return COACHES.filter(c => c.train_id === trainId);
};

export const getCategories = async () => {
    await delay();
    return CATEGORIES;
};

export const getQuestions = async (activityId) => {
    await delay();
    return QUESTIONS.filter(q => q.activity_id === activityId);
};

export const submitInspection = async (payload) => {
    await delay(1500);
    console.log('Sending payload to server:', payload);
    // basic simulation of success
    return { status: 200, message: 'Inspection saved successfully' };
};
