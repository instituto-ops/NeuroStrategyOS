const { requestSupport } = require("../../support/requestSupport");

module.exports = {
  request([sessionId, agent, ...prompt]) {
    console.log(requestSupport({
      sessionId,
      agent,
      prompt: prompt.join(" "),
      intent: "apoio cognitivo via cli"
    }));
  }
};