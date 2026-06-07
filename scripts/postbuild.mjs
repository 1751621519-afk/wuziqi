import { readFileSync, writeFileSync } from 'fs';

const htmlPath = 'dist/index.html';
let html = readFileSync(htmlPath, 'utf-8');

// 1. 移除 type="module"（viteSingleFile 内联后的 inline script 也可能带 type="module"）
html = html.replace(/type="module"\s*/g, '');

// 2. 移除 crossorigin 属性（file:// 协议下 crossorigin 会导致资源加载失败）
html = html.replace(/\s+crossorigin(?:="[^"]*")?/g, '');

// 3. 移除 HMR 相关脚本（构建后不应残留）
html = html.replace(/<script[^>]*import\.meta\.hot[^<]*<\/script>/g, '');

// 4. 确保主脚本在 </body> 之前而非 <head> 中
//    匹配 <script src="..."> 或 <script>...</script> （排除已有 defer/async/data- 的）
//    如果脚本在 </head> 之前，移到 </body> 之前
const headCloseIdx = html.indexOf('</head>');
if (headCloseIdx !== -1) {
  const headContent = html.substring(0, headCloseIdx);
  const bodyCloseIdx = html.lastIndexOf('</body>');

  // 查找 head 中的非模板脚本标签
  const scriptRegex = /<script\b(?![^>]*\b(?:defer|async|type="(?!module)[^"]*"))[^>]*>[\s\S]*?<\/script>/gi;
  let match;
  let newHtml = html;
  while ((match = scriptRegex.exec(headContent)) !== null) {
    const scriptTag = match[0];
    // 从 head 移除该脚本
    newHtml = newHtml.replace(scriptTag, '');
    // 如果不是 type=module（已移除），插入到 </body> 之前
    if (bodyCloseIdx !== -1) {
      const adjustedBodyIdx = newHtml.lastIndexOf('</body>');
      if (adjustedBodyIdx !== -1) {
        newHtml = newHtml.substring(0, adjustedBodyIdx) + '  ' + scriptTag + '\n' + newHtml.substring(adjustedBodyIdx);
      }
    }
  }
  html = newHtml;
}

writeFileSync(htmlPath, html);
console.log('Postbuild: cleaned up html for file:// and GitHub Pages compatibility');

// 验证
const verify = readFileSync(htmlPath, 'utf-8');
if (verify.includes('type="module"')) {
  console.error('ERROR: type="module" still present!');
  process.exit(1);
}
console.log('Verified: no type="module" found.');
