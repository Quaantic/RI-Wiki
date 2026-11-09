const {hasGate} = require('../server/editor-gate.cjs');
module.exports = function editorAccess(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  if (req.method !== 'GET') return res.status(405).json({message:'Method not allowed.'});
  return res.status(200).json({allowed:hasGate(req)});
};
