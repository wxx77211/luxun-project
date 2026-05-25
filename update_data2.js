const fs = require('fs');
const path = require('path');

// 读取文件
const introText = fs.readFileSync(path.join(__dirname, '人物简介.txt'), 'utf8');
const refText = fs.readFileSync(path.join(__dirname, '参考文献.txt'), 'utf8');
const htmlPath = path.join(__dirname, '网页4.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

// 方法1：简单解析人物简介 - 按行分割，查找模式 "数字 人物名："
const introLines = introText.split(/\r?\n/);
const introMap = {};
let currentPerson = null;
let currentIntroLines = [];

for (let i = 0; i < introLines.length; i++) {
    const line = introLines[i];
    // 匹配 "1 祥林嫂：" 或 "1  祥林嫂："（可能有多余空格）
    const match = line.match(/^\s*(\d+)\s+([^：]+)：\s*(.*)/);
    if (match) {
        // 保存上一个
        if (currentPerson) {
            introMap[currentPerson] = currentIntroLines.join('\n').trim();
        }
        currentPerson = match[2];
        currentIntroLines = [match[3].trim()];
    } else if (currentPerson) {
        // 继续收集简介行
        if (line.trim() === '') {
            if (currentIntroLines[currentIntroLines.length - 1] !== '') {
                currentIntroLines.push('');
            }
        } else {
            // 如果有空行分隔，添加新段落
            if (currentIntroLines[currentIntroLines.length - 1] === '') {
                currentIntroLines.push(line.trim());
            } else {
                // 否则追加到当前行
                if (currentIntroLines.length > 0) {
                    currentIntroLines[currentIntroLines.length - 1] += ' ' + line.trim();
                } else {
                    currentIntroLines.push(line.trim());
                }
            }
        }
    }
}
if (currentPerson) {
    introMap[currentPerson] = currentIntroLines.join('\n').trim();
}

// 处理阿金 -> 阿金姐
if (introMap['阿金']) {
    introMap['阿金姐'] = introMap['阿金'];
    delete introMap['阿金'];
}

console.log('解析到简介的人物:', Object.keys(introMap));
for (let person in introMap) {
    console.log(`  ${person}: ${introMap[person].substring(0, 50)}...`);
}

// 解析参考文献
const refMap = {};
const refSections = refText.split(/### /);
for (let section of refSections) {
    const lines = section.trim().split(/\r?\n/);
    if (lines.length < 2) continue;

    const personLine = lines[0].trim();
    // 跳过非人物行
    if (personLine.includes('表格') || personLine.includes('文献') || personLine.includes('链接')) {
        continue;
    }

    const personName = personLine;
    const entries = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // 匹配条目：以数字和点开头，如 "1. [1]..."
        const entryMatch = line.match(/^(\d+)\.\s+(.+)/);
        if (entryMatch) {
            const title = entryMatch[2];
            // 检查下一行是否是链接
            let link = null;
            if (i + 1 < lines.length && lines[i + 1].trim().startsWith('http')) {
                link = lines[i + 1].trim();
                i++; // 跳过链接行
            }
            entries.push({ title, link });
        }
    }

    if (entries.length > 0) {
        refMap[personName] = entries;
    }
}

// 处理阿金 -> 阿金姐
if (refMap['阿金']) {
    refMap['阿金姐'] = refMap['阿金'];
    delete refMap['阿金'];
}

console.log('\n解析到参考文献的人物:', Object.keys(refMap));
for (let person in refMap) {
    console.log(`  ${person}: ${refMap[person].length} 篇文献`);
}

// 解析原始HTML中的characterData
const startMarker = 'const characterData = {';
const endMarker = '};';
const startIdx = htmlContent.indexOf(startMarker);
if (startIdx === -1) {
    console.error('错误: 找不到characterData定义');
    process.exit(1);
}

// 提取从startIdx到匹配的结束大括号
let braceCount = 0;
let endIdx = -1;
for (let i = startIdx; i < htmlContent.length; i++) {
    if (htmlContent[i] === '{') braceCount++;
    else if (htmlContent[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
            endIdx = i + 1; // 包含分号
            break;
        }
    }
}
if (endIdx === -1) {
    console.error('错误: 无法找到characterData的结束位置');
    process.exit(1);
}

const originalDataStr = htmlContent.substring(startIdx, endIdx);
console.log('\n原始characterData长度:', originalDataStr.length);

// 解析原始对象为JavaScript对象（简化版）
// 使用eval或手动解析，这里使用正则提取每个人物
const personPattern = /"([^"]+)":\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g;
const persons = [];
let match;
const personData = {};

