const fs = require('fs');

const filePath = 'src/game/scenes/MainScene.js';
try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let braceCount = 0;
    let stack = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '{') {
                braceCount++;
                stack.push({ line: i + 1, char: j + 1 });
            } else if (char === '}') {
                braceCount--;
                if (braceCount < 0) {
                    console.log(`Error: Unexpected closing brace at Line ${i + 1}, Col ${j + 1}`);
                    process.exit(1);
                }
                stack.pop();
            }
        }
    }

    if (braceCount > 0) {
        console.log(`Error: Unclosed brace(s). Count: ${braceCount}`);
        const last = stack[stack.length - 1];
        console.log(`Last unclosed brace at Line ${last.line}, Col ${last.char}`);
    } else {
        console.log("Braces are balanced.");
    }

} catch (e) {
    console.error("Failed to read file:", e);
}
