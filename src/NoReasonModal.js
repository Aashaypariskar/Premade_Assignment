import React, { useState } from 'react';
import { REASON_OPTIONS } from './data';

const NoReasonModal = ({ question, onDone, onCancel }) => {
    const [selectedReasons, setSelectedReasons] = useState([]);
    const [remarks, setRemarks] = useState('');
    const [images, setImages] = useState([]);
    const [error, setError] = useState('');

    const handleReasonChange = (reason) => {
        const isSelecting = !selectedReasons.includes(reason);
        setSelectedReasons(prev =>
            isSelecting ? [...prev, reason] : prev.filter(r => r !== reason)
        );
        // clear error if they select something
        if (isSelecting) setError('');
    };

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        // just saving file names for mock
        setImages(prev => [...prev, ...files.map(f => f.name)]);
    };

    const handleDone = () => {
        // mandatory reason check
        if (selectedReasons.length === 0) {
            setError("Please select at least one reason to continue.");
            return;
        }
        onDone({ selectedReasons, remarks, images });
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3>Reason for "NO"</h3>
                <p>{question.text}</p>

                {error && <p className="error-text">{error}</p>}

                <div className="reasons-container">
                    {REASON_OPTIONS.map(reason => (
                        <label key={reason} className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={selectedReasons.includes(reason)}
                                onChange={() => handleReasonChange(reason)}
                            />
                            {reason}
                        </label>
                    ))}
                </div>

                <textarea
                    placeholder="Add remarks..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                />

                <div className="image-upload">
                    <input type="file" multiple onChange={handleImageUpload} />
                    <p>{images.length} images selected</p>
                </div>

                <div className="modal-actions">
                    <button onClick={onCancel}>Cancel</button>
                    <button className="btn-primary" onClick={handleDone}>Done</button>
                </div>
            </div>
        </div>
    );
};

export default NoReasonModal;
