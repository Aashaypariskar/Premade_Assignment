import React, { useState, useEffect } from 'react';
import { getCategories } from '../services/ApiService';

const CategoryScreen = ({ route, navigation }) => {
    const { trainId, coachId, coachNumber } = route.params;
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        const fetchCategories = async () => {
            const data = await getCategories();
            setCategories(data);
        };
        fetchCategories();
    }, []);

    const handleSelect = (category) => {
        navigation.navigate('Activity', {
            trainId,
            coachId,
            coachNumber,
            categoryId: category.id,
            categoryName: category.name
        });
    };

    return (
        <div className="container">
            <div className="header">Select Category for Coach {coachNumber}</div>
            <div className="list">
                {categories.map(cat => (
                    <div key={cat.id} className="list-item" onClick={() => handleSelect(cat)}>
                        <span className="item-text">{cat.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CategoryScreen;
