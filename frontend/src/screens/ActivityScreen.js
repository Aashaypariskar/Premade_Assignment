import React from 'react';

const ActivityScreen = ({ route, navigation }) => {
    const { trainId, coachId, coachNumber, categoryId, categoryName } = route.params;

    const activities = [
        { id: 'ACT1', name: 'Minor' },
        { id: 'ACT2', name: 'Major' },
    ];

    const handleSelect = (activity) => {
        navigation.navigate('Questions', {
            trainId,
            coachId,
            coachNumber,
            categoryId,
            activityId: activity.id,
            activityType: activity.name
        });
    };

    return (
        <div className="container">
            <div className="header">{categoryName} Activity for {coachNumber}</div>
            <div className="list">
                {activities.map(act => (
                    <div key={act.id} className="list-item" onClick={() => handleSelect(act)}>
                        <span className="item-text">{act.name} Selection</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ActivityScreen;
