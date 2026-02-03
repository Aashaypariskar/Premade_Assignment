import React from 'react';

const QuestionItem = ({ question, currentAnswer, onAnswerChange }) => {
    return (
        <div className="question-item">
            <p className="question-text">{question.text}</p>
            <div className="radio-group">
                <label>
                    <input
                        type="radio"
                        name={`question-${question.id}`}
                        value="YES"
                        checked={currentAnswer === 'YES'}
                        onChange={() => onAnswerChange('YES')}
                    />
                    YES
                </label>
                <label>
                    <input
                        type="radio"
                        name={`question-${question.id}`}
                        value="NO"
                        checked={currentAnswer === 'NO'}
                        onChange={() => onAnswerChange('NO')}
                    />
                    NO
                </label>
                <label>
                    <input
                        type="radio"
                        name={`question-${question.id}`}
                        value="NA"
                        checked={currentAnswer === 'NA'}
                        onChange={() => onAnswerChange('NA')}
                    />
                    N/A
                </label>
            </div>
        </div>
    );
};

export default QuestionItem;
