import fs from 'node:fs';
const html=fs.readFileSync('index.html','utf8');if(!html.includes('<!doctype html>')&&!html.includes('<!DOCTYPE html>'))throw Error('Missing HTML document');
fs.mkdirSync('dist',{recursive:true});fs.copyFileSync('index.html','dist/index.html');
for(const directory of ['src','styles','assets']){if(fs.existsSync(directory))fs.cpSync(directory,'dist/'+directory,{recursive:true});}
console.log('Static Web build completed.');
