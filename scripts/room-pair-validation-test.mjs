import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {mkdir,readFile} from 'node:fs/promises';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
await mkdir('tmp/rooms',{recursive:true});
const require=createRequire(process.cwd()+'/frontend/web-app/rommie-match/package.json');
await require('esbuild').build({entryPoints:['frontend/web-app/rommie-match/src/features/rooms/components/room-location-editor.tsx'],bundle:true,platform:'node',format:'cjs',packages:'external',outfile:'frontend/web-app/rommie-match/node_modules/.cache/manual-location.cjs'});
const {RoomLocationEditor}=require('.cache/manual-location.cjs');
const {renderToStaticMarkup}=require('react-dom/server');
const {createElement}=require('react');
for(const [value,linkValue] of [['',''],['','https://maps.app.goo.gl/test'],['https://www.google.com/maps/embed?pb=test','']]) {
 const html=renderToStaticMarkup(createElement(RoomLocationEditor,{value,linkValue,onChange(){},onLinkChange(){},onPendingChange(){}}));
 assert.ok(html.includes('Link hoặc mã nhúng Google Maps'));
 assert.ok(!html.includes('Đang kiểm tra'));
 assert.equal(html.includes('<iframe'),Boolean(value));
 assert.equal(html.includes('Mở vị trí phòng'),Boolean(linkValue));
}
console.log('PASS: manual location renders without Maps config or query provider; saved link/embed preserved.');
await require('esbuild').build({entryPoints:['frontend/web-app/rommie-match/src/features/rooms/schemas/room-schema.ts'],bundle:true,platform:'node',format:'cjs',outfile:'tmp/rooms/schema.cjs'});
const {roomSchema}=require(process.cwd()+'/tmp/rooms/schema.cjs');
const valid={googleMapsEmbedUrl:'',googleMapsUrl:'https://maps.app.goo.gl/qa',title:'Phòng QA',address:'123 QA Street',city:'TP.HCM',district:'Phường Phú Nhuận',description:'Phòng sạch thoáng',monthlyRent:3000000,deposit:0,maxOccupants:2,roommatesNeeded:'1',pairOccupancyConfirmed:true,accuracyAndResidenceConfirmed:true,availableFrom:new Date(Date.now()+86400000).toISOString().slice(0,10),propertyType:'studio',bedrooms:'1',areaM2:'25',latitude:'',longitude:'',amenities:'Wi-Fi',isActive:true,photoUrls:['https://res.cloudinary.com/qa/photo.jpg']};
assert.ok(roomSchema.safeParse(valid).success);
for(const patch of [{pairOccupancyConfirmed:false},{pairOccupancyConfirmed:undefined},{maxOccupants:3},{maxOccupants:1},{roommatesNeeded:'2'},{roommatesNeeded:''}])assert.equal(roomSchema.safeParse({...valid,...patch}).success,false);
console.log('PASS: pair-only capacity, exactly one roommate and explicit consent required.');
for(const accuracyAndResidenceConfirmed of [false,undefined]) assert.equal(roomSchema.safeParse({...valid,accuracyAndResidenceConfirmed}).success,false);
console.log('PASS: accuracy and residence cooperation consent required.');
for(const googleMapsUrl of ['https://maps.app.goo.gl/ggNLtoWR5V7HTEq98','https://www.google.com/maps/place/Test']) assert.ok(roomSchema.safeParse({...valid,googleMapsUrl}).success);
for(const googleMapsUrl of ['javascript:alert(1)','https://google.com.evil.example/maps','https://user@maps.app.goo.gl/test','http://maps.app.goo.gl/test']) assert.equal(roomSchema.safeParse({...valid,googleMapsUrl}).success,false);
console.log('PASS: required Google Maps links accepted; unsafe and foreign URLs rejected.');

for(const key of ['googleMapsUrl','title','address','city','district','description','propertyType','bedrooms','areaM2','amenities']) assert.equal(roomSchema.safeParse({...valid,[key]:''}).success,false,key);
assert.equal(roomSchema.safeParse({...valid,photoUrls:[]}).success,false);
assert.equal(roomSchema.safeParse({...valid,monthlyRent:0}).success,false);
console.log('PASS: all visible room information, Maps link and photo required.');

