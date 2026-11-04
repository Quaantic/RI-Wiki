const fs=require('node:fs');
async function main(){
  const {refineImportedContent}=await import('../js/content-presentation.js');
  const wiki=JSON.parse(fs.readFileSync('content/wiki-data.json'));
  const game=JSON.parse(fs.readFileSync('content/game-data.json'));
  if(process.argv.includes('--refresh')) {
    wiki.contentMigrations=(wiki.contentMigrations||[]).filter(id=>id!=='compact-game-content-v2');
    game.contentMigrations=(game.contentMigrations||[]).filter(id=>id!=='compact-game-content-v2');
  }
  refineImportedContent(wiki,game);
  fs.writeFileSync('content/wiki-data.json',JSON.stringify(wiki,null,2)+'\n');
  fs.writeFileSync('content/game-data.json',JSON.stringify(game,null,2)+'\n');
  console.log('Removed imported reference dumps; installed Frost generator data. Update Log untouched.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
