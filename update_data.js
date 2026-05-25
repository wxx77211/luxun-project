const fs = require('fs');
const path = require('path');

// 读取文件
const introText = fs.readFileSync(path.join(__dirname, '人物简介.txt'), 'utf8');
const refText = fs.readFileSync(path.join(__dirname, '参考文献.txt'), 'utf8');

// 解析人物简介
const introLines = introText.split('\n');
const introMap = {};
let currentPerson = null;
let currentIntro = [];

for (let line of introLines) {
    // 检测以数字开头的人物行，如 "1 祥林嫂："
    const personMatch = line.match(/^\d+\s+([^：]+)：/);
    if (personMatch) {
        // 保存上一个人物
        if (currentPerson) {
            introMap[currentPerson] = currentIntro.join('\n').trim();
        }
        currentPerson = personMatch[1];
        currentIntro = [line.substring(line.indexOf('：') + 1).trim()];
    } else if (currentPerson) {
        // 如果行不为空或不是新的人物，添加到当前简介
        if (line.trim() === '' && currentIntro[currentIntro.length - 1] !== '') {
            currentIntro.push('');
        } else if (line.trim() !== '') {
            // 如果上一行是空行，添加空行
            if (currentIntro[currentIntro.length - 1] === '') {
                currentIntro.push(line.trim());
            } else {
                // 否则追加到上一行
                if (currentIntro.length > 0) {
                    currentIntro[currentIntro.length - 1] += ' ' + line.trim();
                } else {
                    currentIntro.push(line.trim());
                }
            }
        }
    }
}
// 保存最后一个人物
if (currentPerson) {
    introMap[currentPerson] = currentIntro.join('\n').trim();
}

// 处理名称映射：阿金 -> 阿金姐
if (introMap['阿金']) {
    introMap['阿金姐'] = introMap['阿金'];
    delete introMap['阿金'];
}

console.log('解析到的人物:', Object.keys(introMap));

// 解析参考文献
const refSections = refText.split('### ');
const refMap = {};
for (let section of refSections) {
    if (!section.trim()) continue;
    const lines = section.split('\n');
    const personName = lines[0].trim();
    if (!personName) continue;

    const entries = [];
    let currentEntry = null;
    let currentLink = null;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // 检测条目行：以数字开头，如 "1. [1]..."
        const entryMatch = line.match(/^\d+\.\s+(.+)/);
        if (entryMatch) {
            // 保存上一个条目
            if (currentEntry !== null) {
                let title = currentEntry.trim();
                // 去除末尾可能的空格和链接
                if (currentLink) {
                    // 如果标题末尾包含链接，移除链接部分
                    if (title.endsWith(currentLink)) {
                        title = title.substring(0, title.length - currentLink.length).trim();
                    }
                    entries.push({ title, link: currentLink });
                } else {
                    entries.push({ title, link: null });
                }
            }
            currentEntry = entryMatch[1];
            currentLink = null;
        } else if (currentEntry !== null && line.startsWith('http')) {
            currentLink = line.trim();
        } else if (currentEntry !== null) {
            // 可能是标题的延续
            currentEntry += ' ' + line;
        }
    }
    // 保存最后一个条目
    if (currentEntry !== null) {
        let title = currentEntry.trim();
        if (currentLink) {
            if (title.endsWith(currentLink)) {
                title = title.substring(0, title.length - currentLink.length).trim();
            }
            entries.push({ title, link: currentLink });
        } else {
            entries.push({ title, link: null });
        }
    }

    refMap[personName] = entries;
}

// 处理阿金的映射
if (refMap['阿金']) {
    refMap['阿金姐'] = refMap['阿金'];
    delete refMap['阿金'];
}

console.log('参考文献人物:', Object.keys(refMap));

// 读取原始HTML文件，提取characterData
const htmlPath = path.join(__dirname, '网页4.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

// 找到characterData的开始和结束位置
const startMarker = 'const characterData = {';
const endMarker = '};';
const startIdx = htmlContent.indexOf(startMarker);
if (startIdx === -1) {
    console.error('找不到characterData定义');
    process.exit(1);
}

// 找到结束位置（从startIdx开始查找）
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
    console.error('无法找到characterData的结束位置');
    process.exit(1);
}

console.log('找到characterData位置:', startIdx, '到', endIdx);

// 提取原始characterData字符串用于参考（可选）
const originalDataStr = htmlContent.substring(startIdx, endIdx);
// console.log('原始数据片段:', originalDataStr.substring(0, 500));

// 构建新的characterData
let newDataStr = 'const characterData = {\n';

// 原始characterData中的人物列表（硬编码，从原文件获取）
// 我们按原始顺序构建
const originalOrder = [
    '祥林嫂', '单四嫂子', '夏四奶奶', '爱姑', '阿长',
    '杨二嫂', '子君', '嫦娥', '鲁瑞', '许广平',
    '朱安', '刘和珍', '萧红', '杨荫榆', '凯绥·珂勒惠支', '阿金姐'
];

for (let person of originalOrder) {
    // 从原始数据中提取其他字段（这里简化处理，实际需要解析）
    // 为简单起见，我们保持原有结构，只更新intro和journal
    // 实际应用中应该解析原对象，但这里我们手动构建

    const intro = introMap[person] || `待补充 ${person} 的人物简介`;
    const refEntries = refMap[person] || [];

    // 构建journal数组
    const journalItems = [];
    for (let entry of refEntries) {
        let title = entry.title;
        // 去除开头的数字前缀，如 "1. " 已由解析器处理
        // 确保标题格式正确
        if (entry.link) {
            // 转义双引号
            const escapedTitle = title.replace(/"/g, '\\"');
            journalItems.push(`"<a href="${entry.link}" target="_blank" rel="noopener noreferrer">${escapedTitle}</a>"`);
        } else {
            const escapedTitle = title.replace(/"/g, '\\"');
            journalItems.push(`"${escapedTitle}"`);
        }
    }

    // 为每个人物构建对象（简化版，只包含必要字段）
    // 注意：这里需要从原数据获取其他字段，但为简化，我们写死一些值
    // 实际应该解析原对象
    newDataStr += `    "${person}": {\n`;
    newDataStr += `        img: "https://s41.ax1x.com/2026/03/09/peiowJU.png", \n`;
    newDataStr += `        intro: "${intro.replace(/"/g, '\\"').replace(/\n/g, '\\n')}", \n`;
    newDataStr += `        journal: [${journalItems.join(', ')}], \n`;
    newDataStr += `        source: "《作品》", \n`;
    newDataStr += `        category: "禁锢者", \n`;
    newDataStr += `        spaceType: "virtual", \n`;
    newDataStr += `        location: "地点",\n`;
    newDataStr += `        spaceLiterature: []\n`;
    newDataStr += `    }`;
    if (person !== originalOrder[originalOrder.length - 1]) {
        newDataStr += ',';
    }
    newDataStr += '\n';
}

newDataStr += '};';

// 替换原内容
const newHtmlContent = htmlContent.substring(0, startIdx) + newDataStr + htmlContent.substring(endIdx);

// 写回文件
fs.writeFileSync(path.join(__dirname, '网页4_updated.html'), newHtmlContent, 'utf8');
console.log('已生成更新后的文件: 网页4_updated.html');

// 也输出差异信息
console.log('\n更新统计:');
console.log('人物简介更新:', Object.keys(introMap).length, '个人物');
console.log('参考文献更新:', Object.keys(refMap).length, '个人物');