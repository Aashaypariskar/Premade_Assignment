const fs = require('fs');
try {
    const {
        sequelize, CategoryMaster, Category, LtrSchedule, AmenitySubcategory,
        Activity, Question, Reason, User
    } = require('./models');

    async function seed() {
        try {
            console.log('Starting seed...');
            const master = await CategoryMaster.findOne({ where: { name: 'Amenity' } });
            console.log('Master found:', !!master);
            const coaches = await require('./models').Coach.findAll();
            console.log('Coaches found:', coaches.length);
            process.exit(0);
        } catch (e) {
            fs.writeFileSync('seed_error.log', e.stack);
            process.exit(1);
        }
    }
    seed();
} catch (e) {
    fs.writeFileSync('seed_error.log', e.stack);
    process.exit(1);
}
