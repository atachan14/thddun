import path from'node:path';
export function resolveDocumentPath(reference,{baseDirectory='',allowedRepositoryId}){if(reference.repositoryId!==allowedRepositoryId)throw Error('Repository unavailable');for(const value of[baseDirectory,reference.path])if(typeof value!=='string'||value.includes('\\')||value.includes('\0')||value.includes(':')||value.startsWith('/')||/%[0-9a-f]{2}/i.test(value))throw Error('Invalid relative path');const relative=path.posix.normalize(path.posix.join(baseDirectory,reference.path));if(relative==='..'||relative.startsWith('../'))throw Error('Outside repository');return relative;}
export function documentAsText(source){return String(source).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
// No filesystem, network or HTML execution. A real reader must resolve symlinks,
// authorize repository/commit and enforce repository containment before reading.