await require('esbuild').build({entryPoints:['frontend/web-app/rommie-match/src/features/location/utils/google-maps-embed.ts'],bundle:true,platform:'node',format:'cjs',outfile:'tmp/rooms/embed.cjs'});
const {extractGoogleMapsEmbedUrl}=require(process.cwd()+'/tmp/rooms/embed.cjs');
const embed='https://www.google.com/maps/embed?pb=!1m18!2m3';
assert.equal(extractGoogleMapsEmbedUrl(`<iframe src="${embed}" onload="alert(1)"></iframe><script>alert(1)</script>`),embed);
assert.ok(roomSchema.safeParse({...valid,googleMapsUrl:'',googleMapsEmbedUrl:embed}).success);
for(const url of ['https://evil.example/maps/embed?pb=x','javascript:alert(1)','https://google.com.evil.test/maps/embed?pb=x','https://user@www.google.com/maps/embed?pb=x','https://www.google.com/maps/embed/v1/place?key=x','https://www.google.com/maps/embed?pb=%20']) {
 assert.equal(extractGoogleMapsEmbedUrl(url),null);
 assert.equal(roomSchema.safeParse({...valid,googleMapsEmbedUrl:url}).success,false);
}
assert.equal(roomSchema.safeParse({...valid,googleMapsUrl:'',googleMapsEmbedUrl:''}).success,false);
console.log('PASS: embed-only room accepted; unsafe embeds rejected; pasted HTML reduced to an allowed src.');

for(const patch of [{deposit:'0dadasdas'},{deposit:''},{deposit:'1e3'},{deposit:'3.5'},{monthlyRent:'abc'},{bedrooms:'1e1'},{areaM2:'25foo'},{city:'dadasdas'},{district:'dadasdas'},{city:'Hà Nội',district:'Phường Phú Nhuận'}]) assert.equal(roomSchema.safeParse({...valid,...patch}).success,false,JSON.stringify(patch));
assert.ok(roomSchema.safeParse({...valid,deposit:'0',monthlyRent:'3500000',areaM2:'25.5'}).success);
console.log('PASS: invalid numeric text and mismatched city/area rejected; valid zero deposit and decimal area accepted.');

assert.deepEqual(JSON.parse(await readFile('backend/src/Modules/Rooms/Data/room-locations.json','utf8')),JSON.parse(await readFile('frontend/web-app/rommie-match/src/features/rooms/data/room-locations.json','utf8')));
console.log('PASS: frontend/backend location catalogs match.');
await require('esbuild').build({entryPoints:['frontend/web-app/rommie-match/src/features/rooms/utils/vietnamese-money.ts'],bundle:true,platform:'node',format:'cjs',outfile:'tmp/rooms/money.cjs'});
const {vietnameseMoney}=require(process.cwd()+'/tmp/rooms/money.cjs');
for(const [amount,words] of [[0,'Không đồng'],[350000,'Ba trăm năm mươi nghìn đồng'],[35000000,'Ba mươi lăm triệu đồng'],[21,'Hai mươi mốt đồng'],[15,'Mười lăm đồng'],[105,'Một trăm lẻ năm đồng'],[1001,'Một nghìn không trăm lẻ một đồng'],[1000001,'Một triệu không trăm lẻ một đồng'],[1e9,'Một tỷ đồng']]) assert.equal(vietnameseMoney(amount),words);
assert.equal(vietnameseMoney('350000'),'Ba trăm năm mươi nghìn đồng');
for(const value of ['', '0dadasdas','1e3','3.5','-1',NaN,-1,1e9+1,null,undefined]) assert.equal(vietnameseMoney(value),null);
console.log('PASS: Vietnamese money words, zero/large/sparse groups and invalid drafts.');
for(const address of ['adasd','123','đường Nguyễn Huệ','123 !!!','205/10A','']) assert.equal(roomSchema.safeParse({...valid,address}).success,false,address);
for(const address of ['205/10A đường Hoàng Văn Thụ','123 Nguyễn Huệ','7A đường số 10','12-14 Lê Lợi']) assert.ok(roomSchema.safeParse({...valid,address}).success,address);
console.log('PASS: house number and street structure required; Unicode streets and alley numbers accepted.');