// 简化：我们只提取每个人物的完整文本块，然后分别处理
const personBlocks = originalDataStr.match(/"([^"]+)":\s*\{[\s\S]*?(?=\s*,\s*"[^"]+":|\s*\})/g);
if (personBlocks) {
    for (let block of personBlocks) {
        // 提取人物名
        const nameMatch = block.match(/^"([^"]+)":/);
        if (!nameMatch) continue;
        const name = nameMatch[1];

        // 提取字段
        const imgMatch = block.match(/img:\s*"([^"]+)"/);
        const introMatch = block.match(/intro:\s*"([^"]*)"/);
        const journalMatch = block.match(/journal:\s*\[([\s\S]*?)\]/);
        const sourceMatch = block.match(/source:\s*"([^"]+)"/);
        const categoryMatch = block.match(/category:\s*"([^"]+)"/);
        const spaceTypeMatch = block.match(/spaceType:\s*"([^"]+)"/);
        const locationMatch = block.match(/location:\s*"([^"]+)"/);
        const spaceLiteratureMatch = block.match(/spaceLiterature:\s*\[([\s\S]*?)\]/);

        personData[name] = {
            img: imgMatch ? imgMatch[1] : '',
            intro: introMatch ? introMatch[1] : '',
            journal: journalMatch ? journalMatch[1] : '[]',
            source: sourceMatch ? sourceMatch[1] : '',
            category: categoryMatch ? categoryMatch[1] : '',
            spaceType: spaceTypeMatch ? spaceTypeMatch[1] : '',
            location: locationMatch ? locationMatch[1] : '',
            spaceLiterature: spaceLiteratureMatch ? spaceLiteratureMatch[1] : '[]'
        };
    }
}

console.log('\n解析到原始数据人物:', Object.keys(personData).length);

// 构建新的characterData
let newDataStr = 'const characterData = {\n';
const personNames = Object.keys(personData);

for (let i = 0; i < personNames.length; i++) {
    const name = personNames[i];
    const data = personData[name];

    // 更新intro
    let newIntro = data.intro;
    if (introMap[name]) {
        // 替换intro，转义双引号和换行符
        newIntro = introMap[name].replace(/"/g, '\\"').replace(/\n/g, '\\n');
    }

    // 更新journal
    let newJournal = '[]';
    if (refMap[name]) {
        const journalItems = [];
        for (let entry of refMap[name]) {
            let title = entry.title;
            // 去除开头的数字前缀，如 "1. " 已由解析器处理
            // 转义双引号
            const escapedTitle = title.replace(/"/g, '\\"');
            if (entry.link) {
                journalItems.push(`"<a href="${entry.link}" target="_blank" rel="noopener noreferrer">${escapedTitle}</a>"`);
            } else {
                journalItems.push(`"${escapedTitle}"`);
            }
        }
        newJournal = '[' + journalItems.join(', ') + ']';
    } else {
        // 保持原journal
        newJournal = data.journal;
    }

    // 构建对象
    newDataStr += `    "${name}": {\n`;
    newDataStr += `        img: "${data.img}",\n`;
    newDataStr += `        intro: "${newIntro}",\n`;
    newDataStr += `        journal: ${newJournal},\n`;
    newDataStr += `        source: "${data.source}",\n`;
    newDataStr += `        category: "${data.category}",\n`;
    newDataStr += `        spaceType: "${data.spaceType}",\n`;
    newDataStr += `        location: "${data.location}",\n`;
    newDataStr += `        spaceLiterature: ${data.spaceLiterature}\n`;
    newDataStr += `    }`;
    if (i < personNames.length - 1) {
        newDataStr += ',';
    }
    newDataStr += '\n';
}

newDataStr += '};';

// 替换原内容
const newHtmlContent = htmlContent.substring(0, startIdx) + newDataStr + htmlContent.substring(endIdx);

// 写回文件
const outputPath = path.join(__dirname, '网页4_updated_final.html');
fs.writeFileSync(outputPath, newHtmlContent, 'utf8');
console.log(`\n已生成更新后的文件: ${outputPath}`);

// 验证
console.log('\n更新摘要:');
for (let name of personNames) {
    const introUpdated = introMap[name] ? '是' : '否';
    const refUpdated = refMap[name] ? `是 (${refMap[name].length}篇)` : '否';
    console.log(`  ${name}: 简介更新=${introUpdated}, 文献更新=${refUpdated}`);
}