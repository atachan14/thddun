import('./server.mjs').then(m=>m.start()).catch(e=>{console.error(e);process.exitCode=1});
