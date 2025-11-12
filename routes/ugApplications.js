const express = require('express');
const {
  getAllUGApplications,
  getUGApplicationById,
  createUGApplication,
  updateUGApplication,
  deleteUGApplication,
  getUGApplicationsStats
} = require('../controllers/ugApplicationController');

const router = express.Router();

router.post('/createug', createUGApplication);

router.get('/getug', getAllUGApplications);

router.get('/stats/overview', getUGApplicationsStats);

router.get('/:id', getUGApplicationById);


router.put('/:id', updateUGApplication);
router.delete('/:id', deleteUGApplication);

module.exports = router;