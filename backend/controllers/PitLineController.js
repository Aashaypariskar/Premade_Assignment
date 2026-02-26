const { PitLineTrain, PitLineCoach, PitLineSession, sequelize } = require('../models');

// GET /api/pitline/trains
exports.getTrains = async (req, res) => {
    try {
        const trains = await PitLineTrain.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.json(trains);
    } catch (err) {
        console.error('getTrains Error:', err);
        res.status(500).json({ error: 'Failed to fetch trains' });
    }
};

// POST /api/pitline/trains/add
exports.createTrain = async (req, res) => {
    try {
        const { train_number } = req.body;
        if (!train_number) return res.status(400).json({ error: 'Train number is required' });

        const train = await PitLineTrain.create({ train_number });

        // Part 1: Default 20 real coaches
        const coachList = [
            "EOG1", "GEN1", "GEN2", "S1", "S2", "S3", "S4", "S5", "S6",
            "B1", "B2", "B3", "B4", "B5", "B6", "A1", "A2", "H1",
            "PANTRY", "EOG2"
        ];

        const coaches = coachList.map((coach, index) => ({
            train_id: train.id,
            coach_number: coach,
            position: index + 1
        }));

        await PitLineCoach.bulkCreate(coaches);

        res.json(train);
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Train number already exists' });
        }
        console.error('createTrain Error:', err);
        res.status(500).json({ error: 'Failed to create train' });
    }
};

// DELETE /api/pitline/trains/:id
exports.deleteTrain = async (req, res) => {
    try {
        const { id } = req.params;
        await PitLineTrain.destroy({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        console.error('deleteTrain Error:', err);
        res.status(500).json({ error: 'Failed to delete train' });
    }
};

// GET /api/pitline/coaches?train_id=XX
exports.getCoaches = async (req, res) => {
    try {
        const { train_id } = req.query;
        if (!train_id) return res.status(400).json({ error: 'train_id is required' });

        const coaches = await PitLineCoach.findAll({
            where: { train_id },
            order: [['position', 'ASC']]
        });
        res.json(coaches);
    } catch (err) {
        console.error('getCoaches Error:', err);
        res.status(500).json({ error: 'Failed to fetch coaches' });
    }
};

// POST /api/pitline/coaches/add
exports.addCoach = async (req, res) => {
    try {
        const { train_id, coach_number, position } = req.body;
        if (!train_id || !coach_number) return res.status(400).json({ error: 'train_id and coach_number are required' });

        const count = await PitLineCoach.count({ where: { train_id } });
        if (count >= 24) {
            return res.status(400).json({ error: 'Maximum 24 coaches allowed' });
        }

        const coach = await PitLineCoach.create({
            train_id,
            coach_number,
            position: position || (count + 1)
        });
        res.json(coach);
    } catch (err) {
        console.error('addCoach Error:', err);
        res.status(500).json({ error: 'Failed to add coach' });
    }
};

// DELETE /api/pitline/coaches/:id
exports.deleteCoach = async (req, res) => {
    try {
        const { id } = req.params;
        await PitLineCoach.destroy({ where: { id } });
        res.json({ success: true });
    } catch (err) {
        console.error('deleteCoach Error:', err);
        res.status(500).json({ error: 'Failed to delete coach' });
    }
};

// POST /api/pitline/session/start
exports.startSession = async (req, res) => {
    try {
        const { train_id, coach_id, inspector_id } = req.body;
        if (!train_id || !coach_id) {
            return res.status(400).json({ error: 'train_id and coach_id are required' });
        }

        let session = await PitLineSession.findOne({
            where: { train_id, coach_id, status: 'IN_PROGRESS' }
        });

        if (!session) {
            session = await PitLineSession.create({
                train_id,
                coach_id,
                inspector_id,
                status: 'IN_PROGRESS'
            });
            console.log(`[PITLINE] New session created: ${session.id}`);
        } else {
            console.log(`[PITLINE] Resuming session: ${session.id}`);
        }

        res.json({ success: true, session_id: session.id });
    } catch (err) {
        console.error('startSession Error:', err);
        res.status(500).json({ error: 'Failed to start pitline session' });
    }
};
