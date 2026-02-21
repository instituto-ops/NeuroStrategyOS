const { startSession } = require("../../sessions/startSession");
const { endSession } = require("../../sessions/endSession");
const { listSessionsByPatient } = require("../../sessions/listSessionsByPatient");

module.exports = {
  start([patientId]) {
    console.log(startSession({ patientId, createdBy: "CLI" }));
  },
  end([sessionId]) {
    console.log(endSession({ sessionId, endedBy: "CLI" }));
  },
  list([patientId]) {
    console.log(listSessionsByPatient(patientId));
  }
};