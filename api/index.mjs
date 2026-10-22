// Existing Google routes remain in the legacy handler; new cookie APIs have their own namespace.
export{default,productionNodeHandler}from'../v02/local-auth/production-node-handler.mjs';
export{trialNodeHandler}from'../v02/trial/node-handler.mjs';
