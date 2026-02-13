import React, { useState, useEffect } from 'react';
import { getQuestions, submitInspection } from '../services/ApiService';
import NoReasonModal from '../components/NoReasonModal'; // Will create this next

const QuestionsScreen = ({ route, navigation }) => {
    const { trainId, coachId, coachNumber, activityId, activityType } = route.params;

    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [activeQuestion, setActiveQuestion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchQuestions = async () => {
            const data = await getQuestions(activityId);
            setQuestions(data);
            setLoading(false);
        };
        fetchQuestions();
    }, [activityId]);

    const handleAnswer = (question, val) => {
        if (val === 'NO') {
            setActiveQuestion(question);
        } else {
            setAnswers(prev => ({
                ...prev,
                [question.id]: { answer: val }
            }));
        }
    };

    const handleModalDone = (data) => {
        setAnswers(prev => ({
            ...prev,
            [activeQuestion.id]: { answer: 'NO', ...data }
        }));
        setActiveQuestion(null);
    };

    const validate = () => {
        // all questions must be answered
        return questions.every(q => answers[q.id]);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        const payload = {
            trainId,
            coachId,
            activityId,
            answers: Object.entries(answers).map(([qId, data]) => ({
                questionId: qId,
                ...data,
                timestamp: new Date().toISOString()
            }))
        };

        try {
            const res = await submitInspection(payload);
            alert(res.message);
            navigation.popToTop(); // return to start
        } catch (error) {
            alert('Submission failed');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div>Loading questions...</div>;

    return (
        <div className="container">
            <div className="header">{activityType} Inspection: {coachNumber}</div>

            <div className="questions-list">
                {questions.map(q => (
                    <div key={q.id} className="question-card">
                        <p className="question-text">{q.text}</p>
                        <div className="options">
                            {['YES', 'NO', 'NA'].map(opt => (
                                <button
                                    key={opt}
                                    className={`opt-btn ${answers[q.id]?.answer === opt ? 'active' : ''}`}
                                    onClick={() => handleAnswer(q, opt)}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <button
                className="submit-btn"
                disabled={!validate() || submitting}
                onClick={handleSubmit}
            >
                {submitting ? 'Submitting...' : 'Submit Inspection'}
            </button>

            {activeQuestion && (
                <NoReasonModal
                    question={activeQuestion}
                    onDone={handleModalDone}
                    onCancel={() => setActiveQuestion(null)}
                />
            )}
        </div>
    );
};

export default QuestionsScreen;
