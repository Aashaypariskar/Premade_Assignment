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

        // Default coaches: coach_name = label (B1/GEN1 etc.), coach_number = 6-digit unique ID
        const defaults = [
            { name: 'EOG1' }, { name: 'GEN1' }, { name: 'GEN2' }, { name: 'GEN3' }, { name: 'GEN4' },
            { name: 'S1' }, { name: 'S2' }, { name: 'S3' }, { name: 'S4' }, { name: 'S5' },
            { name: 'S6' }, { name: 'B1' }, { name: 'B2' }, { name: 'B3' }, { name: 'B4' },
            { name: 'B5' }, { name: 'B6' }, { name: 'A1' }, { name: 'A2' }, { name: 'H1' },
            { name: 'PANTRY' }, { name: 'EOG2' },
        ];

        // Assign unique 6-digit numbers starting from a base built on timestamp
        const base = 200000 + (train.id * 100);
        const coaches = defaults.map((d, index) => ({
            train_id: train.id,
            coach_name: d.name,
            coach_number: String(base + index + 1),
            position: index + 1,
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
        const { train_id, coach_number, coach_name, position } = req.body;
        if (!train_id || !coach_number) return res.status(400).json({ error: 'train_id and coach_number are required' });

        // Enforce exactly 6 numeric digits for coach_number
        if (!/^[0-9]{6}$/.test(coach_number)) {
            return res.status(400).json({ error: 'Coach number must be exactly 6 digits (e.g. 123456).' });
        }

        const count = await PitLineCoach.count({ where: { train_id } });
        if (count >= 24) {
            return res.status(400).json({ error: 'Maximum 24 coaches allowed' });
        }

        const coach = await PitLineCoach.create({
            train_id,
            coach_number,
            coach_name: coach_name || null,
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

// PUT /api/pitline/coaches/:id  — update coach_number (and optional position)
exports.updateCoach = async (req, res) => {
    try {
        const { id } = req.params;
        const { coach_number } = req.body;

        // Validate strictly 6 digits
        if (!coach_number || !/^[0-9]{6}$/.test(coach_number)) {
            return res.status(400).json({ error: 'Coach number must be exactly 6 digits (e.g. 123456).' });
        }

        const coach = await PitLineCoach.findByPk(id);
        if (!coach) return res.status(404).json({ error: 'Coach not found' });

        // Check for duplicate within the same train
        const duplicate = await PitLineCoach.findOne({
            where: { train_id: coach.train_id, coach_number }
        });
        if (duplicate && duplicate.id !== parseInt(id)) {
            return res.status(400).json({ error: 'Coach number already exists in this train.' });
        }

        await coach.update({ coach_number });
        res.json(coach);
    } catch (err) {
        console.error('updateCoach Error:', err);
        res.status(500).json({ error: 'Failed to update coach' });
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
