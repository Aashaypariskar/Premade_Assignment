import React, { useState } from 'react';
import QuestionItem from './QuestionItem';
import NoReasonModal from './NoReasonModal';
import { MOCK_QUESTIONS } from './data';
import { submitInspection } from './api';

const InspectionPage = () => {
    // storing all answers here
    const [answers, setAnswers] = useState({});
    const [activeQuestion, setActiveQuestion] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });

    const handleAnswerChange = (question, value) => {
        setStatus({ type: '', message: '' });

        // if NO is selected, show modal
        if (value === 'NO') {
            setActiveQuestion(question);
        } else {
            setAnswers(prev => ({
                ...prev,
                [question.id]: {
                    questionId: question.id,
                    sectionName: question.sectionName,
                    answer: value,
                    timestamp: Date.now()
                }
            }));
        }
    };

    // this runs when modal is done
    const handleModalDone = (data) => {
        setAnswers(prev => ({
            ...prev,
            [activeQuestion.id]: {
                questionId: activeQuestion.id,
                sectionName: activeQuestion.sectionName,
                answer: 'NO',
                ...data,
                timestamp: Date.now()
            }
        }));
        setActiveQuestion(null);
    };

    const handleSubmit = async () => {
        const answerList = Object.values(answers);

        // basic validation
        if (answerList.length === 0) {
            setStatus({ type: 'error', message: "Please answer at least one question" });
            return;
        }

        setIsSubmitting(true);
        setStatus({ type: '', message: '' });

        try {
            await submitInspection(answerList);
            setStatus({ type: 'success', message: "Inspection submitted successfully!" });
        } catch (error) {
            console.error("Submission error:", error);
            setStatus({ type: 'error', message: "Failed to submit inspection. Please try again." });
        } finally {
            setIsSubmitting(false);
        }
    };

    // grouping questions by section name
    const sections = MOCK_QUESTIONS.reduce((acc, q) => {
        if (!acc[q.sectionName]) acc[q.sectionName] = [];
        acc[q.sectionName].push(q);
        return acc;
    }, {});

    return (
        <div className="inspection-page">
            <h1>Inspection App</h1>

            {status.message && (
                <div className={`status-message ${status.type}`}>
                    {status.message}
                </div>
            )}

            {Object.entries(sections).map(([sectionName, questions]) => (
                <section key={sectionName} className="section-block">
                    <h2>{sectionName}</h2>
                    {questions.map(q => (
                        <QuestionItem
                            key={q.id}
                            question={q}
                            currentAnswer={answers[q.id]?.answer}
                            onAnswerChange={(val) => handleAnswerChange(q, val)}
                        />
                    ))}
                </section>
            ))}

            <button
                className="submit-btn"
                onClick={handleSubmit}
                disabled={isSubmitting}
            >
                {isSubmitting ? "Submitting..." : "Submit Inspection"}
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

export default InspectionPage;
