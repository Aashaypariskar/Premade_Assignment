import React, { useState, useEffect } from 'react';
import { getCoaches } from '../services/ApiService';

const CoachListScreen = ({ route, navigation }) => {
    const { trainId, trainName } = route.params;
    const [coaches, setCoaches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCoaches();
    }, [trainId]);

    const fetchCoaches = async () => {
        try {
            const data = await getCoaches(trainId);
            setCoaches(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (coach) => {
        navigation.navigate('Category', {
            trainId,
            coachId: coach.id,
            coachNumber: coach.coach_number
        });
    };

    if (loading) return <div>Loading coaches for {trainName}...</div>;

    return (
        <div className="container">
            <div className="header">Coaches for {trainName}</div>
            <div className="list">
                {coaches.map(coach => (
                    <div key={coach.id} className="list-item" onClick={() => handleSelect(coach)}>
                        <span className="item-text">Coach: {coach.coach_number}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CoachListScreen;
