const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function loadTS(rel) {
  const file=path.join(__dirname,rel);
  const src=fs.readFileSync(file,'utf8');
  const tr=ts.transpileModule(src,{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},reportDiagnostics:true});
  assert.equal((tr.diagnostics||[]).length,0,`TS diagnostics: ${rel}`);
  const exports={};
  new Function('exports','require',tr.outputText)(exports,()=>{throw new Error('unexpected runtime import')});
  return exports;
}
const {productDetailHref}=loadTS('../src/lib/productLinks.ts');
const {findCatalogDetail}=loadTS('../src/lib/catalogProductLookup.ts');
const cat={id:'cat-1',slug:'new-category-name',items:[{id:'prod-1',slug:'changed-name',name:'Example',stock_quantity:0,is_active:true,variants:[{id:'variant-1',stock_quantity:3}]}]};
assert.equal(productDetailHref('prod-1'),'/item/id/prod-1');
assert.equal(productDetailHref('prod-1','variant-1'),'/item/id/prod-1?variant=variant-1');
assert.equal(findCatalogDetail([cat],{itemId:'prod-1'}).item.name,'Example');
assert.equal(findCatalogDetail([cat],{itemId:'variant-1'}).item.id,'prod-1');
assert.equal(findCatalogDetail([cat],{categorySlug:'new-category-name',itemSlug:'changed-name'}).item.id,'prod-1');
assert.equal(findCatalogDetail([cat],{categorySlug:'old-category-name',itemSlug:'changed-name'}).item.id,'prod-1');
assert.equal(findCatalogDetail([cat],{itemId:'missing'}),undefined);
assert.equal(findCatalogDetail([{...cat,items:[{...cat.items[0],is_active:false}]}],{itemId:'prod-1'}),undefined);
assert.equal(findCatalogDetail([cat,{...cat,id:'cat-2',items:[{id:'prod-2',slug:'changed-name'}]}],{categorySlug:'old-name',itemSlug:'changed-name'}),undefined);
console.log('PASS: 9 catalogue ID, variant, old-link, zero-stock and inactive-product checks');
