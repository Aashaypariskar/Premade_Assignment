import React, { useState } from 'react';
import { REASON_OPTIONS } from '../services/data';
// In a real app we'd use import { launchImageLibrary } from 'react-native-image-picker';

const NoReasonModal = ({ question, onDone, onCancel }) => {
    const [selectedReasons, setSelectedReasons] = useState([]);
    const [remarks, setRemarks] = useState('');
    const [image, setImage] = useState(null);
    const [error, setError] = useState('');

    const toggleReason = (reason) => {
        const isSelected = selectedReasons.includes(reason);
        const next = isSelected
            ? selectedReasons.filter(r => r !== reason)
            : [...selectedReasons, reason];
        setSelectedReasons(next);
        if (next.length > 0) setError('');
    };

    const handlePickImage = () => {
        // Mocking image pick
        const mockImageUri = `file:///data/user/0/com.inspectionapp/cache/mock_image_${Date.now()}.jpg`;
        setImage(mockImageUri);
        if (selectedReasons.length > 0) setError('');
    };

    const handleDone = () => {
        if (selectedReasons.length === 0) {
            setError('Please select at least one reason');
            return;
        }
        if (!image) {
            setError('Image is mandatory for "NO" answers');
            return;
        }
        onDone({ selectedReasons, remarks, image_uri: image });
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3 className="modal-title">Audit: {question.text}</h3>

                {error && <p className="error-text">{error}</p>}

                <div className="reasons-grid">
                    {REASON_OPTIONS.map(reason => (
                        <div
                            key={reason}
                            className={`reason-chip ${selectedReasons.includes(reason) ? 'active' : ''}`}
                            onClick={() => toggleReason(reason)}
                        >
                            {reason}
                        </div>
                    ))}
                </div>

                <textarea
                    className="remarks-input"
                    placeholder="Enter remarks (optional)..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                />

                <div className="image-section">
                    <button className="img-btn" onClick={handlePickImage}>
                        {image ? 'Change Image' : 'Capture/Pick Image'}
                    </button>
                    {image && <p className="img-path">Captured: .../{image.split('/').pop()}</p>}
                </div>

                <div className="modal-footer">
                    <button className="cancel-btn" onClick={onCancel}>Cancel</button>
                    <button className="done-btn" onClick={handleDone}>Done</button>
                </div>
            </div>
        </div>
    );
};

export default NoReasonModal;
