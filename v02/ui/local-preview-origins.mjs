// Exact loopback hostnames only; localhost keeps audit cookies apart from the normal 127.0.0.1 profile.
export function previewOrigins(port,isolated=false){if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid local port');return isolated?['http://localhost:'+port]:['http://127.0.0.1:'+port,'http://localhost:'+port];}
